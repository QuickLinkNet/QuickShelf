import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../api/client';

type State<T> = { data: T | null; error: string | null; loading: boolean };
type Params = Record<string, string | number | boolean | undefined | null | string[]>;

const cache = new Map<string, { at: number; data: unknown }>();

/**
 * GET with abort, error state and a small stale-while-revalidate cache, so navigating back to a page
 * shows the last result immediately while a fresh one loads in the background.
 */
export function useApi<T>(path: string | null, params?: Params, options: { ttl?: number; deps?: unknown[] } = {}) {
  const { ttl = 60_000, deps = [] } = options;
  const key = path ? `${path}?${JSON.stringify(params ?? {})}` : '';
  const cached = key ? (cache.get(key) as { at: number; data: T } | undefined) : undefined;
  const [state, setState] = useState<State<T>>({ data: cached?.data ?? null, error: null, loading: path !== null });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const hit = cache.get(key) as { at: number; data: T } | undefined;
    if (hit && Date.now() - hit.at < ttl && tick === 0) {
      setState({ data: hit.data, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    const mine = ++seq.current;
    setState((s) => ({ data: hit?.data ?? s.data, error: null, loading: true }));
    get<T>(path, params, controller.signal)
      .then((data) => {
        if (mine !== seq.current) return;
        cache.set(key, { at: Date.now(), data });
        setState({ data, error: null, loading: false });
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError' || mine !== seq.current) return;
        setState((s) => ({ data: s.data, error: err.message, loading: false }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, ...deps]);

  const reload = useCallback(() => {
    cache.delete(key);
    setTick((t) => t + 1);
  }, [key]);

  return { ...state, reload };
}

/** Drops all cached responses (after the index was rebuilt, for example). */
export const clearApiCache = (): void => cache.clear();
