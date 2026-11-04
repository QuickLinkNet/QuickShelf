<?php

$config = require __DIR__ . '/config/config.php';

require __DIR__ . '/core/Request.php';
require __DIR__ . '/core/Response.php';
require __DIR__ . '/core/Router.php';
require __DIR__ . '/utils/Path.php';
require __DIR__ . '/services/AuthService.php';
require __DIR__ . '/services/Requirements.php';
require __DIR__ . '/services/FileTypes.php';
require __DIR__ . '/services/TextExtractor.php';
require __DIR__ . '/services/OcrService.php';
require __DIR__ . '/services/IndexService.php';
require __DIR__ . '/services/FilesService.php';
require __DIR__ . '/services/StatsService.php';
require __DIR__ . '/services/InsightsService.php';
require __DIR__ . '/services/MetaService.php';
require __DIR__ . '/services/ThumbService.php';
require __DIR__ . '/services/ZipService.php';
require __DIR__ . '/services/SystemService.php';
require __DIR__ . '/controllers/AuthController.php';
require __DIR__ . '/controllers/FilesController.php';
require __DIR__ . '/controllers/InsightsController.php';
require __DIR__ . '/controllers/MetaController.php';
require __DIR__ . '/controllers/MediaController.php';
require __DIR__ . '/controllers/OrganizeController.php';

$corsOrigin = $config['cors_origin'] ?? '*';
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Range, Authorization');
header('Access-Control-Expose-Headers: Content-Range, Accept-Ranges, Content-Length');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$basePath = rtrim(str_replace('index.php', '', $scriptName), '/');
$basePath = $basePath === '' ? '' : $basePath . '/';

$request = Request::fromGlobals('/' . ltrim($basePath, '/'));

// Login gate: everything except the auth/setup endpoints needs a valid session.
$auth = new AuthService($config['index_dir'], $config['auth_enabled']);
if ((new AuthController($auth, $config))->handle($request)) {
    exit;
}
if ($request->path !== '/' && !$auth->authenticated()) {
    $setup = !$auth->isSetUp();
    Response::json($setup ? 403 : 401, ['error' => $setup ? 'Das Archiv ist noch nicht eingerichtet.' : 'Bitte anmelden.', 'code' => $setup ? 'setup' : 'auth']);
    exit;
}

TextExtractor::$pdfText = $config['pdf_text'];
$ocrService = new OcrService($config['ocr_enabled'], $config['ocr_url']);
$indexService = new IndexService($config['data_root'], $config['index_dir'], $config['exclude'], $ocrService);
$filesService = new FilesService($config['data_root'], $config['exclude'], $indexService);
$statsService = new StatsService($indexService);
$insightsService = new InsightsService($indexService, $config['exclude']);
$metaService = new MetaService($config['index_dir']);
$thumbService = new ThumbService($config['index_dir'], $config['data_root'], $config['exclude']);
$zipService = new ZipService($config['data_root'], $config['exclude']);
$systemService = new SystemService($config['data_root'], $config, $indexService, $thumbService, $zipService);

$filesController = new FilesController($filesService, $indexService, $config['read_only']);
$insightsController = new InsightsController($statsService, $insightsService, $systemService, $filesService, $indexService);
$metaController = new MetaController($metaService, $filesService);
$organizeController = new OrganizeController($filesService, $indexService, $metaService, $config['read_only']);
$mediaController = new MediaController($filesService, $thumbService, $zipService, $indexService);

$router = new Router();
$router->add('GET', '/', function () {
    Response::json(200, ['status' => 'ok']);
});
// Files (archive)
$router->add('GET', '/list', [$filesController, 'list']);
$router->add('GET', '/download', [$filesController, 'download']);
$router->add('GET', '/stat', [$filesController, 'stat']);
$router->add('POST', '/upload', [$filesController, 'upload']);
$router->add('POST', '/mkdir', [$organizeController, 'mkdir']);
$router->add('POST', '/move', [$organizeController, 'move']);
$router->add('POST', '/rename', [$organizeController, 'rename']);
$router->add('GET', '/moves', [$organizeController, 'moves']);
$router->add('POST', '/moves/undo', [$organizeController, 'undo']);
$router->add('POST', '/delete', [$filesController, 'delete']);
$router->add('GET', '/search', [$filesController, 'search']);
$router->add('GET', '/index/status', [$filesController, 'indexStatus']);
$router->add('POST', '/index/rebuild', [$filesController, 'indexRebuild']);
// Media
$router->add('GET', '/thumb', [$mediaController, 'thumb']);
$router->add('GET', '/zip', [$mediaController, 'zip']);
$router->add('POST', '/thumbs/warm', [$mediaController, 'warm']);
// Analytics (index based)
$router->add('GET', '/overview', [$insightsController, 'overview']);
$router->add('GET', '/folder', [$insightsController, 'folder']);
$router->add('GET', '/heatmap', [$insightsController, 'heatmap']);
$router->add('GET', '/day', [$insightsController, 'day']);
$router->add('GET', '/changes', [$insightsController, 'changes']);
$router->add('GET', '/memories', [$insightsController, 'memories']);
$router->add('GET', '/insights/summary', [$insightsController, 'summary']);
$router->add('GET', '/insights/names', [$insightsController, 'names']);
$router->add('GET', '/insights/large', [$insightsController, 'large']);
$router->add('GET', '/insights/noext', [$insightsController, 'noExtension']);
$router->add('GET', '/insights/deep', [$insightsController, 'deepPaths']);
$router->add('GET', '/insights/empty', [$insightsController, 'emptyDirs']);
$router->add('GET', '/insights/duplicates', [$insightsController, 'duplicates']);
$router->add('POST', '/insights/verify', [$insightsController, 'verify']);
$router->add('GET', '/system', [$insightsController, 'system']);
// Personal annotations (stored outside the archive, allowed in read-only mode)
$router->add('GET', '/meta', [$metaController, 'get']);
$router->add('GET', '/meta/favorites', [$metaController, 'favorites']);
$router->add('GET', '/meta/recent', [$metaController, 'recent']);
$router->add('GET', '/meta/tags', [$metaController, 'tags']);
$router->add('GET', '/meta/notes', [$metaController, 'notes']);
$router->add('GET', '/meta/searches', [$metaController, 'searches']);
$router->add('GET', '/meta/export', [$metaController, 'export']);
$router->add('POST', '/meta/favorite', [$metaController, 'favorite']);
$router->add('POST', '/meta/tag', [$metaController, 'tag']);
$router->add('POST', '/meta/note', [$metaController, 'note']);
$router->add('POST', '/meta/view', [$metaController, 'view']);
$router->add('POST', '/meta/search', [$metaController, 'saveSearch']);
$router->add('POST', '/meta/search/delete', [$metaController, 'deleteSearch']);
$router->add('POST', '/meta/relink', [$metaController, 'relink']);

$router->dispatch($request);
