import { groupExtensions } from './fileTypes';
import { t } from '../i18n';

export type TypeFilter = { key: string; label: string; ext: string[] };

/** Quick type chips of the file browser. */
export const TYPE_FILTERS: TypeFilter[] = [
  { key: 'pdf', label: 'PDF', ext: ['pdf'] },
  { key: 'word', label: t('Word'), ext: ['docx', 'doc', 'odt', 'rtf'] },
  { key: 'excel', label: t('Excel'), ext: ['xlsx', 'xls', 'xlsm', 'csv'] },
  { key: 'text', label: t('Text'), ext: ['txt', 'md', 'log'] },
  { key: 'bilder', label: t('Bilder'), ext: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tif', 'tiff'] },
  { key: 'videos', label: t('Videos'), ext: groupExtensions('videos') },
  { key: 'audio', label: t('Audio'), ext: groupExtensions('audio') },
  { key: '3d', label: '3D', ext: groupExtensions('3d') },
];

export type SortKey = 'name' | 'modified' | 'size';
export type Order = 'asc' | 'desc';

export type BrowserQuery = {
  path: string;
  q: string;
  mode: 'file' | 'dir';
  content: boolean;
  inPath: boolean;
  here: boolean;
  types: string[];
  from: string;
  to: string;
  sort: SortKey;
  order: Order;
};

export const DEFAULT_QUERY: BrowserQuery = {
  path: '/', q: '', mode: 'file', content: false, inPath: false, here: false, types: [], from: '', to: '', sort: 'name', order: 'asc',
};

export const extFor = (types: string[]): string =>
  TYPE_FILTERS.filter((t) => types.includes(t.key)).flatMap((t) => t.ext).join(',');

/** Query for GET /list (browsing one folder). */
export function listParams(q: BrowserQuery): Record<string, string> {
  const p: Record<string, string> = { path: q.path, sort: q.sort, order: q.order };
  const ext = extFor(q.types);
  if (ext) p.ext = ext;
  if (q.from) p.from = q.from;
  if (q.to) p.to = q.to;
  return p;
}

/** Query for GET /search. Name search sorts by path unless the user picked something else. */
export function searchParams(q: BrowserQuery, limit: number, offset = 0): Record<string, string> {
  const p: Record<string, string> = { query: q.q, order: q.order, limit: String(limit), sort: q.sort === 'name' ? 'path' : q.sort };
  if (q.mode === 'dir') p.type = 'dir';
  else {
    if (q.content) p.content = '1';
    if (q.inPath) p.inpath = '1';
    const ext = extFor(q.types);
    if (ext) p.ext = ext;
    if (q.from) p.from = q.from;
    if (q.to) p.to = q.to;
  }
  if (q.here && q.path !== '/') p.scope = q.path;
  if (offset > 0) p.offset = String(offset);
  return p;
}

export const hasFilters = (q: BrowserQuery): boolean => q.types.length > 0 || q.from !== '' || q.to !== '';

/** Date presets for the quick range menu. Returns ISO dates (yyyy-mm-dd). */
export function datePreset(key: 'heute' | '7' | '30' | 'jahr' | 'vorjahr', now = new Date()): { from: string; to: string } {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const back = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  switch (key) {
    case 'heute': return { from: iso(now), to: iso(now) };
    case '7': return { from: iso(back(7)), to: '' };
    case '30': return { from: iso(back(30)), to: '' };
    case 'jahr': return { from: `${now.getFullYear()}-01-01`, to: '' };
    case 'vorjahr': return { from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31` };
  }
}

/** Serialises the query for the URL (only non-default values). */
export function toUrlParams(q: BrowserQuery): Record<string, string> {
  const out: Record<string, string> = {};
  if (q.path !== '/') out.path = q.path;
  if (q.q) out.q = q.q;
  if (q.mode === 'dir') out.mode = 'dir';
  if (q.content) out.content = '1';
  if (q.inPath) out.inpath = '1';
  if (q.here) out.here = '1';
  if (q.types.length) out.types = q.types.join(',');
  if (q.from) out.from = q.from;
  if (q.to) out.to = q.to;
  if (q.sort !== 'name') out.sort = q.sort;
  if (q.order !== 'asc') out.order = q.order;
  return out;
}

export function fromUrlParams(p: URLSearchParams): BrowserQuery {
  const sort = p.get('sort');
  return {
    path: p.get('path') || '/',
    q: p.get('q') ?? '',
    mode: p.get('mode') === 'dir' ? 'dir' : 'file',
    content: p.get('content') === '1',
    inPath: p.get('inpath') === '1',
    here: p.get('here') === '1',
    types: (p.get('types') ?? '').split(',').filter((t) => TYPE_FILTERS.some((f) => f.key === t)),
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
    sort: sort === 'modified' || sort === 'size' ? sort : 'name',
    order: p.get('order') === 'desc' ? 'desc' : 'asc',
  };
}
