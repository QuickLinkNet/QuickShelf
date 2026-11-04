<?php
declare(strict_types=1);

/**
 * "Aufräum-Assistent": finds what makes an archive hard to use (cryptic names, duplicates, huge files,
 * empty folders, an overflowing inbox). Everything is computed from the index, nothing is changed.
 */
class InsightsService
{
    /** Name patterns that say nothing about the content. key => [label, hint, SQL condition on name_l] */
    private const NAME_RULES = [
        'kamera' => ['Kamera-/Handy-Namen', 'IMG_1234.jpg, DSC_0001.jpg, P_2020…', "(name_l GLOB 'img_[0-9]*' OR name_l GLOB 'img-[0-9]*' OR name_l GLOB 'dsc_[0-9]*' OR name_l GLOB 'dsc[0-9]*' OR name_l GLOB 'p_[0-9]*' OR name_l GLOB 'pxl_[0-9]*' OR name_l GLOB '[0-9][0-9][0-9][0-9][0-9]*.jpg')"],
        'kopie' => ['Kopien und Versionen', '„Datei (1).pdf“, „Datei - Kopie.pdf“', "(name_l LIKE '%(_)%' OR name_l LIKE '%- kopie%' OR name_l LIKE '%_kopie%' OR name_l LIKE '% copy%' OR name_l LIKE '%_old.%' OR name_l LIKE '%_neu.%')"],
        'screenshot' => ['Screenshots', 'Screenshot 2026-… .png', "(name_l LIKE 'screenshot%' OR name_l LIKE 'bildschirmfoto%')"],
        'unbenannt' => ['Ohne Aussage', 'Unbenannt, Neu, test, Dokument_2026-…', "(name_l LIKE 'unbenannt%' OR name_l LIKE 'untitled%' OR name_l LIKE 'neu.%' OR name_l LIKE 'neues %' OR name_l LIKE 'test.%' OR name_l LIKE 'dokument\\_20%' ESCAPE '\\' OR name_l LIKE 'scan%' OR name_l GLOB 'doc[0-9]*')"],
        'zahlen' => ['Nur Zahlen oder Kürzel', '1.pdf, 23.pdf, 8f3a9c….png', "(name_l GLOB '[0-9]*' AND length(name_l) - length(ext) <= 8 AND ext <> '') OR (length(name_l) - length(ext) BETWEEN 30 AND 40 AND name_l GLOB '*-*-*-*')"],
        'whatsapp' => ['WhatsApp-Rohdaten', 'IMG-2025…-WA0012.jpg', "(name_l LIKE '%-wa0%' OR name_l LIKE 'whatsapp %')"],
    ];

    private const JUNK_NAMES = ['.htaccess', 'index.html', 'thumbs.db', 'desktop.ini', '.gitkeep', 'license', 'readme.md', 'package.json', 'cmakelists.txt'];

    private IndexService $index;
    private array $exclude;
    /** @var string[] top-level folders to leave out of the analysis (e.g. bought 3D libraries) */
    private array $skip = [];

    public function __construct(IndexService $index, array $exclude)
    {
        $this->index = $index;
        $this->exclude = $exclude;
    }

    /** @param string[] $areas top-level folder names */
    public function setSkip(array $areas): void
    {
        $this->skip = array_values(array_filter(array_map(fn ($a) => trim((string) $a, "/ 	"), $areas), fn ($a) => $a !== ''));
    }

