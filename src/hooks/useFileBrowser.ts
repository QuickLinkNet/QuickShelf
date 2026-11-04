import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../api/client';
import type { ApiItem, FolderInfo } from '../api/types';
import { DEFAULT_QUERY, fromUrlParams, listParams, searchParams, toUrlParams, type BrowserQuery } from '../lib/query';
import { useArchive } from '../state/archive';
import { t } from '../i18n';

const PAGE = 100;

/**
 * State and data loading of the file browser. The whole query lives in the URL, so back/forward,
 * bookmarks and links from other pages (palette, dashboard) all just work.
 */
export function useFileBrowser() {
  const [params, setParams] = useSearchParams();
  const { version } = useArchive();
  const query = useMemo(() => fromUrlParams(params), [params]);
  const searching = query.q.trim() !== '';

  const [items, setItems] = useState<ApiItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [folder, setFolder] = useState<FolderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const abort = useRef<AbortController | null>(null);

  const update = useCallback(
    (patch: Partial<BrowserQuery>, options: { replace?: boolean } = {}) => {
      setParams(toUrlParams({ ...query, ...patch }), { replace: options.replace });
    },
    [query, setParams]
  );

  const key = JSON.stringify(searching ? searchParams(query, PAGE) : listParams(query));

  // List or search; re-runs whenever the query (or the index) changes.
  useEffect(() => {
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    setLoading(true);
    setError(null);
    const request = searching
      ? get<{ items: ApiItem[]; total?: number }>('/search', searchParams(query, PAGE), controller.signal)
      : get<{ items: ApiItem[] }>('/list', listParams(query), controller.signal);
    request
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(searching ? ((data as { total?: number }).total ?? data.items.length) : null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setItems([]);
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, searching, reloadKey, version]);

  // Folder summary (size, count, subfolders with counts) from the index – only while browsing.
  useEffect(() => {
    if (searching) {
      setFolder(null);
      return;
    }
    let live = true;
    get<FolderInfo>('/folder', { path: query.path })
      .then((f) => live && setFolder(f))
      .catch(() => live && setFolder(null));
    return () => {
      live = false;
    };
  }, [query.path, searching, version, reloadKey]);

  const loadMore = useCallback(async () => {
    if (!searching) return;
    setLoadingMore(true);
    try {
      const more = await get<{ items: ApiItem[]; total?: number }>('/search', searchParams(query, PAGE, items.length));
      setItems((prev) => [...prev, ...(more.items ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Laden fehlgeschlagen'));
    } finally {
      setLoadingMore(false);
    }
  }, [query, searching, items.length]);

  return {
    query, update, searching, items, total, folder, loading, loadingMore, error,
    canLoadMore: searching && total !== null && items.length < total,
    loadMore,
    reload: () => setReloadKey((k) => k + 1),
    clearSearch: () => update({ q: '' }),
    openFolder: (path: string) => setParams(toUrlParams({ ...DEFAULT_QUERY, path, sort: query.sort, order: query.order, types: query.types })),
  };
}
