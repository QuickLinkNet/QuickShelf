<?php
declare(strict_types=1);

class Response
{
    private const MIME = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'txt' => 'text/plain; charset=utf-8',
        'md' => 'text/plain; charset=utf-8',
        'csv' => 'text/plain; charset=utf-8',
        'log' => 'text/plain; charset=utf-8',
        'json' => 'text/plain; charset=utf-8',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'mp4' => 'video/mp4',
        'm4v' => 'video/mp4',
        'mov' => 'video/quicktime',
        'webm' => 'video/webm',
        'mp3' => 'audio/mpeg',
        'm4a' => 'audio/mp4',
        'ogg' => 'audio/ogg',
        'opus' => 'audio/ogg',
        'wav' => 'audio/wav',
        'flac' => 'audio/flac',
    ];

    public static function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    /** Serves a file, honouring Range requests so videos and audio can seek. */
    public static function file(string $path, string $filename, bool $inline = false): void
    {
        if (!is_file($path)) {
            self::json(404, ['error' => 'File not found']);
            return;
        }
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = self::MIME[$ext] ?? (function_exists('mime_content_type') ? (mime_content_type($path) ?: null) : null) ?? 'application/octet-stream';
        if ($inline && !isset(self::MIME[$ext])) {
            $inline = false; // only types the viewer knows are shown inline
        }
        $size = (int) filesize($path);
        $start = 0;
        $end = $size - 1;
        $status = 200;
        if ($size > 0 && isset($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d*)-(\d*)$/', trim($_SERVER['HTTP_RANGE']), $m)) {
            if ($m[1] === '' && $m[2] !== '') {
                $start = max(0, $size - (int) $m[2]);
            } elseif ($m[1] !== '') {
                $start = (int) $m[1];
                $end = $m[2] !== '' ? min((int) $m[2], $size - 1) : $size - 1;
            }
            if ($start > $end || $start >= $size) {
                http_response_code(416);
                header('Content-Range: bytes */' . $size);
                return;
            }
            $status = 206;
        }
        http_response_code($status);
        header('Content-Type: ' . $mime);
        header('Accept-Ranges: bytes');
        header('Content-Length: ' . ($end - $start + 1));
        if ($status === 206) {
            header("Content-Range: bytes $start-$end/$size");
        }
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, max-age=3600');
        $name = rawurlencode(basename($filename));
        header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . "; filename*=UTF-8''" . $name);
        $fh = fopen($path, 'rb');
        if ($fh === false) {
            return;
        }
        fseek($fh, $start);
        $left = $end - $start + 1;
        while ($left > 0 && !feof($fh)) {
            $chunk = fread($fh, min(1048576, $left));
            if ($chunk === false) {
                break;
            }
            echo $chunk;
            $left -= strlen($chunk);
            if (connection_aborted()) {
                break;
            }
        }
        fclose($fh);
    }
}
