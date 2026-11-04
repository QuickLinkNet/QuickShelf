<?php
declare(strict_types=1);

/**
 * Full-text cache for the archive. It only ever writes to its own SQLite file
 * (outside the archive) and can be deleted and rebuilt at any time.
 */
class IndexService
{
    private const SLICE_SECONDS = 15;
    private const MIN_ENTRIES = 50;

    private string $dataRoot;
    private string $dbFile;
    private array $exclude;
    private OcrService $ocr;
    private ?PDO $pdo = null;

    public function __construct(string $dataRoot, string $indexDir, array $exclude, OcrService $ocr)
    {
        $this->dataRoot = $dataRoot;
        $this->dbFile = rtrim($indexDir, '/\\') . DIRECTORY_SEPARATOR . 'index.sqlite';
        $this->exclude = $exclude;
        $this->ocr = $ocr;
    }

    public function available(): bool
    {
        return extension_loaded('pdo_sqlite');
    }

    /**
     * Indexes the archive in short, resumable slices. Each call continues after the entry the
     * previous call stopped at (stored in the index DB) and reports done=true when the walk is
     * finished; only then rows for files that no longer exist are removed.
     */
    public function rebuild(): array
    {
        if (!$this->available()) {
            return ['error' => 'pdo_sqlite not available'];
        }
        $root = realpath($this->dataRoot);
        if ($root === false) {
            return ['error' => 'Data root not found'];
        }
        $started = microtime(true);
        @set_time_limit(60);
        $db = $this->db();

        $known = [];
        foreach ($db->query('SELECT path, size, mtime FROM files') as $row) {
            $known[$row['path']] = [(int) $row['size'], (int) $row['mtime']];
        }
        $cursor = (string) $db->query("SELECT value FROM meta WHERE key = 'cursor'")->fetchColumn();
        if ($cursor === '') {
            $db->exec('DELETE FROM seen');
        }
        $resume = $cursor === '' ? [] : explode('/', ltrim($cursor, '/'));

        $stats = ['indexed' => 0, 'unchanged' => 0, 'no_text' => 0, 'removed' => 0, 'dirs' => 0, 'done' => true];
        $ins = $db->prepare('INSERT OR REPLACE INTO files (path, name, ext, size, mtime, content, path_l, content_l, kind, name_l) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $mark = $db->prepare('INSERT OR IGNORE INTO seen (path) VALUES (?)');
        $marker = dirname($this->dbFile) . DIRECTORY_SEPARATOR . 'index.current';
        $last = $cursor;
        $handled = 0;
        $db->beginTransaction();

        foreach ($this->walk($root, '', $resume) as [$full, $rel, $isDir]) {
            // Work in short slices so no single web request runs into a server timeout. At least
            // MIN_ENTRIES per call guarantee progress even when the disk is slow.
            if ($handled >= self::MIN_ENTRIES && microtime(true) - $started > self::SLICE_SECONDS) {
                $stats['done'] = false;
                break;
            }
            $handled++;
            $mark->execute([$rel]);
            $last = $rel;
            $size = $isDir ? 0 : (int) @filesize($full);
            $mtime = (int) @filemtime($full);
            if (isset($known[$rel]) && $known[$rel] === [$size, $mtime]) {
                $stats['unchanged']++;
                continue;
            }
            if ($isDir) {
                $name = basename($full);
                $ins->execute([$rel, $name, '', 0, $mtime, null, mb_strtolower($rel), null, 'd', mb_strtolower($name)]);
                $stats['dirs']++;
                continue;
            }
            @file_put_contents($marker, $rel);
            $ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));
            $text = null;
            if (TextExtractor::supports($ext)) {
                $text = TextExtractor::extract($full, $ext);
            }
            if ($text === null && in_array($ext, ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff'], true)) {
                $text = $this->ocr->extract($rel);
            }
            if ($text === null) {
                $stats['no_text']++;
            }
            $ins->execute([$rel, basename($full), $ext, $size, $mtime, $text, mb_strtolower($rel), $text === null ? null : mb_strtolower($text), 'f', mb_strtolower(basename($full))]);
            $stats['indexed']++;
        }

        if ($stats['done']) {
            $stats['removed'] = (int) $db->exec('DELETE FROM files WHERE path NOT IN (SELECT path FROM seen)');
            $db->exec('DELETE FROM seen');
            $db->exec("DELETE FROM meta WHERE key = 'cursor'");
        } else {
            $save = $db->prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('cursor', ?)");
            $save->execute([$last]);
        }
        $db->commit();
        @unlink($marker);
        return $stats;
    }

