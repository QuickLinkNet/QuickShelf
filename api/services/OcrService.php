<?php
declare(strict_types=1);

/**
 * Thin client for the optional OCR container (api/ocr). Text is returned to the
 * caller and stored in the search index, never written into the archive.
 */
class OcrService
{
    private bool $enabled;
    private string $ocrUrl;
    /** Set after the first unreachable answer so a dead OCR service doesn't stall the whole index run. */
    private bool $unreachable = false;

    public function __construct(bool $enabled, string $ocrUrl)
    {
        $this->enabled = $enabled && $ocrUrl !== '';
        $this->ocrUrl = $ocrUrl;
    }

    public function enabled(): bool
    {
        return $this->enabled;
    }

    public function extract(string $relativePath): ?string
    {
        if (!$this->enabled || $this->unreachable || !function_exists('curl_init')) {
            return null;
        }
        $payload = json_encode(['path' => '/' . ltrim(str_replace('\\', '/', $relativePath), '/')], JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            return null;
        }
        $ch = curl_init($this->ocrUrl);
        if ($ch === false) {
            return null;
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false) {
            $this->unreachable = true;
            return null;
        }
        if ($code >= 400) {
            return null;
        }
        $data = json_decode($raw, true);
        $text = is_array($data) ? trim((string) ($data['text'] ?? '')) : '';
        return $text === '' ? null : $text;
    }
}