    /** Overview with the health score and the top findings of every category. */
    public function summary(string $scope): array
    {
        $db = $this->index->db();
        [$sc, $args] = $this->scope($scope);
        $total = (int) $this->scalar("SELECT COUNT(*) FROM files WHERE kind = 'f'$sc", $args);

        $names = [];
        foreach (self::NAME_RULES as $key => $rule) {
            $n = (int) $this->scalar("SELECT COUNT(*) FROM files WHERE kind = 'f' AND ({$rule[2]})$sc", $args);
            $names[] = ['key' => $key, 'label' => $rule[0], 'hint' => $rule[1], 'count' => $n];
        }
        $dups = $this->duplicateStats($scope);
        $emptyDirs = count($this->emptyDirs($scope, 5000));
        $inboxFiles = $this->inboxCount();
        $noExt = (int) $this->scalar("SELECT COUNT(*) FROM files WHERE kind = 'f' AND ext = ''$sc", $args);
        $huge = (int) $this->scalar("SELECT COUNT(*) FROM files WHERE kind = 'f' AND size > 500*1024*1024$sc", $args);
        $deep = (int) $this->scalar("SELECT COUNT(*) FROM files WHERE kind = 'f' AND length(path) > 200$sc", $args);

        $badNames = array_sum(array_column($names, 'count'));
        $penalty = 0.0;
        if ($total > 0) {
            $penalty += min(35, 120 * $badNames / $total);
            $penalty += min(30, 150 * $dups['wasted_files'] / $total);
            $penalty += min(10, $emptyDirs / 5);
            $penalty += min(15, $inboxFiles / 20);
            $penalty += min(10, 400 * $noExt / $total);
        }
        $score = (int) max(0, round(100 - $penalty));

        return [
            'total_files' => $total,
            'score' => $score,
            'names' => $names,
            'duplicates' => $dups,
            'empty_dirs' => $emptyDirs,
            'inbox_files' => $inboxFiles,
            'no_ext' => $noExt,
            'huge' => $huge,
            'deep_paths' => $deep,
            'generated' => time(),
        ];
    }

    /** Files with cryptic names. $kind is a key of NAME_RULES. */
    public function badNames(string $kind, string $scope, int $limit, int $offset): array
    {
        $rule = self::NAME_RULES[$kind] ?? null;
        if ($rule === null) {
            return ['items' => [], 'total' => 0];
        }
        [$sc, $args] = $this->scope($scope);
        $where = "kind = 'f' AND ({$rule[2]})$sc";
        return $this->list($where, $args, 'path COLLATE NOCASE', $limit, $offset);
    }

    public function large(string $scope, int $minSize, int $limit, int $offset): array
    {
        [$sc, $args] = $this->scope($scope);
        $args[':min'] = $minSize;
        return $this->list("kind = 'f' AND size >= :min$sc", $args, 'size DESC', $limit, $offset);
    }

    public function noExtension(string $scope, int $limit, int $offset): array
    {
        [$sc, $args] = $this->scope($scope);
        return $this->list("kind = 'f' AND ext = ''$sc", $args, 'path COLLATE NOCASE', $limit, $offset);
    }

    public function deepPaths(string $scope, int $limit, int $offset): array
    {
        [$sc, $args] = $this->scope($scope);
        return $this->list("kind = 'f' AND length(path) > 200$sc", $args, 'length(path) DESC', $limit, $offset);
    }

    /** Folders that contain no files at any depth. */
    public function emptyDirs(string $scope, int $limit): array
    {
        $db = $this->index->db();
        $used = [];
        foreach ($db->query("SELECT path FROM files WHERE kind = 'f'") as $r) {
            $p = $r['path'];
            while (($pos = strrpos($p, '/')) > 0) {
                $p = substr($p, 0, $pos);
                if (isset($used[$p])) {
                    break;
                }
                $used[$p] = true;
            }
        }
        $out = [];
        $prefix = ($scope === '' || $scope === '/') ? '' : rtrim($scope, '/') . '/';
        foreach ($db->query("SELECT path, name, mtime FROM files WHERE kind = 'd' ORDER BY path COLLATE NOCASE") as $r) {
            if (isset($used[$r['path']]) || ($prefix !== '' && !str_starts_with($r['path'] . '/', $prefix))) {
                continue;
            }
            foreach ($this->skip as $area) {
                if (str_starts_with($r['path'] . '/', '/' . $area . '/')) {
                    continue 2;
                }
            }
            $out[] = ['name' => $r['name'], 'type' => 'dir', 'ext' => '', 'size' => null, 'modified' => (int) $r['mtime'], 'path' => $r['path']];
            if (count($out) >= $limit) {
                break;
            }
        }
        return $out;
    }

