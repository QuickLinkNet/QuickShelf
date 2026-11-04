<?php
declare(strict_types=1);

class Path
{
    public static function resolve(string $root, string $relative, array $exclude = []): ?string
    {
        $relative = str_replace('\\', '/', $relative);
        $relative = ltrim($relative, '/');
        if ($relative === '' || $relative === '.') {
            $candidate = realpath($root);
            return $candidate === false ? null : $candidate;
        }
        if (str_contains($relative, "\0")) {
            return null;
        }
        $candidate = realpath($root . '/' . $relative);
        if ($candidate === false) {
            return null;
        }
        $rootReal = realpath($root);
        if ($rootReal === false) {
            return null;
        }
        $rootReal = rtrim(str_replace('\\', '/', $rootReal), '/') . '/';
        $candidateNorm = str_replace('\\', '/', $candidate);
        if (!str_starts_with($candidateNorm, $rootReal)) {
            return null;
        }
        if ($exclude !== [] && self::isExcluded(substr($candidateNorm, strlen($rootReal)), $exclude)) {
            return null;
        }
        return $candidate;
    }

    /** True when the first path segment is on the exclude list. */
    public static function isExcluded(string $relative, array $exclude): bool
    {
        $first = explode('/', ltrim(str_replace('\\', '/', $relative), '/'))[0];
        return in_array($first, $exclude, true);
    }
}
