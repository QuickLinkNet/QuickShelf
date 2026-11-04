import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../api/client';
import type { ApiItem } from '../api/types';
import { useArchive } from '../state/archive';
import { t } from '../i18n';

const PAGE = 120;
export const PHOTO_EXT = 'jpg,jpeg,png,gif,webp';
export const VIDEO_EXT = 'mp4,mov,webm,m4v,mts,avi,mkv';

export type PhotoQuery = { scope: string; from: string; to: string; order: 'asc' | 'desc'; kind?: 'foto' | 'video' };

/** Endless list of images from the index, newest (or oldest) first. */
export function usePhotos(q: PhotoQuery, ready = true) {
  const { version } = useArchive();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const key = JSON.stringify(q) + version;

  const fetchPage = useCallback(
    async (offset: number, signal?: AbortSignal) =>
      get<{ items: ApiItem[]; total: number }>(
        '/search',
        { query: '', ext: q.kind === 'video' ? VIDEO_EXT : PHOTO_EXT, scope: q.scope, from: q.from, to: q.to, sort: 'modified', order: q.order, limit: PAGE, offset },
        signal
      ),
    [q.scope, q.from, q.to, q.order, q.kind]
  );

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setItems([]);
    busy.current = false;
    fetchPage(0, controller.signal)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setError(e.message);
        setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const more = useCallback(async () => {
    if (busy.current || items.length >= total) return;
    busy.current = true;
    try {
      const r = await fetchPage(items.length);
      setItems((prev) => [...prev, ...r.items]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Laden fehlgeschlagen'));
    } finally {
      busy.current = false;
    }
  }, [fetchPage, items.length, total]);

  return { items, total, loading, error, more, hasMore: items.length < total };
}
