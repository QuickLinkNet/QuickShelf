<?php
declare(strict_types=1);

/**
 * Dependency-free smoke tests for the API services:  php api/tests/run.php
 * Builds a throw-away archive in the temp folder, indexes it and checks the analytics against known numbers.
 */

foreach (['core/Request', 'core/Response', 'utils/Path', 'services/FileTypes', 'services/TextExtractor', 'services/OcrService', 'services/IndexService',
    'services/AuthService', 'services/Requirements', 'services/FilesService', 'services/StatsService', 'services/InsightsService', 'services/MetaService'] as $file) {
    require __DIR__ . '/../' . $file . '.php';
}

$failed = 0;
$total = 0;
function check(string $name, bool $ok, string $detail = ''): void
{
    global $failed, $total;
    $total++;
    if (!$ok) {
        $failed++;
    }
    echo ($ok ? '  ok   ' : '  FAIL ') . $name . ($ok || $detail === '' ? '' : "  -> $detail") . "\n";
}

// ---- fixture ---------------------------------------------------------------------------------
$base = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'nas_test_' . bin2hex(random_bytes(4));
$root = $base . DIRECTORY_SEPARATOR . 'archive';
$idx = $base . DIRECTORY_SEPARATOR . 'index';
mkdir($root, 0777, true);
$put = function (string $rel, string $content, ?int $mtime = null) use ($root): void {
    $full = $root . '/' . $rel;
    @mkdir(dirname($full), 0777, true);
    file_put_contents($full, $content);
    if ($mtime !== null) {
        touch($full, $mtime);
    }
};
$big = str_repeat('x', 60000);
$put('01_Dokumente/Steuer/2025-01-01_Bescheid.txt', 'Einkommensteuer Bescheid', strtotime('2025-01-01 12:00'));
$put('01_Dokumente/Steuer/Kopie.txt', $big, strtotime('2025-02-01 12:00'));
$put('01_Dokumente/Archiv/Kopie.txt', $big, strtotime('2025-02-02 12:00'));      // duplicate (same name + size)
$put('02_Fotos/IMG_1234.jpg', str_repeat('j', 1000), strtotime('2024-07-14 12:00'));
$put('02_Fotos/Urlaub/DSC_0001.jpg', str_repeat('k', 1000), strtotime('2023-07-14 12:00'));
$put('02_Fotos/Screenshot 2026-01-01.png', 'png', strtotime('2026-01-01 12:00'));
$put('99_Eingang/offen.pdf', '%PDF-1.4', strtotime('2026-02-02 12:00'));
$put('99_Eingang/(1) test (1).txt', 'x');
mkdir($root . '/Leer/Unterordner', 0777, true);

$index = new IndexService($root, $idx, [], new OcrService(false, ''));
$guard = 0;
do {
    $r = $index->rebuild();
} while (($r['done'] ?? true) === false && ++$guard < 20);

// ---- index + stats ---------------------------------------------------------------------------
echo "Index & Statistik\n";
$stats = new StatsService($index);
$ov = $stats->overview();
check('Dateien gezählt', $ov['totals']['files'] === 8, (string) $ov['totals']['files']);
check('Bereiche erkannt', count($ov['areas']) === 3, json_encode(array_column($ov['areas'], 'name')));
$areas = array_column($ov['areas'], 'files', 'name');
check('Bereich 01_Dokumente hat 3 Dateien', ($areas['01_Dokumente'] ?? 0) === 3);
check('Dateitypen gruppiert', in_array('Bilder', array_column($ov['types'], 'label'), true));
check('Neueste Datei zuerst', ($ov['recent'][0]['name'] ?? '') === 'offen.pdf' || ($ov['recent'][0]['name'] ?? '') === '(1) test (1).txt');

$folder = $stats->folder('/01_Dokumente');
check('Ordnerzusammenfassung', $folder['files'] === 3 && count($folder['children']) === 2, json_encode($folder['children']));
check('Leere Ordner erscheinen als Unterordner', count($stats->folder('')['children']) === 4);

$day = $stats->day('2025-01-01');
check('Tagesabfrage findet Datei', $day['total'] === 1 && $day['items'][0]['name'] === '2025-01-01_Bescheid.txt');
$mem = $stats->onThisDay('07-14', 10, '/02_Fotos');
check('"An diesem Tag" findet Fotos früherer Jahre', count($mem['items']) === 2, (string) count($mem['items']));
check('Nicht-Bilder bleiben draußen', $stats->onThisDay('01-01', 10)['items'] === []);
check('Key-Range deckt Nachkommen ab', StatsService::range('/a') === ['/a/', '/a0']);

