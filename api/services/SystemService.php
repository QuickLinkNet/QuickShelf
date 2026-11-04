<?php
declare(strict_types=1);

/** Health information about the API host and the archive volume. */
class SystemService
{
    private string $dataRoot;
    private array $config;
    private IndexService $index;
    private ThumbService $thumbs;
    private ZipService $zip;

    public function __construct(string $dataRoot, array $config, IndexService $index, ThumbService $thumbs, ZipService $zip)
    {
        $this->dataRoot = $dataRoot;
        $this->config = $config;
        $this->index = $index;
        $this->thumbs = $thumbs;
        $this->zip = $zip;
    }

    public function info(): array
    {
        $root = realpath($this->dataRoot) ?: $this->dataRoot;
        $total = @disk_total_space($root);
        $free = @disk_free_space($root);
        $status = $this->index->status();
        $dbFile = rtrim((string) $this->config['index_dir'], '/\\') . DIRECTORY_SEPARATOR . 'index.sqlite';
        return [
            'disk' => [
                'total' => $total === false ? null : (int) $total,
                'free' => $free === false ? null : (int) $free,
                'used' => ($total === false || $free === false) ? null : (int) ($total - $free),
            ],
            'index' => $status + [
                'size_bytes' => is_file($dbFile) ? (int) filesize($dbFile) : 0,
                'ocr_enabled' => (bool) $this->config['ocr_enabled'],
                'pdf_text' => (bool) $this->config['pdf_text'],
            ],
            'api' => [
                'php' => PHP_VERSION,
                'os' => PHP_OS_FAMILY,
                'memory_limit' => ini_get('memory_limit'),
                'time' => time(),
                'read_only' => (bool) $this->config['read_only'],
                'hidden_folders' => count($this->config['exclude']),
                'features' => [
                    'sqlite' => $this->index->available(),
                    'thumbnails' => $this->thumbs->available(),
                    'zip' => $this->zip->available(),
                    'exif' => function_exists('exif_read_data'),
                    'mbstring' => extension_loaded('mbstring'),
                ],
            ],
            'thumbs' => $this->thumbs->stats(),
        ];
    }
}
