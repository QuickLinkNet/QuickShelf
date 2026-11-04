<?php
declare(strict_types=1);

/** Server requirements for the setup wizard: what is installed, what is missing and what to do about it. */
class Requirements
{
    /** @return list<array{id:string,label:string,ok:bool,required:bool,value:string,hint:string}> */
    public static function run(string $dataDir): array
    {
        $rows = [
            self::row('php', 'PHP 8.0 oder neuer', version_compare(PHP_VERSION, '8.0.0', '>='), true, PHP_VERSION, 'Installiere PHP 8.0 oder neuer (Synology: Paketzentrum → PHP 8.x).'),
            self::row('sqlite', 'SQLite (pdo_sqlite)', extension_loaded('pdo_sqlite'), true, '', 'Aktiviere die PHP-Erweiterung pdo_sqlite (Synology: Web Station → PHP-Profil → Erweiterungen).'),
            self::row('mbstring', 'mbstring', extension_loaded('mbstring'), true, '', 'Aktiviere die PHP-Erweiterung mbstring.'),
            self::row('data', 'Schreibrechte auf api/data', self::writable($dataDir), true, '', 'Gib dem Webserver-Benutzer (Synology: http) Schreibrechte auf den Ordner api/data.'),
            self::row('gd', 'Vorschaubilder (gd)', extension_loaded('gd'), false, '', 'Ohne gd gibt es keine Vorschaubilder. Aktiviere die PHP-Erweiterung gd.'),
            self::row('zip', 'ZIP-Download (zip)', extension_loaded('zip'), false, '', 'Ohne zip ist der ZIP-Download aus. Aktiviere die PHP-Erweiterung zip.'),
            self::row('exif', 'Foto-Ausrichtung (exif)', function_exists('exif_read_data'), false, '', 'Ohne exif werden gedrehte Fotos nicht automatisch aufgerichtet. Aktiviere die PHP-Erweiterung exif.'),
        ];
        return $rows;
    }

    /** @param list<array{ok:bool,required:bool}> $rows */
    public static function blocking(array $rows): bool
    {
        foreach ($rows as $row) {
            if ($row['required'] && !$row['ok']) {
                return true;
            }
        }
        return false;
    }

    private static function writable(string $dir): bool
    {
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return is_dir($dir) && is_writable($dir);
    }

    private static function row(string $id, string $label, bool $ok, bool $required, string $value, string $hint): array
    {
        return ['id' => $id, 'label' => $label, 'ok' => $ok, 'required' => $required, 'value' => $value, 'hint' => $ok ? '' : $hint];
    }
}
