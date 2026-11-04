<?php
declare(strict_types=1);

class FilesController
{
    private const FILTER_KEYS = ['name', 'ext', 'type', 'from', 'to', 'minSize', 'maxSize', 'sort', 'order', 'scope', 'inpath', 'limit', 'offset'];

    private FilesService $service;
    private IndexService $index;
    private bool $readOnly;

    public function __construct(FilesService $service, IndexService $index, bool $readOnly)
    {
        $this->service = $service;
        $this->index = $index;
        $this->readOnly = $readOnly;
    }

    public function list(Request $request): void
    {
        $result = $this->service->list($request->input('path', '/'), $this->filters($request));
        if (isset($result['error'])) {
            Response::json(404, $result);
            return;
        }
        Response::json(200, $result);
    }

    public function download(Request $request): void
    {
        $path = $request->input('path', '');
        $file = $this->service->resolveFile($path);
        if ($file === null) {
            Response::json(404, ['error' => 'File not found']);
            return;
        }
        Response::file($file, $path, $request->input('inline', '0') === '1');
    }

    /** Cheap existence check so the UI can tell "moved or renamed" from other errors. */
    public function stat(Request $request): void
    {
        $item = $this->service->stat($request->input('path', ''));
        if ($item === null) {
            Response::json(404, ['error' => 'File not found']);
            return;
        }
        Response::json(200, $item);
    }

    public function search(Request $request): void
    {
        $content = in_array($request->input('content', '0'), ['1', 'true'], true);
        $result = $this->service->search($request->input('query', ''), $this->filters($request), $content);
        Response::json(200, $result);
    }

    public function indexStatus(Request $request): void
    {
        Response::json(200, $this->index->status() + ['read_only' => $this->readOnly]);
    }

    /** Rebuilds the search cache. Only writes to the index file, so it is allowed in read-only mode. */
    public function indexRebuild(Request $request): void
    {
        $result = $this->index->rebuild();
        Response::json(isset($result['error']) ? 500 : 200, $result);
    }

    public function upload(Request $request): void
    {
        if ($this->denyWrite()) {
            return;
        }
        if (!isset($_FILES['file'])) {
            Response::json(400, ['error' => 'Missing file']);
            return;
        }
        $result = $this->service->upload($_FILES['file'], $request->input('path', '/'));
        $this->respond($result, 201);
    }

    public function mkdir(Request $request): void
    {
        if ($this->denyWrite()) {
            return;
        }
        $path = $request->input('path', '');
        if ($path === '') {
            Response::json(400, ['error' => 'Missing path']);
            return;
        }
        $this->respond($this->service->mkdir($path), 201);
    }

    public function move(Request $request): void
    {
        if ($this->denyWrite()) {
            return;
        }
        $from = $request->input('from', '');
        $to = $request->input('to', '');
        if ($from === '' || $to === '') {
            Response::json(400, ['error' => 'Missing from/to']);
            return;
        }
        $this->respond($this->service->move($from, $to), 200);
    }

    public function delete(Request $request): void
    {
        if ($this->denyWrite()) {
            return;
        }
        $path = $request->input('path', '');
        if ($path === '') {
            Response::json(400, ['error' => 'Missing path']);
            return;
        }
        $this->respond($this->service->delete($path), 200);
    }

    private function filters(Request $request): array
    {
        $filters = [];
        foreach (self::FILTER_KEYS as $key) {
            $value = $request->input($key, '');
            if ($value !== null && $value !== '') {
                $filters[$key] = $value;
            }
        }
        return $filters;
    }

    private function denyWrite(): bool
    {
        if ($this->readOnly) {
            Response::json(403, ['error' => 'Read-only mode']);
            return true;
        }
        return false;
    }

    private function respond(array $result, int $okStatus): void
    {
        Response::json(isset($result['error']) ? 400 : $okStatus, $result);
    }
}