// ---- insights --------------------------------------------------------------------------------
echo "Aufräum-Analyse\n";
$ins = new InsightsService($index, []);
$sum = $ins->summary('');
$names = array_column($sum['names'], 'count', 'key');
check('Kamera-Namen erkannt (IMG_, DSC_)', ($names['kamera'] ?? 0) === 2, json_encode($names));
check('Screenshot erkannt', ($names['screenshot'] ?? 0) === 1);
check('Kopien erkannt', ($names['kopie'] ?? 0) >= 1);
check('Leere Ordner gezählt', $sum['empty_dirs'] === 2, (string) $sum['empty_dirs']);
check('Eingang gezählt', $sum['inbox_files'] === 2, (string) $sum['inbox_files']);
check('Score liegt in 0..100', $sum['score'] >= 0 && $sum['score'] <= 100);
$dups = $ins->duplicates('', 1024, 10, 0);
check('Dublette gefunden', count($dups['groups']) === 1 && $dups['groups'][0]['count'] === 2, json_encode($dups['stats']));
check('Verschwendung korrekt', ($dups['groups'][0]['wasted'] ?? 0) === 60000);
$ins->setSkip(['01_Dokumente']);
check('Ignorierter Bereich zählt nicht', $ins->duplicates('', 1024, 10, 0)['groups'] === []);
$ins->setSkip([]);
check('Hash-Prüfung erkennt gleichen Inhalt', count(array_unique($ins->verify([
    'a' => $root . '/01_Dokumente/Steuer/Kopie.txt', 'b' => $root . '/01_Dokumente/Archiv/Kopie.txt',
]))) === 1);

// ---- meta ------------------------------------------------------------------------------------
echo "Merkliste\n";
$meta = new MetaService($idx);
$meta->setFavorite('/a.pdf', true);
$meta->setTag('/a.pdf', '  Steuer  2025 ', true);
$meta->setNote('/a.pdf', 'Frist 31.03.');
$meta->view('/a.pdf');
$m = $meta->get('/a.pdf');
check('Favorit gesetzt', $m['favorite'] === true);
check('Tag normalisiert', $m['tags'] === ['Steuer 2025'], json_encode($m['tags']));
check('Notiz gespeichert', $m['note'] === 'Frist 31.03.' && $m['views'] === 1);
check('Relink verschiebt alles', $meta->relink('/a.pdf', '/b.pdf') >= 3 && $meta->get('/b.pdf')['favorite'] === true && $meta->get('/a.pdf')['favorite'] === false);
$id = $meta->saveSearch('Rechnungen', ['q' => 'rechnung']);
check('Suche gespeichert', count($meta->searches()) === 1 && $meta->searches()[0]['params']['q'] === 'rechnung');
$meta->deleteSearch($id);
check('Suche gelöscht', $meta->searches() === []);
$meta->setNote('/b.pdf', '');
check('Leere Notiz entfernt', $meta->get('/b.pdf')['note'] === '');

// ---- organise (write mode) -------------------------------------------------------------------
echo "Verschieben & Index\n";
$files = new FilesService($root, [], $index);
$moved = $files->move('/99_Eingang/offen.pdf', '/01_Dokumente/offen.pdf');
check('Datei verschoben', ($moved['path'] ?? '') === '/01_Dokumente/offen.pdf' && is_file($root . '/01_Dokumente/offen.pdf'), json_encode($moved));
$index->relocate('/99_Eingang/offen.pdf', '/01_Dokumente/offen.pdf');
check('Index folgt der Datei', $stats->folder('/01_Dokumente')['files'] === 4 && $stats->folder('/99_Eingang')['files'] === 1);
check('Vorhandene Datei wird nie überschrieben', ($files->move('/01_Dokumente/offen.pdf', '/01_Dokumente/Steuer/Kopie.txt')['error'] ?? '') === 'Target already exists');
check('Ordner nicht in sich selbst', isset($files->move('/01_Dokumente', '/01_Dokumente/Steuer/x')['error']));
check('Ausbruch im Zielpfad verboten', isset($files->move('/01_Dokumente/offen.pdf', '/01_Dokumente/../x.pdf')['error']));
$dirMove = $files->move('/02_Fotos/Urlaub', '/02_Fotos/Reisen');
$index->relocate('/02_Fotos/Urlaub', '/02_Fotos/Reisen');
check('Ordner umbenannt', isset($dirMove['path']) && is_dir($root . '/02_Fotos/Reisen'), json_encode($dirMove));
check('Index folgt dem ganzen Ordner', $stats->folder('/02_Fotos/Reisen')['files'] === 1 && $stats->folder('/02_Fotos')['files'] === 3);
check('Suche findet neuen Pfad', ($index->query(['query' => 'dsc_0001', 'kind' => 'file', 'pathMatch' => true])['items'][0]['path'] ?? '') === '/02_Fotos/Reisen/DSC_0001.jpg');
$index->addDir('/02_Fotos/Neu');
check('Neuer Ordner im Index', in_array('Neu', array_column($stats->folder('/02_Fotos')['children'], 'name'), true));
$id = $meta->logMove('/a', '/b');
check('Verschieben wird protokolliert', $meta->moves(5)[0]['id'] === $id && $meta->move($id)['undone'] === false);
$meta->markUndone($id);
check('Rückgängig-Markierung', $meta->move($id)['undone'] === true);

