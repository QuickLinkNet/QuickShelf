<?php
declare(strict_types=1);

/** Read-only analytics endpoints: overview, folder summaries, activity, clean-up insights, system health. */
class InsightsController
{
    private StatsService $stats;
    private InsightsService $insights;
    private SystemService $system;
    private FilesService $files;
    private IndexService $index;

    public function __construct(StatsService $stats, InsightsService $insights, SystemService $system, FilesService $files, IndexService $index)
    {
        $this->stats = $stats;
        $this->insights = $insights;
        $this->system = $system;
        $this->files = $files;
        $this->index = $index;
    }

    public function overview(Request $request): void
    {
        $this->needIndex(fn () => $this->stats->overview());
    }

    public function folder(Request $request): void
    {
        $path = '/' . trim(str_replace('\\', '/', (string) $request->input('path', '/')), '/');
        if ($path !== '/' && $this->files->stat($path) === null) {
            Response::json(404, ['error' => 'Directory not found']);
            return;
        }
        $this->needIndex(fn () => $this->stats->folder($path === '/' ? '' : $path));
    }

    public function heatmap(Request $request): void
    {
        $this->needIndex(fn () => $this->stats->heatmap((int) $request->input('days', '365')));
    }

    public function day(Request $request): void
    {
        $this->needIndex(fn () => $this->stats->day((string) $request->input('date', date('Y-m-d')), (int) $request->input('limit', '200')));
    }

    public function changes(Request $request): void
    {
        $this->needIndex(fn () => $this->stats->changes(
            (int) $request->input('limit', '50'),
            (int) $request->input('offset', '0'),
            (string) $request->input('scope', ''),
            (string) $request->input('group', '')
        ));
    }

    public function memories(Request $request): void
    {
        $this->needIndex(fn () => $this->stats->onThisDay((string) $request->input('date', date('m-d')), (int) $request->input('limit', '12'), (string) $request->input('scope', '')));
    }

    public function summary(Request $request): void
    {
        $this->needIndex(fn () => $this->insights->summary($this->scope($request)));
    }

    public function names(Request $request): void
    {
        $this->needIndex(fn () => $this->insights->badNames((string) $request->input('kind', ''), $this->scope($request), $this->limit($request), $this->offset($request)));
    }

    public function large(Request $request): void
    {
        $min = max(0, (int) $request->input('min', (string) (100 * 1024 * 1024)));
        $this->needIndex(fn () => $this->insights->large($this->scope($request), $min, $this->limit($request), $this->offset($request)));
    }

    public function noExtension(Request $request): void
    {
        $this->needIndex(fn () => $this->insights->noExtension($this->scope($request), $this->limit($request), $this->offset($request)));
    }

    public function deepPaths(Request $request): void
    {
        $this->needIndex(fn () => $this->insights->deepPaths($this->scope($request), $this->limit($request), $this->offset($request)));
    }

    public function emptyDirs(Request $request): void
    {
        $this->needIndex(fn () => ['items' => $this->insights->emptyDirs($this->scope($request), $this->limit($request))]);
    }

    public function duplicates(Request $request): void
    {
        $min = max(0, (int) $request->input('min', '51200'));
        $this->needIndex(fn () => $this->insights->duplicates($this->scope($request), $min, $this->limit($request), $this->offset($request)));
    }

    /** Hashes the files of one duplicate group so the UI can tell real duplicates from name clashes. */
    public function verify(Request $request): void
    {
        $paths = $request->json()['paths'] ?? [];
        if (!is_array($paths) || count($paths) > 12) {
            Response::json(400, ['error' => 'Zu viele Pfade']);
            return;
        }
        $abs = [];
        foreach ($paths as $p) {
            $resolved = is_string($p) ? $this->files->resolveFile($p) : null;
            if ($resolved !== null) {
                $abs[$p] = $resolved;
            }
        }
        @set_time_limit(120);
        Response::json(200, ['hashes' => $this->insights->verify($abs)]);
    }

    public function system(Request $request): void
    {
        Response::json(200, $this->system->info());
    }

    private function needIndex(callable $fn): void
    {
        if (!$this->index->available() || !$this->index->ready()) {
            Response::json(503, ['error' => 'Index not ready']);
            return;
        }
        Response::json(200, $fn());
    }

    private function scope(Request $request): string
    {
        $skip = trim((string) $request->input('skip', ''));
        $this->insights->setSkip($skip === '' ? [] : explode(',', $skip));
        $scope = trim((string) $request->input('scope', ''));
        return $scope === '' || $scope === '/' ? '' : '/' . trim(str_replace('\\', '/', $scope), '/');
    }

    private function limit(Request $request): int
    {
        return max(1, min(500, (int) $request->input('limit', '50')));
    }

    private function offset(Request $request): int
    {
        return max(0, (int) $request->input('offset', '0'));
    }
}
