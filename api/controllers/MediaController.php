<?php
declare(strict_types=1);

/** Thumbnails and ZIP downloads. */
class MediaController
{
    private FilesService $files;
    private ThumbService $thumbs;
    private ZipService $zip;
    private IndexService $index;

    public function __construct(FilesService $files, ThumbService $thumbs, ZipService $zip, IndexService $index)
    {
        $this->files = $files;
        $this->thumbs = $thumbs;
        $this->zip = $zip;
        $this->index = $index;
    }

    /** POST /thumbs/warm {scope, width, after}: pre-generates thumbnails in short slices. */
    public function warm(Request $request): void
    {
        if (!$this->thumbs->available() || !$this->index->ready()) {
            Response::json(503, ['error' => 'Thumbnails oder Index nicht verfügbar']);
            return;
        }
        @set_time_limit(60);
        $body = array_merge($request->query, $request->json());
        $result = $this->thumbs->warm(
            $this->index,
            is_string($body['scope'] ?? null) ? $body['scope'] : '',
            (int) ($body['width'] ?? 320),
            is_string($body['after'] ?? null) ? $body['after'] : '',
            8.0
        );
        Response::json(200, $result);
    }

    public function thumb(Request $request): void
    {
        $file = $this->files->resolveFile((string) $request->input('path', ''));
        if ($file === null) {
            Response::json(404, ['error' => 'File not found']);
            return;
        }
        if (!$this->thumbs->send($file, (int) $request->input('w', '320'))) {
            Response::json(404, ['error' => 'No thumbnail']);
        }
    }

    /** GET /zip?paths[]=/Ordner&paths[]=/Datei.pdf&name=Steuer-2025 */
    public function zip(Request $request): void
    {
        $paths = $request->query['paths'] ?? [];
        $paths = is_array($paths) ? array_filter($paths, 'is_string') : [];
        $single = $request->input('path', '');
        if ($single !== null && $single !== '') {
            $paths[] = $single;
        }
        if ($paths === [] || count($paths) > 200) {
            Response::json(400, ['error' => 'Keine oder zu viele Pfade']);
            return;
        }
        $name = (string) $request->input('name', 'archiv');
        $result = $this->zip->send(array_values($paths), $name);
        if (isset($result['error'])) {
            Response::json($result['status'] ?? 400, ['error' => $result['error']]);
        }
    }
}
