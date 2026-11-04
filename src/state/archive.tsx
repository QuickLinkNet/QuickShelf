import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { get, rebuildIndex } from '../api/client';
import type { IndexStatus } from '../api/types';
import { clearApiCache } from '../hooks/useApi';
import { useSettings } from './settings';
import { useToast } from './toast';
import { t } from '../i18n';

type Ctx = {
  status: IndexStatus | null;
  /** Increments after every index rebuild; add it to effect deps to refresh data. */
  version: number;
  indexing: boolean;
  offline: boolean;
  /** True when the API runs with READ_ONLY=0, i.e. moving and renaming is allowed. */
  canWrite: boolean;
  reindex: () => Promise<void>;
  refreshStatus: () => void;
};

const ArchiveContext = createContext<Ctx | null>(null);
const STALE_SECONDS = 1800;

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [status, setStatus] = useState<IndexStatus | null>(null);
  const [version, setVersion] = useState(0);
  const [indexing, setIndexing] = useState(false);
  const [offline, setOffline] = useState(false);
  const autoDone = useRef(false);
  const running = useRef(false);

  const refreshStatus = useCallback(() => {
    get<IndexStatus>('/index/status')
      .then((s) => {
        setStatus(s);
        setOffline(false);
      })
      .catch(() => setOffline(true));
  }, []);

  const reindex = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setIndexing(true);
    try {
      await rebuildIndex();
      clearApiCache();
      setVersion((v) => v + 1);
      refreshStatus();
      toast(t('Suchindex ist aktuell.'), 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('Indexieren fehlgeschlagen'), 'warn');
    } finally {
      running.current = false;
      setIndexing(false);
    }
  }, [refreshStatus, toast]);

  useEffect(() => refreshStatus(), [refreshStatus]);

  // The archive gets reorganised from time to time: refresh a stale index once per page load.
  useEffect(() => {
    if (!status || autoDone.current || !settings.autoIndex) return;
    if (!status.ready || !status.updated || Date.now() / 1000 - status.updated > STALE_SECONDS) {
      autoDone.current = true;
      void reindex();
    }
  }, [status, settings.autoIndex, reindex]);

  const canWrite = status !== null && !status.read_only;
  const value = useMemo(() => ({ status, version, indexing, offline, canWrite, reindex, refreshStatus }), [status, version, indexing, offline, canWrite, reindex, refreshStatus]);
  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive(): Ctx {
  const ctx = useContext(ArchiveContext);
  if (!ctx) throw new Error(t('useArchive braucht den ArchiveProvider'));
  return ctx;
}
