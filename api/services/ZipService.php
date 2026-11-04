<?php
declare(strict_types=1);

/** Streams folders or selections as a ZIP download (read-only: only reads from the archive). */
class ZipService
{
    private const MAX_BYTES = 2147483648; // 2 GB
    private const MAX_FILES = 8000;
    private const STORE = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'zip', 'rar', '7z', 'mp3', 'pdf', 'docx', 'xlsx'];

    private string $dataRoot;
    private array $exclude;

    public function __construct(string $dataRoot, array $exclude)
    {
        $this->dataRoot = $dataRoot;
        $this->exclude = $exclude;
    }

    public function available(): bool
    {
        return class_exists('ZipArchive');
    }

    /**
     * @param string[] $paths folders or files (archive-relative)
     * @return array{error?:string, status?:int}
     */
    public function send(array $paths, string $name): array
    {
        if (!$this->available()) {
            return ['error' => 'ZIP-Erweiterung fehlt auf dem Server', 'status' => 501];
        }
        $entries = [];
        $bytes = 0;
        foreach ($paths as $rel) {
            $abs = Path::resolve($this->dataRoot, $rel, $this->exclude);
            if ($abs === null) {
                continue;
            }
            $base = dirname(rtrim(str_replace('\\', '/', $abs), '/'));
            foreach ($this->collect($abs) as $file) {
                $entries[] = [$file, ltrim(substr(str_replace('\\', '/', $file), strlen($base)), '/')];
                $bytes += (int) @filesize($file);
                if (count($entries) > self::MAX_FILES || $bytes > self::MAX_BYTES) {
                    return ['error' => 'Auswahl zu groß für einen ZIP-Download (max. 2 GB / 8000 Dateien)', 'status' => 413];
                }
            }
        }
        if ($entries === []) {
            return ['error' => 'Keine Dateien gefunden', 'status' => 404];
        }
        @set_time_limit(0);
        $tmp = tempnam(sys_get_temp_dir(), 'nasz');
        $zip = new ZipArchive();
        if ($tmp === false || $zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
            return ['error' => 'ZIP konnte nicht angelegt werden', 'status' => 500];
        }
        foreach ($entries as $i => [$file, $local]) {
            $zip->addFile($file, $local);
            if (in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), self::STORE, true)) {
                $zip->setCompressionIndex($i, ZipArchive::CM_STORE);
            }
        }
        $zip->close();
        $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $name) ?: 'archiv';
        http_response_code(200);
        header('Content-Type: application/zip');
        header('Content-Length: ' . filesize($tmp));
        header("Content-Disposition: attachment; filename=\"{$safe}.zip\"");
        readfile($tmp);
        @unlink($tmp);
        return [];
    }

    /** @return string[] absolute file paths below $abs (or $abs itself when it is a file) */
    private function collect(string $abs): array
    {
        if (is_file($abs)) {
            return [$abs];
        }
        $out = [];
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($abs, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile() && $f->getFilename()[0] !== '.') {
                $out[] = $f->getPathname();
            }
        }
        return $out;
    }
}
