<?php
/**
 * Zum Ausprobieren ohne Webserver (im Release-Ordner):   php -S 127.0.0.1:8080 serve.php
 * Liefert das Frontend aus und leitet /api/* an die PHP-API. Nicht für den Dauerbetrieb gedacht
 * (der eingebaute PHP-Server verarbeitet nur eine Anfrage zugleich).
 */
$path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
if (preg_match('#^/api/(data|config|controllers|core|services|utils|ocr)(/|$)#', $path) || preg_match('#/\.#', $path)) {
    http_response_code(403);
    exit;
}
if ($path === '/api' || str_starts_with($path, '/api/')) {
    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    chdir(__DIR__ . '/api');
    require __DIR__ . '/api/index.php';
    return true;
}
return false; // everything else: static files
