<?php
declare(strict_types=1);

function load_env(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $vars = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return [];
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }
        $key = trim($parts[0]);
        $value = trim($parts[1]);
        if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
            $value = trim($value, "\"'");
        }
        $vars[$key] = $value;
    }
    return $vars;
}

$env = load_env(__DIR__ . '/../.env');
// Real environment variables win over the .env file (handy for dev servers and Docker).
foreach (['DATA_ROOT', 'CORS_ORIGIN', 'OCR_ENABLED', 'OCR_URL', 'READ_ONLY', 'EXCLUDE', 'INDEX_DIR', 'PDF_TEXT', 'AUTH'] as $key) {
    $fromProcess = getenv($key);
    if ($fromProcess !== false && $fromProcess !== '') {
        $env[$key] = $fromProcess;
    }
}
// Search index, personal data, login and the settings from the setup wizard live next to the API, never inside the archive.
$indexDir = $env['INDEX_DIR'] ?? (__DIR__ . '/../data');
$settingsFile = rtrim($indexDir, '/\\') . DIRECTORY_SEPARATOR . 'settings.json';
$saved = is_file($settingsFile) ? json_decode((string) file_get_contents($settingsFile), true) : null;
$saved = is_array($saved) ? $saved : [];
// .env / real environment variables win; the wizard only fills what they leave open.
$dataRootLocked = isset($env['DATA_ROOT']);
foreach (['DATA_ROOT' => 'data_root', 'READ_ONLY' => 'read_only', 'EXCLUDE' => 'exclude'] as $envKey => $savedKey) {
    if (!isset($env[$envKey]) && isset($saved[$savedKey]) && is_scalar($saved[$savedKey])) {
        $env[$envKey] = (string) $saved[$savedKey];
    }
}
$dataRoot = $env['DATA_ROOT'] ?? (__DIR__ . '/../data');
if (!preg_match('/^([A-Za-z]:[\\\\\\/]|\\/)/', $dataRoot)) {
    $dataRoot = __DIR__ . '/../' . $dataRoot;
}
$corsOrigin = $env['CORS_ORIGIN'] ?? '*';
$ocrEnabled = ($env['OCR_ENABLED'] ?? '0') === '1';
$ocrUrl = $env['OCR_URL'] ?? '';
// Default is read-only: the dashboard only mirrors the folder tree.
$readOnly = ($env['READ_ONLY'] ?? '1') !== '0';
// Top-level folders that are hidden from listing, search and download.
$exclude = array_values(array_filter(array_map('trim', explode(',', $env['EXCLUDE'] ?? 'Keys'))));
$pdfText = ($env['PDF_TEXT'] ?? '1') !== '0';

return [
    'data_root' => $dataRoot,
    'cors_origin' => $corsOrigin,
    'ocr_enabled' => $ocrEnabled,
    'ocr_url' => $ocrUrl,
    'read_only' => $readOnly,
    'exclude' => $exclude,
    'index_dir' => $indexDir,
    'pdf_text' => $pdfText,
    // AUTH=0 switches the login off (only sensible inside a trusted home network).
    'auth_enabled' => ($env['AUTH'] ?? '1') !== '0',
    'settings_file' => $settingsFile,
    'data_root_locked' => $dataRootLocked,
];
