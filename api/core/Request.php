<?php
declare(strict_types=1);

class Request
{
    public string $method;
    public string $path;
    public array $query;
    public array $post;
    private ?array $json;

    public function __construct(string $method, string $path, array $query, array $post)
    {
        $this->method = strtoupper($method);
        $this->path = $path;
        $this->query = $query;
        $this->post = $post;
        $this->json = null;
    }

    public static function fromGlobals(string $basePath): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        $path = $uriPath;
        if ($basePath !== '' && str_starts_with($path, $basePath)) {
            $path = substr($path, strlen($basePath));
        }
        $path = '/' . ltrim($path, '/');
        return new self($method, $path, $_GET ?? [], $_POST ?? []);
    }

    public function json(): array
    {
        if ($this->json !== null) {
            return $this->json;
        }
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            $this->json = [];
            return $this->json;
        }
        $data = json_decode($raw, true);
        $this->json = is_array($data) ? $data : [];
        return $this->json;
    }

    public function input(string $key, ?string $default = null): ?string
    {
        if (array_key_exists($key, $this->query)) {
            return is_string($this->query[$key]) ? $this->query[$key] : $default;
        }
        if (array_key_exists($key, $this->post)) {
            return is_string($this->post[$key]) ? $this->post[$key] : $default;
        }
        $json = $this->json();
        if (array_key_exists($key, $json)) {
            $value = $json[$key];
            if (is_string($value)) {
                return $value;
            }
            // JSON numbers and booleans arrive as scalars; hand them out as strings like query parameters.
            if (is_int($value) || is_float($value)) {
                return (string) $value;
            }
            return is_bool($value) ? ($value ? '1' : '0') : $default;
        }
        return $default;
    }
}
