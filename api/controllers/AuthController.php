<?php
declare(strict_types=1);

/** Login, logout, password change and the first-run setup wizard. Needs no archive access. */
class AuthController
{
    public function __construct(private AuthService $auth, private array $config)
    {
    }

    public const ROUTES = ['/auth/status', '/auth/setup', '/auth/login', '/auth/logout', '/auth/password', '/setup/check', '/setup/requirements'];

    /** True when the request belongs to this controller (handled and answered). */
    public function handle(Request $request): bool
    {
        $key = $request->method . ' ' . $request->path;
        $map = [
            'GET /auth/status' => 'status',
            'POST /auth/setup' => 'setup',
            'POST /auth/login' => 'login',
            'POST /auth/logout' => 'logout',
            'POST /auth/password' => 'password',
            'POST /setup/check' => 'check',
            'GET /setup/requirements' => 'requirements',
        ];
        if (!isset($map[$key])) {
            return false;
        }
        $this->{$map[$key]}($request);
        return true;
    }

    private function state(): array
    {
        $root = (string) $this->config['data_root'];
        return [
            'auth_enabled' => $this->auth->enabled(),
            'setup_required' => $this->auth->enabled() && !$this->auth->isSetUp(),
            'authenticated' => $this->auth->authenticated(),
            'archive_ok' => is_dir($root) && is_readable($root),
            'data_root_locked' => (bool) $this->config['data_root_locked'],
            'read_only' => (bool) $this->config['read_only'],
        ];
    }

    private function status(Request $request): void
    {
        Response::json(200, $this->state());
    }

    /** First run: choose the archive folder, a password and whether the dashboard may change files. */
    private function setup(Request $request): void
    {
        if (!$this->auth->enabled()) {
            Response::json(409, ['error' => 'Der Login ist per AUTH=0 abgeschaltet.']);
            return;
        }
        if ($this->auth->isSetUp()) {
            Response::json(409, ['error' => 'Das Archiv ist bereits eingerichtet.']);
            return;
        }
        $settings = [];
        if (!$this->config['data_root_locked']) {
            $path = trim((string) $request->input('data_root', ''));
            $problem = $this->checkFolder($path);
            if ($problem !== null) {
                Response::json(422, ['error' => $problem]);
                return;
            }
            $settings['data_root'] = $path;
        }
        $settings['read_only'] = $request->input('read_only', '1') === '0' ? '0' : '1';
        $password = (string) $request->input('password', '');
        if (mb_strlen($password) < 8) {
            Response::json(422, ['error' => 'Das Passwort braucht mindestens 8 Zeichen.']);
            return;
        }
        @mkdir(dirname($this->config['settings_file']), 0775, true);
        if (@file_put_contents($this->config['settings_file'], json_encode($settings), LOCK_EX) === false) {
            Response::json(500, ['error' => 'Der Datenordner der API (api/data) ist nicht beschreibbar.']);
            return;
        }
        $error = $this->auth->setup($password);
        if ($error !== null) {
            Response::json(422, ['error' => $error]);
            return;
        }
        $token = $this->auth->issueToken();
        $this->auth->setCookie($token);
        Response::json(200, ['ok' => true, 'token' => $token]);
    }

    private function login(Request $request): void
    {
        $result = $this->auth->login((string) $request->input('password', ''), AuthService::clientId());
        if (!$result['ok']) {
            Response::json(isset($result['retry']) ? 429 : 401, ['error' => $result['error'] ?? 'Anmeldung fehlgeschlagen', 'retry' => $result['retry'] ?? null]);
            return;
        }
        $token = $this->auth->issueToken();
        $this->auth->setCookie($token);
        Response::json(200, ['ok' => true, 'token' => $token]);
    }

    private function logout(Request $request): void
    {
        $this->auth->clearCookie();
        Response::json(200, ['ok' => true]);
    }

    private function password(Request $request): void
    {
        if (!$this->auth->authenticated()) {
            Response::json(401, ['error' => 'Bitte zuerst anmelden.']);
            return;
        }
        $error = $this->auth->change((string) $request->input('current', ''), (string) $request->input('next', ''), AuthService::clientId());
        if ($error !== null) {
            Response::json(422, ['error' => $error]);
            return;
        }
        $token = $this->auth->issueToken();
        $this->auth->setCookie($token);
        Response::json(200, ['ok' => true, 'token' => $token]);
    }

    /** Wizard helper: is this a readable folder, and does it look like an archive? Only while nothing is set up. */
    private function check(Request $request): void
    {
        if ($this->auth->isSetUp() && !$this->auth->authenticated()) {
            Response::json(401, ['error' => 'Bitte anmelden.']);
            return;
        }
        $path = trim((string) $request->input('path', ''));
        $problem = $this->checkFolder($path);
        if ($problem !== null) {
            Response::json(200, ['ok' => false, 'error' => $problem]);
            return;
        }
        $entries = array_values(array_diff(scandir($path) ?: [], ['.', '..']));
        Response::json(200, ['ok' => true, 'entries' => count($entries)]);
    }

    /** Wizard helper: which PHP features and folder rights are in place. Only while nothing is set up (or when signed in). */
    private function requirements(Request $request): void
    {
        if ($this->auth->isSetUp() && !$this->auth->authenticated()) {
            Response::json(401, ['error' => 'Bitte anmelden.']);
            return;
        }
        $rows = Requirements::run(dirname((string) $this->config['settings_file']));
        Response::json(200, ['items' => $rows, 'blocking' => Requirements::blocking($rows)]);
    }

    private function checkFolder(string $path): ?string
    {
        if ($path === '') {
            return 'Bitte gib den Ordner deines Archivs an.';
        }
        if (!preg_match('/^([A-Za-z]:[\\\\\\/]|\\/)/', $path)) {
            return 'Der Pfad muss absolut sein, z. B. /volume1/Archiv oder D:\\Archiv.';
        }
        if (!is_dir($path)) {
            return 'Dieser Ordner existiert nicht (oder ist für den Webserver nicht sichtbar).';
        }
        return is_readable($path) ? null : 'Der Webserver darf diesen Ordner nicht lesen.';
    }
}
