import { describe, expect, it } from 'vitest';
import { formatBytes, formatRelative, greeting, percent, plural } from './format';

describe('formatBytes', () => {
  it('formats units with German decimals', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5,0 GB');
  });
  it('handles missing values', () => {
    expect(formatBytes(null)).toBe('–');
    expect(formatBytes(undefined)).toBe('–');
  });
  it('drops decimals for large values', () => {
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MB');
  });
});

describe('formatRelative', () => {
  const now = Date.UTC(2026, 9, 26, 12, 0, 0);
  it('says "gerade eben" for fresh timestamps', () => {
    expect(formatRelative(now / 1000 - 10, now)).toBe('gerade eben');
  });
  it('uses hours and days', () => {
    expect(formatRelative(now / 1000 - 3 * 3600, now)).toContain('3');
    expect(formatRelative(now / 1000 - 86400, now)).toBe('gestern');
  });
  it('returns a dash without a timestamp', () => {
    expect(formatRelative(0)).toBe('–');
  });
});

describe('helpers', () => {
  it('plural picks singular/plural', () => {
    expect(plural(1, 'Datei', 'Dateien')).toBe('1 Datei');
    expect(plural(1200, 'Datei', 'Dateien')).toBe('1.200 Dateien');
  });
  it('percent is safe for empty totals', () => {
    expect(percent(5, 0)).toBe(0);
    expect(percent(1, 4)).toBe(25);
  });
  it('greeting depends on the hour', () => {
    expect(greeting(new Date(2026, 0, 1, 8))).toBe('Guten Morgen');
    expect(greeting(new Date(2026, 0, 1, 19))).toBe('Guten Abend');
  });
});