    /** Duplicate groups (same name and size). Largest waste first. */
    public function duplicates(string $scope, int $minSize, int $limit, int $offset): array
    {
        $db = $this->index->db();
        [$sc, $args] = $this->scope($scope);
        $args[':min'] = $minSize;
        $junk = "'" . implode("','", self::JUNK_NAMES) . "'";
        $sql = "SELECT name, size, COUNT(*) n, GROUP_CONCAT(path, char(10)) paths, MAX(mtime) m
                FROM files WHERE kind = 'f' AND size >= :min AND name_l NOT IN ($junk)$sc
                GROUP BY name_l, size HAVING n > 1 ORDER BY size * (n - 1) DESC";
        $stmt = $db->prepare($sql . ' LIMIT ' . max(1, min(200, $limit)) . ' OFFSET ' . max(0, $offset));
        $stmt->execute($args);
        $groups = [];
        foreach ($stmt as $r) {
            $groups[] = [
                'name' => $r['name'],
                'size' => (int) $r['size'],
                'count' => (int) $r['n'],
                'wasted' => (int) $r['size'] * ((int) $r['n'] - 1),
                'paths' => explode("\n", (string) $r['paths']),
                'modified' => (int) $r['m'],
            ];
        }
        return ['groups' => $groups, 'stats' => $this->duplicateStats($scope, $minSize)];
    }

    /** @return array{groups:int, wasted_files:int, wasted_bytes:int} */
    public function duplicateStats(string $scope, int $minSize = 51200): array
    {
        [$sc, $args] = $this->scope($scope);
        $args[':min'] = $minSize;
        $junk = "'" . implode("','", self::JUNK_NAMES) . "'";
        $stmt = $this->index->db()->prepare("SELECT COUNT(*) g, COALESCE(SUM(n - 1), 0) f, COALESCE(SUM(size * (n - 1)), 0) b FROM
            (SELECT size, COUNT(*) n FROM files WHERE kind = 'f' AND size >= :min AND name_l NOT IN ($junk)$sc GROUP BY name_l, size HAVING n > 1)");
        $stmt->execute($args);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return ['groups' => (int) $r['g'], 'wasted_files' => (int) $r['f'], 'wasted_bytes' => (int) $r['b']];
    }

    /** Hashes the given files (same size expected) so the UI can confirm real duplicates. */
    public function verify(array $absolute): array
    {
        $out = [];
        foreach ($absolute as $rel => $abs) {
            $out[$rel] = is_file($abs) ? (@md5_file($abs) ?: null) : null;
        }
        return $out;
    }

    private function inboxCount(): int
    {
        $stmt = $this->index->db()->query("SELECT COUNT(*) FROM files WHERE kind = 'f' AND (path LIKE '/99\\_%' ESCAPE '\\' OR path LIKE '/eingang/%' OR path LIKE '/inbox/%')");
        return (int) $stmt->fetchColumn();
    }

    /** @return array{0:string,1:array<string,string>} SQL fragment and arguments for a folder scope */
    private function scope(string $scope): array
    {
        $sql = '';
        $args = [];
        if ($scope !== '' && $scope !== '/') {
            [$lo, $hi] = StatsService::range($scope);
            $sql .= ' AND path >= :lo AND path < :hi';
            $args[':lo'] = $lo;
            $args[':hi'] = $hi;
        }
        foreach ($this->skip as $i => $area) {
            [$lo, $hi] = StatsService::range('/' . $area);
            $sql .= " AND NOT (path >= :slo$i AND path < :shi$i)";
            $args[":slo$i"] = $lo;
            $args[":shi$i"] = $hi;
        }
        return [$sql, $args];
    }

    private function scalar(string $sql, array $args)
    {
        $stmt = $this->index->db()->prepare($sql);
        $stmt->execute($args);
        return $stmt->fetchColumn();
    }

    private function list(string $where, array $args, string $order, int $limit, int $offset): array
    {
        $limit = max(1, min(500, $limit));
        $offset = max(0, $offset);
        $stmt = $this->index->db()->prepare("SELECT COUNT(*) FROM files WHERE $where");
        $stmt->execute($args);
        $total = (int) $stmt->fetchColumn();
        $stmt = $this->index->db()->prepare("SELECT path, name, ext, size, mtime FROM files WHERE $where ORDER BY $order LIMIT $limit OFFSET $offset");
        $stmt->execute($args);
        $items = [];
        foreach ($stmt as $r) {
            $items[] = ['name' => $r['name'], 'type' => 'file', 'ext' => $r['ext'], 'size' => (int) $r['size'], 'modified' => (int) $r['mtime'], 'path' => $r['path']];
        }
        return ['items' => $items, 'total' => $total];
    }
}
