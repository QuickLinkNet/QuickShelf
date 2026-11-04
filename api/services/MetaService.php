<?php
declare(strict_types=1);

/**
 * Personal annotations (favourites, tags, notes, recently opened, saved searches).
 * Stored in a separate SQLite file next to the index – the archive itself stays untouched, so this also
 * works in read-only mode.
 */
class MetaService
{
    private string $dbFile;
    private ?PDO $pdo = null;

    public function __construct(string $indexDir)
    {
        $this->dbFile = rtrim($indexDir, '/\\') . DIRECTORY_SEPARATOR . 'meta.sqlite';
    }

    public function available(): bool
    {
        return extension_loaded('pdo_sqlite');
    }

    public function get(string $path): array
    {
        $db = $this->db();
        $fav = $db->prepare('SELECT added FROM favorites WHERE path = ?');
        $fav->execute([$path]);
        $favorite = $fav->fetchColumn();
        $tags = $db->prepare('SELECT tag FROM tags WHERE path = ? ORDER BY tag');
        $tags->execute([$path]);
        $note = $db->prepare('SELECT note, updated FROM notes WHERE path = ?');
        $note->execute([$path]);
        $noteRow = $note->fetch(PDO::FETCH_ASSOC) ?: null;
        $views = $db->prepare('SELECT count, last_view FROM views WHERE path = ?');
        $views->execute([$path]);
        $viewRow = $views->fetch(PDO::FETCH_ASSOC) ?: null;
        return [
            'path' => $path,
            'favorite' => $favorite !== false,
            'tags' => $tags->fetchAll(PDO::FETCH_COLUMN),
            'note' => $noteRow['note'] ?? '',
            'note_updated' => isset($noteRow['updated']) ? (int) $noteRow['updated'] : null,
            'views' => (int) ($viewRow['count'] ?? 0),
            'last_view' => isset($viewRow['last_view']) ? (int) $viewRow['last_view'] : null,
        ];
    }

    /** All paths that carry a favourite flag, tag or note, newest first. */
    public function favorites(string $tag = ''): array
    {
        $db = $this->db();
        if ($tag !== '') {
            $stmt = $db->prepare('SELECT path FROM tags WHERE tag = ? ORDER BY path');
            $stmt->execute([$tag]);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        return $db->query('SELECT path FROM favorites ORDER BY added DESC')->fetchAll(PDO::FETCH_COLUMN);
    }

    public function tagCloud(): array
    {
        $rows = $this->db()->query('SELECT tag, COUNT(*) n FROM tags GROUP BY tag ORDER BY n DESC, tag')->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn ($r) => ['tag' => $r['tag'], 'count' => (int) $r['n']], $rows);
    }

    public function notes(): array
    {
        return $this->db()->query('SELECT path, note, updated FROM notes WHERE note <> \'\' ORDER BY updated DESC')->fetchAll(PDO::FETCH_ASSOC);
    }

    public function setFavorite(string $path, bool $on): void
    {
        $db = $this->db();
        if ($on) {
            $db->prepare('INSERT OR IGNORE INTO favorites (path, added) VALUES (?, ?)')->execute([$path, time()]);
        } else {
            $db->prepare('DELETE FROM favorites WHERE path = ?')->execute([$path]);
        }
    }

    public function setTag(string $path, string $tag, bool $on): void
    {
        $tag = mb_substr(trim(preg_replace('/\s+/u', ' ', $tag) ?? ''), 0, 40);
        if ($tag === '') {
            return;
        }
        $db = $this->db();
        if ($on) {
            $db->prepare('INSERT OR IGNORE INTO tags (path, tag) VALUES (?, ?)')->execute([$path, $tag]);
        } else {
            $db->prepare('DELETE FROM tags WHERE path = ? AND tag = ?')->execute([$path, $tag]);
        }
    }

    public function setNote(string $path, string $note): void
    {
        $note = mb_substr($note, 0, 5000);
        if (trim($note) === '') {
            $this->db()->prepare('DELETE FROM notes WHERE path = ?')->execute([$path]);
            return;
        }
        $this->db()->prepare('INSERT OR REPLACE INTO notes (path, note, updated) VALUES (?, ?, ?)')->execute([$path, $note, time()]);
    }

