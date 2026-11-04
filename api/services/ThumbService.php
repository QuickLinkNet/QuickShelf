<?php
declare(strict_types=1);

/** Small JPEG thumbnails for the gallery, cached next to the index (never inside the archive). */
class ThumbService
{
    private const MAX_PIXELS = 60000000;
    private string $cacheDir;
    private string $dataRoot;
    private array $exclude;

    public function __construct(string $indexDir, string $dataRoot = '', array $exclude = [])
    {
        $this->cacheDir = rtrim($indexDir, '/\\') . DIRECTORY_SEPARATOR . 'thumbs';
        $this->dataRoot = $dataRoot;
        $this->exclude = $exclude;
    }

    private function cachePath(string $file, int $mtime, int $width): string
    {
        $key = md5($file . '|' . $mtime . '|' . $width);
        return $this->cacheDir . DIRECTORY_SEPARATOR . substr($key, 0, 2) . DIRECTORY_SEPARATOR . $key . '.jpg';
    }

    /**
     * Pre-generates thumbnails for images below $scope, continuing after the path $after.
     * Works in a time budget so a web request never runs into a server timeout.
     *
     * @return array{created:int, checked:int, last:string, done:bool}
     */
    public function warm(IndexService $index, string $scope, int $width, string $after, float $budget): array
    {
        $width = in_array($width, [160, 320, 640, 1280], true) ? $width : 320;
        $started = microtime(true);
        $exts = ['jpg', 'jpeg', 'png', 'gif'];
        $marks = implode(',', array_fill(0, count($exts), '?'));
        $args = $exts;
        $sql = "SELECT path, mtime FROM files WHERE kind = 'f' AND ext IN ($marks)";
        if ($after !== '') {
            $sql .= ' AND path > ?';
            $args[] = $after;
        }
        if ($scope !== '' && $scope !== '/') {
            [$lo, $hi] = StatsService::range($scope);
            $sql .= ' AND path >= ? AND path < ?';
            array_push($args, $lo, $hi);
        }
        $stmt = $index->db()->prepare($sql . ' ORDER BY path LIMIT 4000');
        $stmt->execute($args);
        $out = ['created' => 0, 'checked' => 0, 'last' => $after, 'done' => true];
        foreach ($stmt as $row) {
            if (microtime(true) - $started > $budget) {
                $out['done'] = false;
                break;
            }
            $out['checked']++;
            $out['last'] = $row['path'];
            $abs = Path::resolve($this->dataRoot, $row['path'], $this->exclude);
            if ($abs === null || !is_file($abs)) {
                continue;
            }
            $target = $this->cachePath($abs, (int) @filemtime($abs), $width);
            if (is_file($target)) {
                continue;
            }
            if ($this->create($abs, strtolower(pathinfo($abs, PATHINFO_EXTENSION)), $width, $target)) {
                $out['created']++;
            }
        }
        if ($out['done'] && $out['checked'] >= 4000) {
            $out['done'] = false; // more rows may follow after this batch
        }
        return $out;
    }

    public function available(): bool
    {
        return extension_loaded('gd');
    }

    public function supports(string $ext): bool
    {
        $ext = strtolower($ext);
        if (!$this->available()) {
            return false;
        }
        return in_array($ext, ['jpg', 'jpeg', 'png', 'gif'], true) || ($ext === 'webp' && function_exists('imagecreatefromwebp'));
    }

    /** Sends the thumbnail (creating it on first use). Returns false when no thumbnail can be made. */
    public function send(string $file, int $width): bool
    {
        $width = in_array($width, [160, 320, 640, 1280], true) ? $width : 320;
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!$this->supports($ext) || !is_file($file)) {
            return false;
        }
        $mtime = (int) @filemtime($file);
        $cached = $this->cachePath($file, $mtime, $width);
        $key = basename($cached, '.jpg');
        $etag = '"' . $key . '"';

        if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
            http_response_code(304);
            header('ETag: ' . $etag);
            header('Cache-Control: public, max-age=604800');
            return true;
        }
        if (!is_file($cached) && !$this->create($file, $ext, $width, $cached)) {
            return false;
        }
        http_response_code(200);
        header('Content-Type: image/jpeg');
        header('Content-Length: ' . filesize($cached));
        header('ETag: ' . $etag);
        header('Cache-Control: public, max-age=604800');
        readfile($cached);
        return true;
    }

    private function create(string $file, string $ext, int $width, string $target): bool
    {
        if ($width <= 160 && in_array($ext, ['jpg', 'jpeg'], true) && function_exists('exif_thumbnail')) {
            $raw = @exif_thumbnail($file, $tw, $th, $tt);
            if (is_string($raw) && $raw !== '' && $tw >= 120) {
                $img = @imagecreatefromstring($raw);
                if ($img !== false) {
                    $img = $this->orient($img, $file);
                    $dir = dirname($target);
                    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
                        return false;
                    }
                    $ok = imagejpeg($img, $target, 80);
                    imagedestroy($img);
                    if ($ok) {
                        return true;
                    }
                }
            }
        }
        $info = @getimagesize($file);
        if ($info === false || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > self::MAX_PIXELS) {
            return false;
        }
        @ini_set('memory_limit', '512M');
        $src = match ($ext) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($file),
            'png' => @imagecreatefrompng($file),
            'gif' => @imagecreatefromgif($file),
            'webp' => @imagecreatefromwebp($file),
            default => false,
        };
        if ($src === false) {
            return false;
        }
        if (in_array($ext, ['jpg', 'jpeg'], true)) {
            $src = $this->orient($src, $file);
        }
        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1.0, $width / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
        $dir = dirname($target);
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            return false;
        }
        $ok = imagejpeg($dst, $target, 78);
        imagedestroy($src);
        imagedestroy($dst);
        return $ok;
    }

    /** Applies the EXIF orientation so portrait photos are not shown sideways. */
    private function orient($img, string $file)
    {
        if (!function_exists('exif_read_data')) {
            return $img;
        }
        $exif = @exif_read_data($file);
        $rot = [3 => 180, 6 => -90, 8 => 90][$exif['Orientation'] ?? 1] ?? 0;
        if ($rot === 0) {
            return $img;
        }
        $rotated = imagerotate($img, $rot, 0);
        return $rotated === false ? $img : $rotated;
    }

    public function stats(): array
    {
        $n = 0;
        $bytes = 0;
        if (is_dir($this->cacheDir)) {
            foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->cacheDir, FilesystemIterator::SKIP_DOTS)) as $f) {
                $n++;
                $bytes += $f->getSize();
            }
        }
        return ['files' => $n, 'bytes' => $bytes];
    }
}
