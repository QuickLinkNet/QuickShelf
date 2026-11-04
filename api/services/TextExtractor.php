<?php
declare(strict_types=1);

/**
 * Pulls plain text out of archive files so they can be searched.
 * Works without the PHP zip extension (docx/xlsx are read with a small zip reader).
 */
class TextExtractor
{
    private const MAX_CHARS = 2000000;

    /** Set false to skip PDFs (e.g. when pdftotext is missing or hangs on the host). */
    public static bool $pdfText = true;

    public static function supports(string $ext): bool
    {
        return in_array($ext, ['txt', 'md', 'csv', 'log', 'json', 'xml', 'html', 'htm', 'docx', 'xlsx', 'pdf'], true);
    }

    public static function extract(string $path, string $ext): ?string
    {
        // Empty or damaged files must never abort an indexing run.
        try {
            return self::extractUnsafe($path, $ext);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private static function extractUnsafe(string $path, string $ext): ?string
    {
        if ((int) @filesize($path) === 0) {
            return null;
        }
        $text = match ($ext) {
            'txt', 'md', 'csv', 'log', 'json' => self::plain($path),
            'xml', 'html', 'htm' => self::stripTags(self::plain($path)),
            'docx' => self::docx($path),
            'xlsx' => self::xlsx($path),
            'pdf' => self::pdf($path),
            default => null,
        };
        if ($text === null) {
            return null;
        }
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
        if ($text === '') {
            return null;
        }
        return mb_substr($text, 0, self::MAX_CHARS);
    }

    private static function plain(string $path): ?string
    {
        $raw = @file_get_contents($path, false, null, 0, self::MAX_CHARS * 2);
        if ($raw === false) {
            return null;
        }
        return self::toUtf8($raw);
    }

    private static function toUtf8(string $raw): string
    {
        if (str_starts_with($raw, "\xEF\xBB\xBF")) {
            $raw = substr($raw, 3);
        }
        if (str_starts_with($raw, "\xFF\xFE") || str_starts_with($raw, "\xFE\xFF")) {
            return (string) mb_convert_encoding($raw, 'UTF-8', 'UTF-16');
        }
        if (mb_check_encoding($raw, 'UTF-8')) {
            return $raw;
        }
        return (string) mb_convert_encoding($raw, 'UTF-8', 'Windows-1252');
    }

    private static function stripTags(?string $text): ?string
    {
        return $text === null ? null : html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private static function docx(string $path): ?string
    {
        $xml = self::zipEntry($path, 'word/document.xml');
        if ($xml === null) {
            return null;
        }
        $xml = preg_replace('#</w:p>#', "</w:p>\n", $xml) ?? $xml;
        return self::stripTags($xml);
    }

    private static function xlsx(string $path): ?string
    {
        $parts = [];
        $shared = self::zipEntry($path, 'xl/sharedStrings.xml');
        if ($shared !== null) {
            $parts[] = self::stripTags(preg_replace('#</si>#', "</si>\n", $shared) ?? $shared);
        }
        for ($i = 1; $i <= 30; $i++) {
            $sheet = self::zipEntry($path, 'xl/worksheets/sheet' . $i . '.xml');
            if ($sheet === null) {
                break;
            }
            // Inline strings and formula results; numbers add little to search.
            if (preg_match_all('#<t[^>]*>(.*?)</t>#s', $sheet, $m)) {
                $parts[] = html_entity_decode(implode(' ', $m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
        }
        $text = trim(implode("\n", array_filter($parts)));
        return $text === '' ? null : $text;
    }

    private static function pdf(string $path): ?string
    {
        if (!self::$pdfText || !function_exists('exec')) {
            return null;
        }
        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
        if (in_array('exec', $disabled, true)) {
            return null;
        }
        $out = [];
        $code = 0;
        static $cmd = null;
        if ($cmd === null) {
            $probe = [];
            $found = 1;
            @exec('command -v pdftotext 2>/dev/null', $probe, $found);
            $cmd = $found === 0 ? 'pdftotext' : '';
            if ($cmd !== '') {
                @exec('command -v timeout 2>/dev/null', $probe, $found);
                $cmd = ($found === 0 ? 'timeout 20 ' : '') . 'pdftotext';
            }
        }
        if ($cmd === '') {
            return null;
        }
        @exec($cmd . ' -enc UTF-8 -q ' . escapeshellarg($path) . ' - 2>&1', $out, $code);
        if ($code !== 0) {
            return null;
        }
        return implode("\n", $out);
    }

    /** Reads one entry from a zip file without ext-zip. */
    private static function zipEntry(string $path, string $name): ?string
    {
        $fh = @fopen($path, 'rb');
        if ($fh === false) {
            return null;
        }
        $size = filesize($path);
        if ($size < 22) {
            fclose($fh);
            return null;
        }
        $tailLen = (int) min($size, 66000);
        fseek($fh, $size - $tailLen);
        $tail = (string) fread($fh, $tailLen);
        $pos = strrpos($tail, "PK\x05\x06");
        if ($pos === false) {
            fclose($fh);
            return null;
        }
        $eocd = unpack('vdisk/vcdDisk/ventriesDisk/ventries/VcdSize/VcdOffset', substr($tail, $pos + 4, 18));
        fseek($fh, $eocd['cdOffset']);
        $cd = (string) fread($fh, $eocd['cdSize']);
        $p = 0;
        $result = null;
        for ($i = 0; $i < $eocd['entries'] && $p + 46 <= strlen($cd); $i++) {
            $h = unpack('Vsig/vmade/vneed/vflags/vmethod/vtime/vdate/Vcrc/VcompSize/VrawSize/vnameLen/vextraLen/vcommentLen/vdiskNo/vintAttr/VextAttr/VlocalOffset', substr($cd, $p, 46));
            $entryName = substr($cd, $p + 46, $h['nameLen']);
            $p += 46 + $h['nameLen'] + $h['extraLen'] + $h['commentLen'];
            if ($entryName !== $name) {
                continue;
            }
            fseek($fh, $h['localOffset']);
            $local = unpack('Vsig/vneed/vflags/vmethod/vtime/vdate/Vcrc/VcompSize/VrawSize/vnameLen/vextraLen', (string) fread($fh, 30));
            fseek($fh, $h['localOffset'] + 30 + $local['nameLen'] + $local['extraLen']);
            $data = $h['compSize'] > 0 && $h['compSize'] <= 50000000 ? (string) fread($fh, $h['compSize']) : '';
            if ($h['method'] === 0) {
                $result = $data;
            } elseif ($h['method'] === 8) {
                $inflated = @gzinflate($data);
                $result = $inflated === false ? null : $inflated;
            }
            break;
        }
        fclose($fh);
        return $result;
    }
}