    public function view(string $path): void
    {
        $this->db()->prepare('INSERT INTO views (path, count, last_view) VALUES (?, 1, ?)
            ON CONFLICT(path) DO UPDATE SET count = count + 1, last_view = excluded.last_view')->execute([$path, time()]);
    }

    /** @return string[] paths, most recently opened first */
    public function recentViews(int $limit): array
    {
        $stmt = $this->db()->prepare('SELECT path FROM views ORDER BY last_view DESC LIMIT ' . max(1, min(100, $limit)));
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function searches(): array
    {
        $rows = $this->db()->query('SELECT id, label, params, created FROM searches ORDER BY created DESC')->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn ($r) => ['id' => (int) $r['id'], 'label' => $r['label'], 'params' => json_decode((string) $r['params'], true) ?: [], 'created' => (int) $r['created']], $rows);
    }

    public function saveSearch(string $label, array $params): int
    {
        $label = mb_substr(trim($label), 0, 80);
        $db = $this->db();
        $db->prepare('INSERT INTO searches (label, params, created) VALUES (?, ?, ?)')->execute([$label, json_encode($params, JSON_UNESCAPED_UNICODE), time()]);
        return (int) $db->lastInsertId();
    }

    public function deleteSearch(int $id): void
    {
        $this->db()->prepare('DELETE FROM searches WHERE id = ?')->execute([$id]);
    }

    /** Re-points annotations after a file moved, so notes and favourites survive a reorganisation. */
    public function relink(string $from, string $to): int
    {
        $n = 0;
        $db = $this->db();
        foreach (['favorites', 'tags', 'notes', 'views'] as $table) {
            $stmt = $db->prepare("UPDATE OR REPLACE $table SET path = ? WHERE path = ?");
            $stmt->execute([$to, $from]);
            $n += $stmt->rowCount();
        }
        return $n;
    }

    public function logMove(string $from, string $to): int
    {
        $db = $this->db();
        $db->prepare('INSERT INTO moves (from_path, to_path, at, undone) VALUES (?, ?, ?, 0)')->execute([$from, $to, time()]);
        return (int) $db->lastInsertId();
    }

    /** @return array<int, array<string, mixed>> newest first */
    public function moves(int $limit): array
    {
        $stmt = $this->db()->prepare('SELECT id, from_path, to_path, at, undone FROM moves ORDER BY id DESC LIMIT ' . max(1, min(200, $limit)));
        $stmt->execute();
        return array_map(fn ($r) => ['id' => (int) $r['id'], 'from' => $r['from_path'], 'to' => $r['to_path'], 'at' => (int) $r['at'], 'undone' => (int) $r['undone'] === 1], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function move(int $id): ?array
    {
        $stmt = $this->db()->prepare('SELECT id, from_path, to_path, undone FROM moves WHERE id = ?');
        $stmt->execute([$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? ['id' => (int) $r['id'], 'from' => $r['from_path'], 'to' => $r['to_path'], 'undone' => (int) $r['undone'] === 1] : null;
    }

    public function markUndone(int $id): void
    {
        $this->db()->prepare('UPDATE moves SET undone = 1 WHERE id = ?')->execute([$id]);
    }

    public function export(): array
    {
        $db = $this->db();
        return [
            'favorites' => $db->query('SELECT path, added FROM favorites')->fetchAll(PDO::FETCH_ASSOC),
            'tags' => $db->query('SELECT path, tag FROM tags')->fetchAll(PDO::FETCH_ASSOC),
            'notes' => $db->query('SELECT path, note, updated FROM notes')->fetchAll(PDO::FETCH_ASSOC),
            'searches' => $this->searches(),
        ];
    }

    private function db(): PDO
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
        $pdo->exec('CREATE TABLE IF NOT EXISTS favorites (path TEXT PRIMARY KEY, added INTEGER NOT NULL)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS tags (path TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (path, tag))');
        $pdo->exec('CREATE TABLE IF NOT EXISTS notes (path TEXT PRIMARY KEY, note TEXT NOT NULL, updated INTEGER NOT NULL)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS views (path TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, last_view INTEGER NOT NULL)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS moves (id INTEGER PRIMARY KEY AUTOINCREMENT, from_path TEXT NOT NULL, to_path TEXT NOT NULL, at INTEGER NOT NULL, undone INTEGER NOT NULL DEFAULT 0)');
        $pdo->exec('CREATE TABLE IF NOT EXISTS searches (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, params TEXT NOT NULL, created INTEGER NOT NULL)');
        $this->pdo = $pdo;
        return $pdo;
    }
}
