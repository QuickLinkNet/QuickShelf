<?php
declare(strict_types=1);

class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable $handler): void
    {
        $key = strtoupper($method) . ' ' . $path;
        $this->routes[$key] = $handler;
    }

    public function dispatch(Request $request): void
    {
        $key = $request->method . ' ' . $request->path;
        if (!isset($this->routes[$key])) {
            Response::json(404, ['error' => 'Not found']);
            return;
        }
        $handler = $this->routes[$key];
        $handler($request);
    }
}