    /**
     * Keeps the index in sync after a move/rename so search and statistics are right immediately,
     * without waiting for the next rebuild. Works for files and whole folders.
     */
    public function relocate(string $from, string $to): void
    {
        if (!$this->available() || !is_file($this->dbFile)) {
            return;
        }
        $db = $this->db();
        $update = $db->prepare('UPDATE files SET path = ?, name = ?, ext = ?, path_l = ?, name_l = ? WHERE path = ?');
        $apply = function (string $old, string $new) use ($update): void {
            $name = basename($new);
            $kind = pathinfo($name, PATHINFO_EXTENSION);
            $update->execute([$new, $name, strtolower($kind), mb_strtolower($new), mb_strtolower($name), $old]);
        };
        $db->beginTransaction();
        try {
            $row = $db->prepare('SELECT kind FROM files WHERE path = ?');
            $row->execute([$from]);
            $kindOfFrom = $row->fetchColumn();
            if ($kindOfFrom === 'd') {
                $children = $db->prepare('SELECT path FROM files WHERE path >= ? AND path < ?');
                $children->execute([rtrim($from, '/') . '/', rtrim($from, '/') . '0']);
                foreach ($children->fetchAll(PDO::FETCH_COLUMN) as $old) {
                    $apply($old, $to . substr($old, strlen($from)));
                }
                $db->prepare("UPDATE files SET path = ?, name = ?, path_l = ?, name_l = ?, ext = '' WHERE path = ?")
                    ->execute([$to, basename($to), mb_strtolower($to), mb_strtolower(basename($to)), $from]);
            } elseif ($kindOfFrom === 'f') {
                $apply($from, $to);
            }
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
        }
    }

    /** Adds a freshly created folder to the index. */
    public function addDir(string $path): void
    {
        if (!$this->available() || !is_file($this->dbFile)) {
            return;
        }
        $name = basename($path);
        $this->db()->prepare("INSERT OR IGNORE INTO files (path, name, ext, size, mtime, content, path_l, content_l, kind, name_l) VALUES (?, ?, '', 0, ?, NULL, ?, NULL, 'd', ?)")
            ->execute([$path, $name, time(), mb_strtolower($path), mb_strtolower($name)]);
    }

    public function status(): array
    {
        if (!$this->available() || !is_file($this->dbFile)) {
            return ['ready' => false, 'files' => 0, 'with_text' => 0, 'updated' => null];
        }
        $db = $this->db();
        $row = $db->query("SELECT COUNT(*) AS n, SUM(content IS NOT NULL) AS t FROM files WHERE kind = 'f'")->fetch(PDO::FETCH_ASSOC);
        return [
            'ready' => (int) $row['n'] > 0,
            'files' => (int) $row['n'],
            'with_text' => (int) $row['t'],
            'updated' => filemtime($this->dbFile) ?: null,
        ];
    }

    public function ready(): bool
    {
        if (!$this->available() || !is_file($this->dbFile)) {
            return false;
        }
        return (int) $this->db()->query('SELECT COUNT(*) FROM files')->fetchColumn() > 0;
    }

