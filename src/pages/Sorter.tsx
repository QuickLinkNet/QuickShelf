import { Inbox, Lock, PartyPopper } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../api/client';
import type { ApiItem, Overview } from '../api/types';
import Badge from '../components/atoms/Badge';
import FileIcon from '../components/atoms/FileIcon';
import Skeleton from '../components/atoms/Skeleton';
import EmptyState from '../components/molecules/EmptyState';
import SectionTitle from '../components/molecules/SectionTitle';
import MoveBar from '../components/organisms/organize/MoveBar';
import MoveHistory from '../components/organisms/organize/MoveHistory';
import Viewer from '../components/organisms/preview/Viewer';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { useHotkeys } from '../hooks/useHotkeys';
import { cx } from '../lib/cx';
import { isInbox } from '../lib/areas';
import { formatBytes, formatNumber } from '../lib/format';
import { dirname } from '../lib/paths';
import { useArchive } from '../state/archive';
import { t } from '../i18n';

/** "Einsortieren": step through the inbox, look at each file, rename it and send it to the right folder. */
export default function Sorter() {
  const { canWrite, version } = useArchive();
  const [params] = useSearchParams();
  const overview = useApi<Overview>('/overview', undefined, { ttl: 300_000 });
  const src = params.get('src') || overview.data?.areas.find((a) => isInbox(a.name))?.path || '';
  const [queue, setQueue] = useState<ApiItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [done, setDone] = useState(0);

  const load = useCallback(() => {
    if (!src) return;
    setQueue(null);
    get<{ items: ApiItem[]; total: number }>('/search', { query: '', scope: src, sort: 'path', order: 'asc', limit: 300 })
      .then((r) => setQueue(r.items))
      .catch(() => setQueue([]));
  }, [src]);
  useEffect(load, [load, version]);

  const current = queue?.[Math.min(index, (queue?.length ?? 1) - 1)] ?? null;
  const keys = useMemo(
    () => [
      { key: 'ArrowDown', handler: () => setIndex((i) => Math.min((queue?.length ?? 1) - 1, i + 1)) },
      { key: 'ArrowUp', handler: () => setIndex((i) => Math.max(0, i - 1)) },
    ],
    [queue]
  );
  useHotkeys(keys);

  const onMoved = (oldPath: string) => {
    setQueue((q) => (q ? q.filter((i) => i.path !== oldPath) : q));
    setDone((n) => n + 1);
    setHistoryKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('Ordnung halten')}
        title={t('Einsortieren')}
        subtitle={src ? (() => { const [a, b] = t('Dateien aus {src} ansehen, benennen und ablegen.').split('{src}'); return <>{a}<span className="sensitive font-mono text-xs">{src}</span>{b}</>; })() : t('Kein Eingang gefunden.')}
        actions={<>{done > 0 && <Badge tone="ok">{done} {t('erledigt')}</Badge>}{queue && <Badge tone="accent">{formatNumber(queue.length)} {t('offen')}</Badge>}</>}
      />
      {!canWrite && (
        <div className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <p>{t('Der Schreibmodus ist aus – du kannst die Dateien ansehen, aber nicht verschieben. Zum Einschalten in api/.env READ_ONLY=0 setzen. Jede Verschiebung wird protokolliert und lässt sich hier rückgängig machen.')}</p>
        </div>
      )}

      {queue && queue.length === 0 ? (
        <div className="card"><EmptyState icon={<PartyPopper className="h-7 w-7" />} title={t('Eingang leer – stark!')} text={t('Alles einsortiert. Neue Dateien landen in 99_Eingang und tauchen hier automatisch auf.')} /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <section className="card max-h-[70vh] overflow-y-auto lg:order-1" aria-label={t('Warteschlange')}>
            {!queue && <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
            {queue?.map((f, i) => (
              <button key={f.path} onClick={() => setIndex(i)} className={cx('flex w-full items-center gap-3 border-b border-line/70 px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-2', current?.path === f.path && 'bg-accent-soft')}>
                <FileIcon ext={f.ext} size="sm" />
                <span className="min-w-0 flex-1"><span className="sensitive block truncate text-sm font-medium">{f.name}</span><span className="block truncate text-xs text-ink-3">{formatBytes(f.size)} · {dirname(f.path).replace(src, '') || '/'}</span></span>
              </button>
            ))}
          </section>

          <section className="card flex min-h-[50vh] flex-col overflow-clip lg:order-2" aria-label={t('Vorschau')}>
            {current ? <div className="h-[60vh] min-h-96 flex-1"><Viewer item={current} /></div> : <div className="flex flex-1 items-center justify-center text-ink-3"><Inbox className="h-10 w-10" /></div>}
          </section>

          <aside className="space-y-6 lg:col-span-2 xl:order-3 xl:col-span-1">
            <section className="card card-pad">
              <SectionTitle title={t('Ablegen')} hint={canWrite ? t('Vorschläge basieren auf ähnlichen Dateien im Archiv') : t('Nur im Schreibmodus verfügbar')} />
              {current && canWrite ? <MoveBar item={current} avoid={src} onMoved={(to) => (dirname(to).startsWith(src) ? (setHistoryKey((k) => k + 1), load()) : onMoved(current.path))} /> : <p className="muted">{current ? t('Schreibmodus ist aus.') : t('Nichts ausgewählt.')}</p>}
            </section>
            <section className="card card-pad">
              <SectionTitle title={t('Zuletzt verschoben')} />
              <MoveHistory refreshKey={historyKey} onUndone={load} />
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