// ---- paths -----------------------------------------------------------------------------------
echo "Pfadsicherheit\n";
check('Pfad innerhalb erlaubt', Path::resolve($root, '/01_Dokumente') !== null);
check('Ausbruch mit .. blockiert', Path::resolve($root, '/../index') === null);
check('Ausgeblendeter Ordner blockiert', Path::resolve($root, '/99_Eingang', ['99_Eingang']) === null);
check('Dateityp-Gruppen', FileTypes::group('PDF') === 'dokumente' && FileTypes::group('xyz') === 'sonstiges');

// ---- login -----------------------------------------------------------------------------------
echo "Login
";
$authDir = $base . DIRECTORY_SEPARATOR . 'auth';
$auth = new AuthService($authDir);
check('ohne Einrichtung kein Zugang', !$auth->isSetUp() && !$auth->validToken('v1.1.1.abc'));
check('zu kurzes Passwort abgelehnt', $auth->setup('kurz') !== null);
check('Einrichtung klappt', $auth->setup('geheim-genug') === null && $auth->isSetUp());
check('zweite Einrichtung blockiert', $auth->setup('anderes-passwort') !== null);
check('richtiges Passwort', $auth->login('geheim-genug', 'c1')['ok'] === true);
check('falsches Passwort', $auth->login('falsch', 'c1')['ok'] === false);
$token = $auth->issueToken();
check('Token gültig', $auth->validToken($token));
check('Token manipuliert', !$auth->validToken(substr($token, 0, -2) . 'xx'));
check('Token abgelaufen', !$auth->validToken($auth->issueToken(time() - 90 * 86400)));
for ($i = 0; $i < 6; $i++) {
    $auth->login('falsch', 'c2');
}
$locked = $auth->login('geheim-genug', 'c2');
check('Sperre nach Fehlversuchen', $locked['ok'] === false && ($locked['retry'] ?? 0) > 0);
check('andere Adresse nicht gesperrt', $auth->login('geheim-genug', 'c3')['ok'] === true);
check('Passwortwechsel prüft das alte', $auth->change('falsch', 'neues-passwort-1', 'c4') !== null);
check('Passwortwechsel klappt', $auth->change('geheim-genug', 'neues-passwort-1', 'c4') === null);
check('Wechsel meldet alte Sitzungen ab', !$auth->validToken($token));
$again = new AuthService($authDir);
check('Passwort bleibt gespeichert', $again->login('neues-passwort-1', 'c5')['ok'] === true);
check('Login abschaltbar', (new AuthService($authDir . '_off', false))->authenticated());

// ---- requirements ----------------------------------------------------------------------------
$req = Requirements::run($authDir);
$byId = array_column($req, null, 'id');
check('Voraussetzungen: PHP und Datenordner ok', $byId['php']['ok'] && $byId['data']['ok'] && !Requirements::blocking($req));
$bad = Requirements::run(__FILE__ . DIRECTORY_SEPARATOR . 'nope');
check('Voraussetzungen: nicht beschreibbarer Ordner blockiert', Requirements::blocking($bad) && $bad[3]['hint'] !== '');

// ---- cleanup ---------------------------------------------------------------------------------
$rm = function (string $dir) use (&$rm): void {
    foreach (scandir($dir) ?: [] as $e) {
        if ($e === '.' || $e === '..') {
            continue;
        }
        $p = $dir . DIRECTORY_SEPARATOR . $e;
        is_dir($p) ? $rm($p) : @unlink($p);
    }
    @rmdir($dir);
};
unset($index, $meta);
gc_collect_cycles();
$rm($base);

echo "\n" . ($total - $failed) . "/$total Tests bestanden\n";
exit($failed > 0 ? 1 : 0);
