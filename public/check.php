<?php
/**
 * QuickShelf system check - open  http://your-nas/archiv/check.php  BEFORE the setup wizard.
 * Written for any PHP version (also very old ones), so it can tell you when PHP is too old.
 * Shows nothing about your files. Delete it when you are done if you like.
 */
$de = isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) && strtolower(substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2)) === 'de';
function tr($de, $en, $isDe) { return $isDe ? $de : $en; }

$data = dirname(__FILE__) . '/api/data';
if (!is_dir($data)) { @mkdir($data, 0775, true); }
$rows = array(
    array(tr('PHP 8.0 oder neuer', 'PHP 8.0 or newer', $de), version_compare(PHP_VERSION, '8.0.0', '>='), true, PHP_VERSION,
        tr('Installiere PHP 8.0 oder neuer (Synology: Paketzentrum).', 'Install PHP 8.0 or newer (Synology: Package Center).', $de)),
    array('SQLite (pdo_sqlite)', extension_loaded('pdo_sqlite'), true, '',
        tr('Aktiviere die PHP-Erweiterung pdo_sqlite.', 'Enable the PHP extension pdo_sqlite.', $de)),
    array('mbstring', extension_loaded('mbstring'), true, '',
        tr('Aktiviere die PHP-Erweiterung mbstring.', 'Enable the PHP extension mbstring.', $de)),
    array(tr('Schreibrechte auf api/data', 'Write access to api/data', $de), is_dir($data) && is_writable($data), true, '',
        tr('Gib dem Webserver-Benutzer (Synology: http) Schreibrechte auf api/data.', 'Give the web-server user (Synology: http) write access to api/data.', $de)),
    array(tr('Vorschaubilder (gd)', 'Thumbnails (gd)', $de), extension_loaded('gd'), false, '',
        tr('Optional: aktiviere die Erweiterung gd.', 'Optional: enable the extension gd.', $de)),
    array(tr('ZIP-Download (zip)', 'ZIP download (zip)', $de), extension_loaded('zip'), false, '',
        tr('Optional: aktiviere die Erweiterung zip.', 'Optional: enable the extension zip.', $de)),
    array(tr('Foto-Ausrichtung (exif)', 'Photo orientation (exif)', $de), function_exists('exif_read_data'), false, '',
        tr('Optional: aktiviere die Erweiterung exif.', 'Optional: enable the extension exif.', $de)),
);
$blocked = false;
foreach ($rows as $r) { if ($r[2] && !$r[1]) { $blocked = true; } }
$h = function ($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
?><!doctype html>
<html lang="<?php echo $de ? 'de' : 'en'; ?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QuickShelf – <?php echo tr('Systemprüfung', 'System check', $de); ?></title>
<style>
body{font:16px/1.5 system-ui,Segoe UI,sans-serif;background:#0b1020;color:#e5e7eb;margin:0;padding:24px}
main{max-width:560px;margin:0 auto;background:#141a33;border-radius:16px;padding:24px}
h1{font-size:22px;margin:0 0 4px}p.s{margin:0 0 18px;color:#a5b4fc}
.r{display:flex;gap:10px;padding:10px 0;border-top:1px solid #232b52}.i{font-weight:700;width:1.2em}
.ok .i{color:#34d399}.no .i{color:#f87171}.opt .i{color:#fbbf24}.h{color:#9ca3af;font-size:14px}
.v{padding:12px 14px;border-radius:10px;margin-top:16px}.v.good{background:#064e3b}.v.bad{background:#7f1d1d}
</style></head><body><main>
<h1>QuickShelf – <?php echo tr('Systemprüfung', 'System check', $de); ?></h1>
<p class="s"><?php echo tr('Prüft, ob dein Server bereit ist.', 'Checks whether your server is ready.', $de); ?></p>
<?php foreach ($rows as $r): $cls = $r[1] ? 'ok' : ($r[2] ? 'no' : 'opt'); ?>
<div class="r <?php echo $cls; ?>"><span class="i"><?php echo $r[1] ? '✓' : ($r[2] ? '✗' : '!'); ?></span><div>
<?php echo $h($r[0]); ?><?php if ($r[3] !== '') { echo ' <span class="h">(' . $h($r[3]) . ')</span>'; } ?>
<?php if (!$r[1]) { echo '<div class="h">' . $h($r[4]) . '</div>'; } ?></div></div>
<?php endforeach; ?>
<?php if ($blocked): ?>
<div class="v bad"><?php echo tr('Es fehlt noch etwas Wichtiges (✗). Behebe das und lade die Seite neu.', 'Something required is missing (✗). Fix it and reload this page.', $de); ?></div>
<?php else: ?>
<div class="v good"><?php echo tr('Alles bereit. Öffne jetzt die Startseite – der Einrichtungsassistent führt dich weiter.', 'All set. Open the start page now – the setup wizard takes it from there.', $de); ?> <a style="color:#fff" href="./"><?php echo tr('Zur Startseite', 'Start page', $de); ?></a></div>
<?php endif; ?>
</main></body></html>
