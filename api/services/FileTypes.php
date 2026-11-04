<?php
declare(strict_types=1);

/** Maps file extensions to the groups shown in charts and filters. */
class FileTypes
{
    public const GROUPS = [
        'dokumente' => ['label' => 'Dokumente', 'ext' => ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'pages', 'eml', 'msg']],
        'tabellen' => ['label' => 'Tabellen', 'ext' => ['xls', 'xlsx', 'xlsm', 'csv', 'ods', 'numbers']],
        'bilder' => ['label' => 'Bilder', 'ext' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'psd', 'svg', 'nef', 'cr2', 'raw']],
        'videos' => ['label' => 'Videos', 'ext' => ['mp4', 'mov', 'avi', 'mkv', 'mts', 'm2ts', 'wmv', 'vob', 'm4v', 'webm', '3gp']],
        'audio' => ['label' => 'Audio', 'ext' => ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'flac', 'aac']],
        '3d' => ['label' => '3D & Druck', 'ext' => ['stl', 'obj', '3mf', 'gcode', 'c4d', 'max', '3ds', 'lwo', 'dxf', 'blend', 'step', 'stp', 'fbx', 'mtl', 'tga']],
        'code' => ['label' => 'Code & Daten', 'ext' => ['js', 'ts', 'tsx', 'jsx', 'php', 'json', 'sql', 'py', 'h', 'cpp', 'c', 'o', 'xml', 'html', 'css', 'yml', 'yaml', 'sqlite', 'db']],
        'archive' => ['label' => 'Archive', 'ext' => ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'wpress']],
    ];

    public static function group(string $ext): string
    {
        $ext = strtolower($ext);
        foreach (self::GROUPS as $key => $def) {
            if (in_array($ext, $def['ext'], true)) {
                return $key;
            }
        }
        return 'sonstiges';
    }

    public static function label(string $group): string
    {
        return self::GROUPS[$group]['label'] ?? 'Sonstiges';
    }

    /** @return string[] extensions of a group (empty for unknown groups) */
    public static function extensions(string $group): array
    {
        return self::GROUPS[$group]['ext'] ?? [];
    }

    public static function isImage(string $ext): bool
    {
        return in_array(strtolower($ext), ['jpg', 'jpeg', 'png', 'gif', 'webp'], true);
    }
}
