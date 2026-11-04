import { useEffect, useState } from 'react';
import { get } from '../api/client';
import type { ApiItem } from '../api/types';
import { dirname } from '../lib/paths';

const STOP = new Set(['scan', 'dokument', 'document', 'img', 'kopie', 'copy', 'neu', 'new', 'datei', 'file', 'screenshot', 'bild', 'foto', 'unbenannt', 'untitled', 'final']);

/** Distinctive words of a filename ("2025-01_Telekom_Rechnung.pdf" -> telekom, rechnung). */
export function tokens(name: string): string[] {
  const base = name.replace(/\.[^.]+$/, '');
  const words = base.split(/[\s_\-.()[\]]+/).filter((w) => w.length >= 4 && !/\d/.test(w) && !STOP.has(w.toLowerCase()));
  return [...new Set(words.map((w) => w.toLowerCase()))].slice(0, 3);
}

/**
 * Suggests destination folders for a file by looking at where files with similar names already live.
 * Cheap and surprisingly good in an archive that is mostly sorted.
 */
export function useMoveSuggestions(item: ApiItem | null, exclude: string): Array<{ folder: string; score: number }> {
  const [out, setOut] = useState<Array<{ folder: string; score: number }>>([]);

  useEffect(() => {
    setOut([]);
    if (!item) return;
    const words = tokens(item.name);
    if (words.length === 0) return;
    const controller = new AbortController();
    Promise.all(words.map((w) => get<{ items: ApiItem[] }>('/search', { query: w, limit: 60, sort: 'modified', order: 'desc' }, controller.signal).catch(() => ({ items: [] as ApiItem[] }))))
      .then((results) => {
        const score = new Map<string, number>();
        results.forEach((r, i) => r.items.forEach((f) => {
          const dir = dirname(f.path);
          if (f.path === item.path || dir.startsWith(exclude)) return;
          score.set(dir, (score.get(dir) ?? 0) + (words.length - i));
        }));
        setOut([...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([folder, s]) => ({ folder, score: s })));
      });
    return () => controller.abort();
  }, [item?.path, exclude]); // eslint-disable-line react-hooks/exhaustive-deps

  return out;
}
