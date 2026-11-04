import { describe, expect, it } from 'vitest';
import { DEFAULT_QUERY, datePreset, extFor, fromUrlParams, listParams, searchParams, toUrlParams } from './query';

describe('url round trip', () => {
  it('omits defaults', () => {
    expect(toUrlParams(DEFAULT_QUERY)).toEqual({});
  });
  it('restores a full query', () => {
    const q = { ...DEFAULT_QUERY, path: '/01_Dokumente', q: 'rechnung', content: true, types: ['pdf', 'excel'], sort: 'modified' as const, order: 'desc' as const, from: '2025-01-01' };
    expect(fromUrlParams(new URLSearchParams(toUrlParams(q)))).toEqual(q);
  });
  it('ignores unknown type keys', () => {
    expect(fromUrlParams(new URLSearchParams('types=pdf,quatsch')).types).toEqual(['pdf']);
  });
});

describe('API params', () => {
  it('maps type chips to extensions', () => {
    expect(extFor(['pdf']).split(',')).toEqual(['pdf']);
    expect(extFor(['word']).split(',')).toContain('docx');
  });
  it('browsing sends the folder and filters', () => {
    expect(listParams({ ...DEFAULT_QUERY, path: '/a', types: ['pdf'], from: '2025-01-01' })).toMatchObject({ path: '/a', ext: 'pdf', from: '2025-01-01' });
  });
  it('search uses path sorting for names and scope only on request', () => {
    const base = { ...DEFAULT_QUERY, q: 'x', path: '/a' };
    expect(searchParams(base, 100).sort).toBe('path');
    expect(searchParams(base, 100).scope).toBeUndefined();
    expect(searchParams({ ...base, here: true }, 100).scope).toBe('/a');
    expect(searchParams({ ...base, mode: 'dir', types: ['pdf'] }, 100).ext).toBeUndefined();
  });
  it('paging adds the offset', () => {
    expect(searchParams({ ...DEFAULT_QUERY, q: 'x' }, 50, 50).offset).toBe('50');
  });
});

describe('datePreset', () => {
  const now = new Date(2026, 9, 26);
  it('computes relative ranges', () => {
    expect(datePreset('7', now).from).toBe('2026-10-19');
    expect(datePreset('jahr', now).from).toBe('2026-01-01');
    expect(datePreset('vorjahr', now)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });
});
