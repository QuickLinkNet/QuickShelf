<?php
declare(strict_types=1);

/**
 * Read-only statistics computed from the SQLite index (never touches the archive itself).
 * Folder aggregates use a key range on the primary key (path >= "x/" AND path < "x0"), which is fast
 * even on a weak NAS CPU.
 */
class StatsService
{
    private IndexService $index;

    public function __construct(IndexService $index)
    {
        $this->index = $index;
    }

    /** Key range that contains exactly the descendants of $path. */
    public static function range(string $path): array
    {
        $prefix = rtrim($path, '/');
        return [$prefix . '/', $prefix . '0'];
    }

    private const AREA = "CASE WHEN instr(substr(path, 2), '/') > 0 THEN substr(path, 2, instr(substr(path, 2), '/') - 1) ELSE '' END";

    public function overview(): array
    {
        $db = $this->index->db();
        $row = $db->query("SELECT COUNT(*) n, COALESCE(SUM(size), 0) s, COALESCE(SUM(content IS NOT NULL), 0) t, COALESCE(MAX(mtime), 0) m FROM files WHERE kind = 'f'")->fetch(PDO::FETCH_ASSOC);
        $dirs = (int) $db->query("SELECT COUNT(*) FROM files WHERE kind = 'd'")->fetchColumn();

        $areas = [];
        $dirCounts = [];
        foreach ($db->query("SELECT " . self::AREA . " a, COUNT(*) n FROM files WHERE kind = 'd' GROUP BY a") as $r) {
            $dirCounts[$r['a']] = (int) $r['n'];
        }
        foreach ($db->query("SELECT " . self::AREA . " a, COUNT(*) n, COALESCE(SUM(size), 0) s, MAX(mtime) m FROM files WHERE kind = 'f' GROUP BY a ORDER BY a") as $r) {
            if ($r['a'] === '') {
                continue;
            }
            $areas[] = [
                'name' => $r['a'],
                'path' => '/' . $r['a'],
                'files' => (int) $r['n'],
                'bytes' => (int) $r['s'],
                'dirs' => $dirCounts[$r['a']] ?? 0,
                'latest' => (int) $r['m'],
            ];
        }

        $groups = [];
        foreach ($db->query("SELECT ext, COUNT(*) n, COALESCE(SUM(size), 0) s FROM files WHERE kind = 'f' GROUP BY ext") as $r) {
            $g = FileTypes::group((string) $r['ext']);
            $groups[$g]['files'] = ($groups[$g]['files'] ?? 0) + (int) $r['n'];
            $groups[$g]['bytes'] = ($groups[$g]['bytes'] ?? 0) + (int) $r['s'];
        }
        $types = [];
        foreach ($groups as $key => $g) {
            $types[] = ['key' => $key, 'label' => FileTypes::label($key), 'files' => $g['files'], 'bytes' => $g['bytes']];
        }
        usort($types, fn ($a, $b) => $b['bytes'] <=> $a['bytes']);

        $years = [];
        foreach ($db->query("SELECT strftime('%Y', mtime, 'unixepoch') y, COUNT(*) n, COALESCE(SUM(size), 0) s FROM files WHERE kind = 'f' GROUP BY y ORDER BY y") as $r) {
            $years[] = ['year' => (int) $r['y'], 'files' => (int) $r['n'], 'bytes' => (int) $r['s']];
        }

        return [
            'totals' => ['files' => (int) $row['n'], 'bytes' => (int) $row['s'], 'with_text' => (int) $row['t'], 'dirs' => $dirs, 'latest' => (int) $row['m']],
            'areas' => $areas,
            'types' => $types,
            'years' => $years,
            'recent' => $this->files("ORDER BY mtime DESC", [], 12),
            'largest' => $this->files("ORDER BY size DESC", [], 8),
        ];
    }

    /** Files changed per day (local time) for the activity heatmap. */
    public function heatmap(int $days): array
    {
        $days = max(7, min(3650, $days));
        $since = time() - $days * 86400;
        $stmt = $this->index->db()->prepare("SELECT strftime('%Y-%m-%d', mtime, 'unixepoch', 'localtime') d, COUNT(*) n, COALESCE(SUM(size), 0) s FROM files WHERE kind = 'f' AND mtime >= :s GROUP BY d ORDER BY d");
        $stmt->execute([':s' => $since]);
        $out = [];
        foreach ($stmt as $r) {
            $out[] = ['date' => $r['d'], 'count' => (int) $r['n'], 'bytes' => (int) $r['s']];
        }
        return ['days' => $days, 'items' => $out];
    }

    /** Files whose modification date lies on a given calendar day (local time). */
    public function day(string $date, int $limit = 200): array
    {
        $start = strtotime($date . ' 00:00:00');
        if ($start === false) {
            return ['items' => [], 'total' => 0];
        }
        $end = $start + 86399;
        $total = $this->index->db()->prepare("SELECT COUNT(*) FROM files WHERE kind = 'f' AND mtime BETWEEN :a AND :b");
        $total->execute([':a' => $start, ':b' => $end]);
        return [
            'items' => $this->files("AND mtime BETWEEN :a AND :b ORDER BY path COLLATE NOCASE", [':a' => $start, ':b' => $end], $limit),
            'total' => (int) $total->fetchColumn(),
        ];
    }

