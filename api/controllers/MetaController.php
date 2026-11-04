<?php
declare(strict_types=1);

/** Favourites, tags, notes, recently opened files and saved searches (stored outside the archive). */
class MetaController
{
    private MetaService $meta;
    private FilesService $files;

    public function __construct(MetaService $meta, FilesService $files)
    {
        $this->meta = $meta;
        $this->files = $files;
    }

    public function get(Request $request): void
    {
        $path = $this->path($request);
        if ($path === null) {
            return;
        }
        Response::json(200, $this->meta->get($path));
    }

    public function favorites(Request $request): void
    {
        Response::json(200, ['items' => $this->describe($this->meta->favorites((string) $request->input('tag', '')))]);
    }

    public function recent(Request $request): void
    {
        Response::json(200, ['items' => $this->describe($this->meta->recentViews((int) $request->input('limit', '12')))]);
    }

    public function tags(Request $request): void
    {
        Response::json(200, ['tags' => $this->meta->tagCloud()]);
    }

    public function notes(Request $request): void
    {
        $out = [];
        foreach ($this->meta->notes() as $n) {
            $item = $this->files->stat($n['path']);
            $out[] = ['path' => $n['path'], 'note' => $n['note'], 'updated' => (int) $n['updated'], 'item' => $item, 'missing' => $item === null];
        }
        Response::json(200, ['items' => $out]);
    }

    public function favorite(Request $request): void
    {
        $body = $this->body($request);
        if (!$this->valid($body['path'] ?? null)) {
            return;
        }
        $this->meta->setFavorite((string) $body['path'], $this->flag($body['on'] ?? true));
        Response::json(200, $this->meta->get((string) $body['path']));
    }

    public function tag(Request $request): void
    {
        $body = $this->body($request);
        if (!$this->valid($body['path'] ?? null) || !is_string($body['tag'] ?? null)) {
            Response::json(400, ['error' => 'path und tag nötig']);
            return;
        }
        $this->meta->setTag((string) $body['path'], $body['tag'], $this->flag($body['on'] ?? true));
        Response::json(200, $this->meta->get((string) $body['path']));
    }

    public function note(Request $request): void
    {
        $body = $this->body($request);
        if (!$this->valid($body['path'] ?? null)) {
            return;
        }
        $this->meta->setNote((string) $body['path'], (string) ($body['note'] ?? ''));
        Response::json(200, $this->meta->get((string) $body['path']));
    }

    public function view(Request $request): void
    {
        $body = $this->body($request);
        if (!$this->valid($body['path'] ?? null)) {
            return;
        }
        $this->meta->view((string) $body['path']);
        Response::json(200, ['status' => 'ok']);
    }

    public function searches(Request $request): void
    {
        Response::json(200, ['items' => $this->meta->searches()]);
    }

    public function saveSearch(Request $request): void
    {
        $body = $this->body($request);
        $label = trim((string) ($body['label'] ?? ''));
        $params = $body['params'] ?? null;
        if ($label === '' || !is_array($params)) {
            Response::json(400, ['error' => 'label und params nötig']);
            return;
        }
        Response::json(201, ['id' => $this->meta->saveSearch($label, $params)]);
    }

    public function deleteSearch(Request $request): void
    {
        $this->meta->deleteSearch((int) ($this->body($request)['id'] ?? 0));
        Response::json(200, ['status' => 'ok']);
    }

    /** Moves annotations to a new path after the file was reorganised. */
    public function relink(Request $request): void
    {
        $body = $this->body($request);
        if (!$this->valid($body['from'] ?? null) || !$this->valid($body['to'] ?? null)) {
            return;
        }
        Response::json(200, ['updated' => $this->meta->relink((string) $body['from'], (string) $body['to'])]);
    }

    public function export(Request $request): void
    {
        Response::json(200, $this->meta->export());
    }

    /** @param string[] $paths */
    private function describe(array $paths): array
    {
        $items = [];
        foreach ($paths as $path) {
            $item = $this->files->stat($path);
            if ($item === null) {
                $name = basename($path);
                $item = ['name' => $name, 'type' => 'file', 'ext' => strtolower(pathinfo($name, PATHINFO_EXTENSION)), 'size' => null, 'modified' => 0, 'path' => $path, 'missing' => true];
            }
            $items[] = $item;
        }
        return $items;
    }

    private function body(Request $request): array
    {
        return array_merge($request->query, $request->post, $request->json());
    }

    private function path(Request $request): ?string
    {
        $path = $request->input('path', '');
        if (!$this->valid($path)) {
            return null;
        }
        return (string) $path;
    }

    private function valid($path): bool
    {
        if (!is_string($path) || $path === '' || $path[0] !== '/' || strlen($path) > 1000 || str_contains($path, '..') || str_contains($path, "\0")) {
            Response::json(400, ['error' => 'Ungültiger Pfad']);
            return false;
        }
        return true;
    }

    private function flag($value): bool
    {
        return $value === true || $value === 1 || $value === '1' || $value === 'true';
    }
}
