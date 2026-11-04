<?php
declare(strict_types=1);

class FilesService
{
    private string $dataRoot;
    private array $exclude;
    private IndexService $index;

    public function __construct(string $dataRoot, array $exclude, IndexService $index)
    {
        $this->dataRoot = $dataRoot;
        $this->exclude = $exclude;
        $this->index = $index;
    }

    public function list(string $relativePath, array $filters = []): array
    {
        $resolved = Path::resolve($this->dataRoot, $relativePath, $this->exclude);
        if ($resolved === null || !is_dir($resolved)) {
            return ['error' => 'Directory not found'];
        }

        $items = [];
        $entries = @scandir($resolved);
        if ($entries === false) {
            return ['error' => 'Unable to open directory'];
        }
        $isRoot = realpath($this->dataRoot) === $resolved;
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }
            if ($isRoot && in_array($entry, $this->exclude, true)) {
                continue;
            }
            $full = $resolved . DIRECTORY_SEPARATOR . $entry;
            $item = $this->describe($full);
            if ($item !== null && $this->matches($item, $filters, true)) {
                $items[] = $item;
            }
        }

        $this->sort($items, $filters, true);

        return [
            'path' => '/' . ltrim(str_replace('\\', '/', $relativePath), '/'),
            'items' => $items,
        ];
    }

    public function resolveFile(string $relativePath): ?string
    {
        $resolved = Path::resolve($this->dataRoot, $relativePath, $this->exclude);
        if ($resolved === null || !is_file($resolved)) {
            return null;
        }
        return $resolved;
    }

    /**
     * Searches names across the whole tree; with $content = true, text found by the
     * full-text index is included as well.
     */
    public function search(string $query, array $filters = [], bool $content = false): array
    {
        $query = trim($query);
        if ($this->index->ready()) {
            return $this->searchIndex($query, $filters, $content);
        }
        $root = realpath($this->dataRoot);
        if ($root === false) {
            return ['items' => []];
        }
        $items = [];
        $seen = [];
        $snippets = $content && $query !== '' ? $this->index->contentMatches($query) : [];

        if ($query !== '' || $this->hasFilters($filters)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveCallbackFilterIterator(
                    new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS),
                    function (SplFileInfo $file) use ($root): bool {
                        $rel = $this->relativePath($file->getPathname());
                        return !Path::isExcluded($rel, $this->exclude) && $file->getFilename()[0] !== '.';
                    }
                ),
                RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $fileInfo) {
                if ($query !== '' && stripos($fileInfo->getFilename(), $query) === false) {
                    continue;
                }
                $item = $this->describe($fileInfo->getPathname());
                if ($item === null || !$this->matches($item, $filters, false)) {
                    continue;
                }
                $seen[$item['path']] = true;
                if (isset($snippets[$item['path']])) {
                    $item['snippet'] = $snippets[$item['path']];
                }
                $items[] = $item;
            }
        }

        foreach ($snippets as $path => $snippet) {
            if (isset($seen[$path]) || Path::isExcluded($path, $this->exclude)) {
                continue;
            }
            $item = $this->stat($path);
            if ($item === null || !$this->matches($item, $filters, false)) {
                continue;
            }
            $item['snippet'] = $snippet;
            $items[] = $item;
        }

        $this->sort($items, $filters, false);
        return ['items' => $items];
    }

    /** Fast path: answers from the SQLite index instead of walking the NAS disk. */
    private function searchIndex(string $query, array $filters, bool $content): array
    {
        $ext = [];
        if (($filters['ext'] ?? '') !== '') {
            $ext = array_map(fn ($e) => ltrim(strtolower(trim($e)), '.'), explode(',', $filters['ext']));
        }
        $result = $this->index->query([
            'query' => $query,
            'content' => $content,
            'kind' => ($filters['type'] ?? '') === 'dir' ? 'dir' : 'file',
            'pathMatch' => ($filters['inpath'] ?? '') === '1',
            'ext' => $ext,
            'scope' => $filters['scope'] ?? '',
            'from' => $this->timestamp($filters['from'] ?? '', false),
            'to' => $this->timestamp($filters['to'] ?? '', true),
            'minSize' => ($filters['minSize'] ?? '') !== '' ? (int) $filters['minSize'] : null,
            'maxSize' => ($filters['maxSize'] ?? '') !== '' ? (int) $filters['maxSize'] : null,
            'sort' => $filters['sort'] ?? 'path',
            'order' => $filters['order'] ?? 'asc',
            'limit' => $filters['limit'] ?? 100,
            'offset' => $filters['offset'] ?? 0,
        ]);
        $items = array_values(array_filter(
            $result['items'],
            fn ($item) => !Path::isExcluded($item['path'], $this->exclude)
        ));
        return ['items' => $items, 'total' => $result['total'], 'source' => 'index'];
    }

    public function stat(string $relativePath): ?array
    {
        $resolved = Path::resolve($this->dataRoot, $relativePath, $this->exclude);
        if ($resolved === null || !file_exists($resolved)) {
            return null;
        }
        return $this->describe($resolved);
    }

    public function upload(array $file, string $relativeDir): array
    {
        $targetDir = Path::resolve($this->dataRoot, $relativeDir, $this->exclude);
        if ($targetDir === null || !is_dir($targetDir)) {
            return ['error' => 'Target directory not found'];
        }
        if (!isset($file['tmp_name'], $file['name']) || !is_uploaded_file($file['tmp_name'])) {
            return ['error' => 'Invalid upload'];
        }
        $safeName = $this->sanitizeFilename((string) $file['name']);
        $destination = $targetDir . DIRECTORY_SEPARATOR . $safeName;
        $counter = 1;
        while (file_exists($destination)) {
            $destination = $targetDir . DIRECTORY_SEPARATOR . $this->appendSuffix($safeName, $counter);
            $counter += 1;
        }
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return ['error' => 'Upload failed'];
        }
        return [
            'path' => $this->relativePath($destination),
            'name' => basename($destination),
            'size' => filesize($destination),
            'modified' => filemtime($destination),
        ];
    }

    public function mkdir(string $relativePath): array
    {
        $resolved = Path::resolve($this->dataRoot, $relativePath);
        if ($resolved !== null) {
            return ['error' => 'Path already exists'];
        }
        $parent = dirname($relativePath);
        $parentResolved = Path::resolve($this->dataRoot, $parent === '.' ? '/' : $parent, $this->exclude);
        if ($parentResolved === null || !is_dir($parentResolved)) {
            return ['error' => 'Parent directory not found'];
        }
        $target = $parentResolved . DIRECTORY_SEPARATOR . basename($relativePath);
        if (!mkdir($target, 0755, true)) {
            return ['error' => 'Unable to create directory'];
        }
        return ['path' => $this->relativePath($target)];
    }

    public function move(string $from, string $to): array
    {
        $source = Path::resolve($this->dataRoot, $from, $this->exclude);
        if ($source === null || !file_exists($source)) {
            return ['error' => 'Source not found'];
        }
        $fromNorm = '/' . trim(str_replace('\\', '/', $from), '/');
        $toNorm = '/' . trim(str_replace('\\', '/', $to), '/');
        if ($toNorm === $fromNorm || str_starts_with($toNorm . '/', $fromNorm . '/')) {
            return ['error' => 'Ein Ordner kann nicht in sich selbst verschoben werden'];
        }
        if (preg_match('#(^|/)\.\.?(/|$)#', $toNorm) === 1 || basename($toNorm) === '') {
            return ['error' => 'Ungültiger Zielpfad'];
        }
        $targetResolved = Path::resolve($this->dataRoot, $to);
        if ($targetResolved !== null && file_exists($targetResolved)) {
            return ['error' => 'Target already exists'];
        }
        $targetParent = dirname($to);
        $targetParentResolved = Path::resolve($this->dataRoot, $targetParent === '.' ? '/' : $targetParent, $this->exclude);
        if ($targetParentResolved === null || !is_dir($targetParentResolved)) {
            return ['error' => 'Target directory not found'];
        }
        $target = $targetParentResolved . DIRECTORY_SEPARATOR . basename($to);
        if (!rename($source, $target)) {
            return ['error' => 'Move failed'];
        }
        return ['path' => $this->relativePath($target)];
    }

    public function delete(string $relativePath): array
    {
        $resolved = Path::resolve($this->dataRoot, $relativePath, $this->exclude);
        if ($resolved === null || !file_exists($resolved)) {
            return ['error' => 'Path not found'];
        }
        $rootReal = realpath($this->dataRoot);
        if ($rootReal !== false && realpath($resolved) === $rootReal) {
            return ['error' => 'Refusing to delete root'];
        }
        $ok = is_dir($resolved) ? $this->deleteDir($resolved) : unlink($resolved);
        if (!$ok) {
            return ['error' => 'Delete failed'];
        }
        return ['status' => 'ok'];
    }

    private function describe(string $full): ?array
    {
        if (!file_exists($full)) {
            return null;
        }
        $isDir = is_dir($full);
        $name = basename($full);
        return [
            'name' => $name,
            'type' => $isDir ? 'dir' : 'file',
            'ext' => $isDir ? '' : strtolower(pathinfo($name, PATHINFO_EXTENSION)),
            'size' => $isDir ? null : filesize($full),
            'modified' => filemtime($full),
            'path' => $this->relativePath($full),
        ];
    }

    private function hasFilters(array $filters): bool
    {
        foreach (['ext', 'from', 'to', 'minSize', 'maxSize', 'type'] as $key) {
            if (($filters[$key] ?? '') !== '') {
                return true;
            }
        }
        return false;
    }

    /** Filters: name, ext (comma list), type (file|dir), from/to (date or timestamp), minSize/maxSize (bytes). */
    private function matches(array $item, array $filters, bool $keepDirs): bool
    {
        $type = $filters['type'] ?? '';
        if ($type !== '' && $item['type'] !== $type) {
            return false;
        }
        $name = $filters['name'] ?? '';
        if ($name !== '' && stripos($item['name'], $name) === false) {
            return false;
        }
        if ($item['type'] === 'dir') {
            // Folders stay visible while browsing; the other filters only apply to files.
            return $keepDirs || !$this->hasFileOnlyFilters($filters);
        }
        $ext = $filters['ext'] ?? '';
        if ($ext !== '') {
            $allowed = array_map(fn ($e) => ltrim(strtolower(trim($e)), '.'), explode(',', $ext));
            if (!in_array($item['ext'], $allowed, true)) {
                return false;
            }
        }
        $from = $this->timestamp($filters['from'] ?? '', false);
        if ($from !== null && $item['modified'] < $from) {
            return false;
        }
        $to = $this->timestamp($filters['to'] ?? '', true);
        if ($to !== null && $item['modified'] > $to) {
            return false;
        }
        if (($filters['minSize'] ?? '') !== '' && $item['size'] < (int) $filters['minSize']) {
            return false;
        }
        if (($filters['maxSize'] ?? '') !== '' && $item['size'] > (int) $filters['maxSize']) {
            return false;
        }
        return true;
    }

    private function hasFileOnlyFilters(array $filters): bool
    {
        foreach (['ext', 'from', 'to', 'minSize', 'maxSize'] as $key) {
            if (($filters[$key] ?? '') !== '') {
                return true;
            }
        }
        return false;
    }

    private function timestamp(string $value, bool $endOfDay): ?int
    {
        if ($value === '') {
            return null;
        }
        if (ctype_digit($value)) {
            return (int) $value;
        }
        $ts = strtotime($value);
        if ($ts === false) {
            return null;
        }
        return $endOfDay ? $ts + 86399 : $ts;
    }

    private function sort(array &$items, array $filters, bool $dirsFirst): void
    {
        $by = $filters['sort'] ?? 'name';
        $dir = strtolower($filters['order'] ?? 'asc') === 'desc' ? -1 : 1;
        usort($items, function ($a, $b) use ($by, $dir, $dirsFirst) {
            if ($dirsFirst && $a['type'] !== $b['type']) {
                return $a['type'] === 'dir' ? -1 : 1;
            }
            $cmp = match ($by) {
                'modified' => $a['modified'] <=> $b['modified'],
                'size' => ($a['size'] ?? 0) <=> ($b['size'] ?? 0),
                'path' => strcasecmp($a['path'], $b['path']),
                default => strcasecmp($a['name'], $b['name']),
            };
            return $cmp * $dir;
        });
    }

    private function relativePath(string $absolute): string
    {
        $root = realpath($this->dataRoot);
        if ($root === false) {
            return '/';
        }
        $root = rtrim(str_replace('\\', '/', $root), '/') . '/';
        $absolute = str_replace('\\', '/', $absolute);
        if (str_starts_with($absolute, $root)) {
            return '/' . ltrim(substr($absolute, strlen($root)), '/');
        }
        return '/';
    }

    private function sanitizeFilename(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/[^A-Za-z0-9._ -]/', '_', $name) ?? 'upload';
        $name = trim($name, '. ');
        return $name === '' ? 'upload' : $name;
    }

    private function appendSuffix(string $name, int $counter): string
    {
        $dot = strrpos($name, '.');
        if ($dot === false) {
            return $name . ' (' . $counter . ')';
        }
        $base = substr($name, 0, $dot);
        $ext = substr($name, $dot);
        return $base . ' (' . $counter . ')' . $ext;
    }

    private function deleteDir(string $dir): bool
    {
        $items = array_diff(scandir($dir) ?: [], ['.', '..']);
        foreach ($items as $item) {
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                if (!$this->deleteDir($path)) {
                    return false;
                }
            } else {
                if (!unlink($path)) {
                    return false;
                }
            }
        }
        return rmdir($dir);
    }
}