    /** Photos taken on this calendar day (month-day) in earlier years – "An diesem Tag". */
    public function onThisDay(string $monthDay, int $limit, string $scope = ''): array
    {
        if (!preg_match('/^\d{2}-\d{2}$/', $monthDay)) {
            return ['items' => []];
        }
        $ext = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $marks = implode(',', array_fill(0, count($ext), '?'));
        $args = $ext;
        $where = '';
        if ($scope !== '' && $scope !== '/') {
            [$lo, $hi] = self::range($scope);
            $where = ' AND path >= ? AND path < ?';
            array_push($args, $lo, $hi);
        }
        $args[] = $monthDay;
        $stmt = $this->index->db()->prepare("SELECT path, name, ext, size, mtime FROM files
            WHERE kind = 'f' AND ext IN ($marks)$where AND strftime('%m-%d', mtime, 'unixepoch', 'localtime') = ?
              AND CAST(strftime('%Y', mtime, 'unixepoch', 'localtime') AS INTEGER) < CAST(strftime('%Y', 'now', 'localtime') AS INTEGER)
            ORDER BY mtime DESC LIMIT " . max(1, min(60, $limit)));
        $stmt->execute($args);
        $items = [];
        foreach ($stmt as $r) {
            $items[] = ['name' => $r['name'], 'type' => 'file', 'ext' => $r['ext'], 'size' => (int) $r['size'], 'modified' => (int) $r['mtime'], 'path' => $r['path']];
        }
        return ['items' => $items, 'date' => $monthDay];
    }

    /** Newest files, optionally limited to a folder and a file group. */
    public function changes(int $limit, int $offset, string $scope, string $group): array
    {
        $where = '';
        $args = [];
        if ($scope !== '' && $scope !== '/') {
            [$lo, $hi] = self::range($scope);
            $where .= ' AND path >= :lo AND path < :hi';
            $args[':lo'] = $lo;
            $args[':hi'] = $hi;
        }
        $ext = FileTypes::extensions($group);
        if ($ext !== []) {
            $marks = [];
            foreach ($ext as $i => $e) {
                $marks[] = ':e' . $i;
                $args[':e' . $i] = $e;
            }
            $where .= ' AND ext IN (' . implode(',', $marks) . ')';
        }
        return ['items' => $this->files($where . ' ORDER BY mtime DESC', $args, max(1, min(200, $limit)), max(0, $offset))];
    }

    /** Summary of a folder plus its direct subfolders, all from the index. */
    public function folder(string $path): array
    {
        $db = $this->index->db();
        $prefix = rtrim($path, '/');
        $len = strlen($prefix) + 1;
        [$lo, $hi] = self::range($prefix === '' ? '' : $prefix);
        $base = ' FROM files WHERE kind = \'f\' AND path >= :lo AND path < :hi';
        $args = [':lo' => $lo, ':hi' => $hi];

        $stmt = $db->prepare('SELECT COUNT(*) n, COALESCE(SUM(size), 0) s, MIN(mtime) a, MAX(mtime) b' . $base);
        $stmt->execute($args);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);

        $children = [];
        $stmt = $db->prepare("SELECT substr(path, $len + 1, instr(substr(path, $len + 1) || '/', '/') - 1) seg, COUNT(*) n, COALESCE(SUM(size), 0) s, MAX(mtime) m,
            SUM(instr(substr(path, $len + 1), '/') > 0) nested" . $base . ' GROUP BY seg');
        $stmt->execute($args);
        foreach ($stmt as $r) {
            if ((int) $r['nested'] === 0) {
                continue; // plain files directly in this folder
            }
            $children[$r['seg']] = ['name' => $r['seg'], 'path' => $prefix . '/' . $r['seg'], 'files' => (int) $r['n'], 'bytes' => (int) $r['s'], 'latest' => (int) $r['m']];
        }
        // Folders without any file below them are missing above; add them from the directory entries.
        $stmt = $db->prepare("SELECT path, name, mtime FROM files WHERE kind = 'd' AND path >= :lo AND path < :hi");
        $stmt->execute($args);
        foreach ($stmt as $r) {
            $rest = substr($r['path'], $len);
            if ($rest !== '' && !str_contains($rest, '/') && !isset($children[$r['name']])) {
                $children[$r['name']] = ['name' => $r['name'], 'path' => $r['path'], 'files' => 0, 'bytes' => 0, 'latest' => (int) $r['mtime']];
            }
        }
        $children = array_values($children);
        usort($children, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        $types = [];
        $stmt = $db->prepare('SELECT ext, COUNT(*) n, COALESCE(SUM(size), 0) s' . $base . ' GROUP BY ext');
        $stmt->execute($args);
        foreach ($stmt as $r) {
            $g = FileTypes::group((string) $r['ext']);
            $types[$g] = ['key' => $g, 'label' => FileTypes::label($g), 'files' => ($types[$g]['files'] ?? 0) + (int) $r['n'], 'bytes' => ($types[$g]['bytes'] ?? 0) + (int) $r['s']];
        }
        usort($types, fn ($a, $b) => $b['files'] <=> $a['files']);

        return [
            'path' => $prefix === '' ? '/' : $prefix,
            'files' => (int) $info['n'],
            'bytes' => (int) $info['s'],
            'oldest' => $info['a'] === null ? null : (int) $info['a'],
            'newest' => $info['b'] === null ? null : (int) $info['b'],
            'children' => $children,
            'types' => array_values($types),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function files(string $tail, array $args, int $limit, int $offset = 0): array
    {
        $stmt = $this->index->db()->prepare("SELECT path, name, ext, size, mtime FROM files WHERE kind = 'f' $tail LIMIT " . (int) $limit . ' OFFSET ' . (int) $offset);
        $stmt->execute($args);
        $items = [];
        foreach ($stmt as $r) {
            $items[] = ['name' => $r['name'], 'type' => 'file', 'ext' => $r['ext'], 'size' => (int) $r['size'], 'modified' => (int) $r['mtime'], 'path' => $r['path']];
        }
        return $items;
    }
}