    /**
     * Searches the index. Every word of $o['query'] must appear in the name (or the whole path with pathMatch);
     * with $o['content'] the extracted text is searched for the whole phrase as well.
     * Options: query, content, ext[], from, to, minSize, maxSize, sort, order, limit, offset.
     *
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    public function query(array $o): array
    {
        $db = $this->db();
        $like = static fn (string $term): string => '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($term)) . '%';

        $where = [];
        $args = [];
        $query = trim((string) ($o['query'] ?? ''));
        $kind = ($o['kind'] ?? 'file') === 'dir' ? 'd' : 'f';
        $content = !empty($o['content']) && $kind === 'f';
        $nameCol = !empty($o['pathMatch']) ? 'path_l' : 'name_l';
        $where[] = 'kind = :kind';
        $args[':kind'] = $kind;
        if ($query !== '') {
            $nameParts = [];
            foreach (preg_split('/\s+/u', $query) ?: [] as $i => $term) {
                $nameParts[] = "{$nameCol} LIKE :t$i ESCAPE '\\'";
                $args[':t' . $i] = $like($term);
            }
            $cond = '(' . implode(' AND ', $nameParts) . ')';
            if ($content) {
                $cond = '(' . $cond . " OR content_l LIKE :phrase ESCAPE '\\')";
                $args[':phrase'] = $like($query);
            }
            $where[] = $cond;
        }
        if (($o['scope'] ?? '') !== '' && $o['scope'] !== '/') {
            $prefix = rtrim((string) $o['scope'], '/') . '/';
            $where[] = 'substr(path, 1, :scopeLen) = :scope';
            $args[':scopeLen'] = strlen($prefix);
            $args[':scope'] = $prefix;
        }
        if ($kind === 'f' && !empty($o['ext'])) {
            $marks = [];
            foreach (array_values($o['ext']) as $i => $e) {
                $marks[] = ':e' . $i;
                $args[':e' . $i] = $e;
            }
            $where[] = 'ext IN (' . implode(',', $marks) . ')';
        }
        if (($o['from'] ?? null) !== null) {
            $where[] = 'mtime >= :from';
            $args[':from'] = (int) $o['from'];
        }
        if (($o['to'] ?? null) !== null) {
            $where[] = 'mtime <= :to';
            $args[':to'] = (int) $o['to'];
        }
        if ($kind === 'f' && ($o['minSize'] ?? null) !== null) {
            $where[] = 'size >= :minSize';
            $args[':minSize'] = (int) $o['minSize'];
        }
        if ($kind === 'f' && ($o['maxSize'] ?? null) !== null) {
            $where[] = 'size <= :maxSize';
            $args[':maxSize'] = (int) $o['maxSize'];
        }
        $sql = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $count = $db->prepare('SELECT COUNT(*) FROM files' . $sql);
        $count->execute($args);
        $total = (int) $count->fetchColumn();

        $col = match ($o['sort'] ?? 'path') {
            'modified' => 'mtime',
            'size' => 'size',
            'name' => 'name COLLATE NOCASE',
            default => 'path COLLATE NOCASE',
        };
        $dir = strtolower((string) ($o['order'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC';
        $limit = max(1, min(500, (int) ($o['limit'] ?? 100)));
        $offset = max(0, (int) ($o['offset'] ?? 0));
        $select = $content && $query !== '' ? 'path, name, ext, size, mtime, content' : 'path, name, ext, size, mtime, NULL AS content';
        $stmt = $db->prepare("SELECT $select FROM files$sql ORDER BY $col $dir LIMIT $limit OFFSET $offset");
        $stmt->execute($args);

        $items = [];
        foreach ($stmt as $row) {
            $item = [
                'name' => $row['name'],
                'type' => $kind === 'd' ? 'dir' : 'file',
                'ext' => $row['ext'],
                'size' => $kind === 'd' ? null : (int) $row['size'],
                'modified' => (int) $row['mtime'],
                'path' => $row['path'],
            ];
            if ($row['content'] !== null) {
                $snippet = $this->snippet((string) $row['content'], $query);
                if ($snippet !== '') {
                    $item['snippet'] = $snippet;
                }
            }
            $items[] = $item;
        }
        return ['items' => $items, 'total' => $total];
    }

    /** @return array<string, string> path => snippet */
    public function contentMatches(string $query, int $limit = 500): array
    {
        if (!$this->available() || !is_file($this->dbFile)) {
            return [];
        }
        $needle = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query);
        $stmt = $this->db()->prepare("SELECT path, content FROM files WHERE content LIKE ? ESCAPE '\\' LIMIT " . $limit);
        $stmt->execute(['%' . $needle . '%']);
        $out = [];
        foreach ($stmt as $row) {
            $out[$row['path']] = $this->snippet((string) $row['content'], $query);
        }
        return $out;
    }

    private function snippet(string $text, string $query): string
    {
        $pos = mb_stripos($text, $query);
        if ($pos === false) {
            return '';
        }
        $start = max(0, $pos - 60);
        $prefix = $start > 0 ? '…' : '';
        return $prefix . mb_substr($text, $start, mb_strlen($query) + 120) . '…';
    }

    /**
     * Depth-first walk in scandir order. $resume is the path (as name parts) of the last entry
     * handled by a previous slice: everything up to and including it is skipped without stat calls.
     *
     * @return Generator<array{0:string,1:string,2:bool}> absolute path, relative path, is directory
     */
    private function walk(string $root, string $rel, array $resume = []): Generator
    {
        $dir = $rel === '' ? $root : $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, ltrim($rel, '/'));
        $entries = @scandir($dir);
        if ($entries === false) {
            return;
        }
        $cursorName = $resume[0] ?? null;
        $rest = array_slice($resume, 1);
        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
                continue;
            }
            if ($rel === '' && in_array($entry, $this->exclude, true)) {
                continue;
            }
            if ($cursorName !== null) {
                $cmp = strcmp($entry, $cursorName);
                if ($cmp < 0) {
                    continue;
                }
                $isCursor = $cmp === 0;
                $cursorName = null;
                if ($isCursor) {
                    // Already handled in an earlier slice; only its children may still be open.
                    $full = $dir . DIRECTORY_SEPARATOR . $entry;
                    if (is_dir($full)) {
                        yield from $this->walk($root, $rel . '/' . $entry, $rest);
                    }
                    continue;
                }
            }
            $full = $dir . DIRECTORY_SEPARATOR . $entry;
            $childRel = $rel . '/' . $entry;
            if (is_dir($full)) {
                yield [$full, $childRel, true];
                yield from $this->walk($root, $childRel, []);
            } elseif (is_file($full)) {
                yield [$full, $childRel, false];
            }
        }
    }

    /** Shared read access for the statistics and insight services. */
    public function db(): PDO
    {
        if ($this->pdo !== null) {
            return $this->pdo;
        }
        $dir = dirname($this->dbFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $pdo = new PDO('sqlite:' . $this->dbFile);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // Schema v3: lowercase columns for native search, folders as entries so SQLite can search natively (fast on a weak NAS CPU).
        if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() < 3) {
            $pdo->exec('DROP TABLE IF EXISTS files');
            $pdo->exec('PRAGMA user_version = 3');
        }
        $pdo->exec("CREATE TABLE IF NOT EXISTS files (
            path TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ext TEXT NOT NULL,
            size INTEGER NOT NULL,
            mtime INTEGER NOT NULL,
            content TEXT,
            path_l TEXT NOT NULL DEFAULT '',
            content_l TEXT,
            kind TEXT NOT NULL DEFAULT 'f',
            name_l TEXT NOT NULL DEFAULT ''
        )");
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_kind_mtime ON files(kind, mtime)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_kind_ext ON files(kind, ext)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_kind_size ON files(kind, size)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_files_name ON files(kind, name_l, size)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS seen (path TEXT PRIMARY KEY)');
        $this->pdo = $pdo;
        return $pdo;
    }
}
