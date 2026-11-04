import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { get, post } from '../api/client';
import type { ApiItem, Meta } from '../api/types';
import { useToast } from './toast';
import { t } from '../i18n';

type Ctx = {
  /** Paths flagged as favourite (loaded once, kept in sync on toggle). */
  favorites: Set<string>;
  isFavorite: (path: string) => boolean;
  toggleFavorite: (path: string) => Promise<void>;
  /** Tag counts for filters and suggestions. */
  tags: Array<{ tag: string; count: number }>;
  refreshTags: () => void;
  version: number;
  bump: () => void;
};

const MetaContext = createContext<Ctx | null>(null);

export function MetaProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [version, setVersion] = useState(0);

  const refreshTags = useCallback(() => {
    get<{ tags: Array<{ tag: string; count: number }> }>('/meta/tags')
      .then((r) => setTags(r.tags))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    get<{ items: ApiItem[] }>('/meta/favorites')
      .then((r) => setFavorites(new Set(r.items.map((i) => i.path))))
      .catch(() => undefined);
    refreshTags();
  }, [refreshTags]);

  const toggleFavorite = useCallback(
    async (path: string) => {
      const on = !favorites.has(path);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (on) next.add(path);
        else next.delete(path);
        return next;
      });
      try {
        await post<Meta>('/meta/favorite', { path, on });
        setVersion((v) => v + 1);
        toast(on ? t('Zur Merkliste hinzugefügt') : t('Aus der Merkliste entfernt'), 'ok');
      } catch (err) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (on) next.delete(path);
          else next.add(path);
          return next;
        });
        toast(err instanceof Error ? err.message : t('Speichern fehlgeschlagen'), 'warn');
      }
    },
    [favorites, toast]
  );

  const value = useMemo<Ctx>(
    () => ({ favorites, isFavorite: (p) => favorites.has(p), toggleFavorite, tags, refreshTags, version, bump: () => setVersion((v) => v + 1) }),
    [favorites, toggleFavorite, tags, refreshTags, version]
  );
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMetaState(): Ctx {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error(t('useMetaState braucht den MetaProvider'));
  return ctx;
}
