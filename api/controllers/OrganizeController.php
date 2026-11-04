<?php
declare(strict_types=1);

/**
 * Moving, renaming and creating folders – only available when the API runs with READ_ONLY=0.
 * Every move is logged (and can be undone), the search index and the personal annotations follow the file.
 */
class OrganizeController
{
    private FilesService $files;
    private IndexService $index;
    private MetaService $meta;
    private bool $readOnly;

    public function __construct(FilesService $files, IndexService $index, MetaService $meta, bool $readOnly)
    {
        $this->files = $files;
        $this->index = $index;
        $this->meta = $meta;
        $this->readOnly = $readOnly;
    }

    public function move(Request $request): void
    {
        if ($this->denied()) {
            return;
        }
        $from = $this->clean((string) $request->input('from', ''));
        $to = $this->clean((string) $request->input('to', ''));
        if ($from === '' || $to === '') {
            Response::json(400, ['error' => 'Missing from/to']);
            return;
        }
        Response::json(...$this->perform($from, $to));
    }

    /** Renames within the same folder. */
    public function rename(Request $request): void
    {
        if ($this->denied()) {
            return;
        }
        $path = $this->clean((string) $request->input('path', ''));
        $name = trim((string) $request->input('name', ''));
        if ($path === '' || $name === '' || preg_match('#[/\\\\:*?"<>|]#', $name) === 1 || $name === '.' || $name === '..') {
            Response::json(400, ['error' => 'Ungültiger Name']);
            return;
        }
        $dir = dirname($path);
        Response::json(...$this->perform($path, ($dir === '/' || $dir === '.' ? '' : $dir) . '/' . $name));
    }

    public function mkdir(Request $request): void
    {
        if ($this->denied()) {
            return;
        }
        $path = $this->clean((string) $request->input('path', ''));
        if ($path === '') {
            Response::json(400, ['error' => 'Missing path']);
            return;
        }
        $result = $this->files->mkdir($path);
        if (isset($result['error'])) {
            Response::json(400, $result);
            return;
        }
        $this->index->addDir($result['path']);
        Response::json(201, $result);
    }

    public function moves(Request $request): void
    {
        Response::json(200, ['items' => $this->meta->moves((int) $request->input('limit', '30'))]);
    }

    public function undo(Request $request): void
    {
        if ($this->denied()) {
            return;
        }
        $move = $this->meta->move((int) $request->input('id', '0'));
        if ($move === null || $move['undone']) {
            Response::json(404, ['error' => 'Nichts zum Rückgängigmachen']);
            return;
        }
        $result = $this->files->move($move['to'], $move['from']);
        if (isset($result['error'])) {
            Response::json(409, ['error' => 'Rückgängig nicht möglich: ' . $result['error']]);
            return;
        }
        $this->index->relocate($move['to'], $move['from']);
        $this->meta->relink($move['to'], $move['from']);
        $this->meta->markUndone($move['id']);
        Response::json(200, ['path' => $move['from']]);
    }

    /** @return array{0:int,1:array} */
    private function perform(string $from, string $to): array
    {
        $parent = dirname($to);
        if ($parent !== '/' && $parent !== '.' && $this->files->stat($parent) === null) {
            return [400, ['error' => 'Zielordner existiert nicht']];
        }
        $result = $this->files->move($from, $to);
        if (isset($result['error'])) {
            return [400, $result];
        }
        $this->index->relocate($from, $result['path']);
        $this->meta->relink($from, $result['path']);
        return [200, $result + ['move_id' => $this->meta->logMove($from, $result['path'])]];
    }

    private function clean(string $path): string
    {
        $path = '/' . trim(str_replace('\\', '/', $path), '/');
        return $path === '/' || str_contains($path, "\0") ? '' : $path;
    }

    private function denied(): bool
    {
        if ($this->readOnly) {
            Response::json(403, ['error' => 'Read-only mode']);
            return true;
        }
        return false;
    }
}
