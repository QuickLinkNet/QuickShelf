import { useCallback, useEffect, useState } from 'react';
import { get, post } from '../api/client';
import type { Meta } from '../api/types';
import { useMetaState } from '../state/meta';
import { useToast } from '../state/toast';
import { t } from '../i18n';

/** Tags and note of one file, with save helpers. Favourites live in the shared MetaProvider. */
export function useMeta(path: string | null) {
  const { refreshTags, bump } = useMetaState();
  const { toast } = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    setMeta(null);
    if (!path) return;
    let live = true;
    get<Meta>('/meta', { path })
      .then((m) => live && setMeta(m))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [path]);

  const guard = useCallback(
    async (fn: () => Promise<Meta>) => {
      try {
        setMeta(await fn());
        refreshTags();
        bump();
      } catch (err) {
        toast(err instanceof Error ? err.message : t('Speichern fehlgeschlagen'), 'warn');
      }
    },
    [refreshTags, bump, toast]
  );

  const addTag = useCallback((tag: string) => (path ? guard(() => post<Meta>('/meta/tag', { path, tag, on: true })) : Promise.resolve()), [path, guard]);
  const removeTag = useCallback((tag: string) => (path ? guard(() => post<Meta>('/meta/tag', { path, tag, on: false })) : Promise.resolve()), [path, guard]);
  const saveNote = useCallback((note: string) => (path ? guard(() => post<Meta>('/meta/note', { path, note })) : Promise.resolve()), [path, guard]);

  return { meta, addTag, removeTag, saveNote };
}
