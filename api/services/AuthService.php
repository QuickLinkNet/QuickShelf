<?php
declare(strict_types=1);

/**
 * Single-owner login. The password hash and the signing secret live in `auth.json` inside the (non-public)
 * data folder. Sessions are stateless HMAC tokens, delivered as HttpOnly cookie (media tags) and Bearer header (fetch).
 * Failed logins are rate limited per client address.
 */
class AuthService
{
    public const COOKIE = 'nas_session';
    private const LIFETIME = 60 * 60 * 24 * 30;
    private const MIN_LENGTH = 8;
    private const FREE_ATTEMPTS = 5;

    private string $file;
    private string $attemptsFile;
    private ?array $data = null;

    public function __construct(string $dir, private bool $enabled = true)
    {
        $this->file = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . 'auth.json';
        $this->attemptsFile = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . 'auth-attempts.json';
    }

    public function enabled(): bool
    {
        return $this->enabled;
    }

    public function isSetUp(): bool
    {
        return !empty($this->load()['hash']);
    }

    /** Stores the first password. Refuses when one exists already (use change()). */
    public function setup(string $password): ?string
    {
        if ($this->isSetUp()) {
            return 'Das Archiv ist bereits eingerichtet.';
        }
        $error = $this->validatePassword($password);
        if ($error !== null) {
            return $error;
        }
        return $this->save(['hash' => password_hash($password, PASSWORD_DEFAULT), 'secret' => bin2hex(random_bytes(32)), 'epoch' => 1, 'created' => time()]);
    }

    /** @return array{ok:bool,error?:string,retry?:int} */
    public function login(string $password, string $client): array
    {
        $wait = $this->lockedFor($client);
        if ($wait > 0) {
            return ['ok' => false, 'error' => 'Zu viele Versuche. Bitte kurz warten.', 'retry' => $wait];
        }
        $hash = $this->load()['hash'] ?? '';
        if ($hash !== '' && password_verify($password, $hash)) {
            $this->clearAttempts($client);
            return ['ok' => true];
        }
        $this->recordFailure($client);
        return ['ok' => false, 'error' => 'Passwort falsch.'];
    }

    public function change(string $current, string $next, string $client): ?string
    {
        $result = $this->login($current, $client);
        if (!$result['ok']) {
            return $result['error'] ?? 'Passwort falsch.';
        }
        $error = $this->validatePassword($next);
        if ($error !== null) {
            return $error;
        }
        $data = $this->load();
        $data['hash'] = password_hash($next, PASSWORD_DEFAULT);
        $data['epoch'] = ((int) ($data['epoch'] ?? 1)) + 1; // signs everybody out
        return $this->save($data);
    }

    public function issueToken(?int $now = null): string
    {
        $exp = ($now ?? time()) + self::LIFETIME;
        $payload = 'v1.' . $exp . '.' . (int) ($this->load()['epoch'] ?? 1);
        return $payload . '.' . $this->sign($payload);
    }

    public function validToken(?string $token, ?int $now = null): bool
    {
        if (!$token || !$this->isSetUp()) {
            return false;
        }
        $parts = explode('.', $token);
        if (count($parts) !== 4 || $parts[0] !== 'v1') {
            return false;
        }
        [$v, $exp, $epoch, $sig] = $parts;
        if (!hash_equals($this->sign("$v.$exp.$epoch"), $sig)) {
            return false;
        }
        return (int) $exp >= ($now ?? time()) && (int) $epoch === (int) ($this->load()['epoch'] ?? 1);
    }

    /** Token from the Authorization header or the session cookie. */
    public function tokenFromRequest(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (is_string($header) && preg_match('/^Bearer\s+(\S+)$/i', $header, $m)) {
            return $m[1];
        }
        $cookie = $_COOKIE[self::COOKIE] ?? null;
        return is_string($cookie) ? $cookie : null;
    }

    public function authenticated(): bool
    {
        return !$this->enabled || $this->validToken($this->tokenFromRequest());
    }

    public function setCookie(string $token): void
    {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        setcookie(self::COOKIE, $token, ['expires' => time() + self::LIFETIME, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    }

    public function clearCookie(): void
    {
        setcookie(self::COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
    }

    public static function clientId(): string
    {
        return hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    }

    private function validatePassword(string $password): ?string
    {
        if (mb_strlen($password) < self::MIN_LENGTH) {
            return 'Das Passwort braucht mindestens ' . self::MIN_LENGTH . ' Zeichen.';
        }
        return mb_strlen($password) > 200 ? 'Das Passwort ist zu lang.' : null;
    }

    private function sign(string $payload): string
    {
        return hash_hmac('sha256', $payload, (string) ($this->load()['secret'] ?? ''));
    }

    private function load(): array
    {
        if ($this->data === null) {
            $raw = is_file($this->file) ? file_get_contents($this->file) : false;
            $decoded = $raw !== false ? json_decode($raw, true) : null;
            $this->data = is_array($decoded) ? $decoded : [];
        }
        return $this->data;
    }

    private function save(array $data): ?string
    {
        $dir = dirname($this->file);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
            return 'Der Datenordner der API ist nicht beschreibbar.';
        }
        if (@file_put_contents($this->file, json_encode($data), LOCK_EX) === false) {
            return 'Die Zugangsdaten konnten nicht gespeichert werden (Datenordner nicht beschreibbar).';
        }
        @chmod($this->file, 0600);
        $this->data = $data;
        return null;
    }

    // ---- brute force protection ----------------------------------------------------------------

    private function attempts(): array
    {
        $raw = is_file($this->attemptsFile) ? file_get_contents($this->attemptsFile) : false;
        $data = $raw !== false ? json_decode($raw, true) : null;
        return is_array($data) ? $data : [];
    }

    private function writeAttempts(array $all): void
    {
        $now = time();
        foreach ($all as $key => $row) {
            if (($row['until'] ?? 0) < $now - 3600 && ($row['last'] ?? 0) < $now - 3600) {
                unset($all[$key]);
            }
        }
        @file_put_contents($this->attemptsFile, json_encode($all), LOCK_EX);
    }

    private function lockedFor(string $client): int
    {
        $until = (int) ($this->attempts()[$client]['until'] ?? 0);
        return max(0, $until - time());
    }

    private function recordFailure(string $client): void
    {
        $all = $this->attempts();
        $count = (int) ($all[$client]['count'] ?? 0) + 1;
        $over = $count - self::FREE_ATTEMPTS;
        $lock = $over >= 0 ? min(3600, 30 * (2 ** min($over, 7))) : 0;
        $all[$client] = ['count' => $count, 'last' => time(), 'until' => $lock > 0 ? time() + $lock : 0];
        $this->writeAttempts($all);
    }

    private function clearAttempts(string $client): void
    {
        $all = $this->attempts();
        if (isset($all[$client])) {
            unset($all[$client]);
            $this->writeAttempts($all);
        }
    }
}
