import { Hash, History, Star, StickyNote } from 'lucide-react';
import { useState } from 'react';
import type { ApiItem, NoteEntry } from '../api/types';
import Segmented from '../components/atoms/Segmented';
import EmptyState from '../components/molecules/EmptyState';
import FileRow from '../components/molecules/FileRow';
import Skeleton from '../components/atoms/Skeleton';
import RelinkButton from '../components/organisms/favorites/RelinkButton';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { formatRelative } from '../lib/format';
import { dirname } from '../lib/paths';
import { useMetaState } from '../state/meta';
import { usePreview } from '../state/preview';
import { t } from '../i18n';

type Tab = 'favoriten' | 'notizen' | 'verlauf';

export default function Favorites() {
  const meta = useMetaState();
  const preview = usePreview();
  const [tab, setTab] = useState<Tab>('favoriten');
  const [tag, setTag] = useState('');
  const [tick, setTick] = useState(0);
  const deps = [meta.version, tick];
  const favs = useApi<{ items: ApiItem[] }>('/meta/favorites', { tag }, { ttl: 0, deps });
  const notes = useApi<{ items: NoteEntry[] }>(tab === 'notizen' ? '/meta/notes' : null, undefined, { ttl: 0, deps });
  const recent = useApi<{ items: ApiItem[] }>(tab === 'verlauf' ? '/meta/recent' : null, { limit: 40 }, { ttl: 0, deps });

  const list = (items: ApiItem[] | undefined, empty: React.ReactNode) => {
    if (!items) return <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
    if (items.length === 0) return empty;
    return items.map((f) => (
      <FileRow
        key={f.path}
        item={f}
        onOpen={(i) => !f.missing && preview.open(i, items.filter((x) => !x.missing))}
        subtitle={f.missing ? t('Nicht mehr an diesem Ort – verschoben oder umbenannt?') : undefined}
        extra={f.missing ? <RelinkButton item={f} onDone={() => setTick((t) => t + 1)} /> : undefined}
      />
    ));
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('Persönlich')} title={t('Merkliste')} subtitle={t('Favoriten, Tags und Notizen – gespeichert neben dem Archiv, nie darin.')} />
      <Segmented label={t('Ansicht')} value={tab} onChange={setTab} options={[
        { value: 'favoriten', label: t('Favoriten'), icon: <Star className="h-3.5 w-3.5" /> },
        { value: 'notizen', label: t('Notizen'), icon: <StickyNote className="h-3.5 w-3.5" /> },
        { value: 'verlauf', label: t('Zuletzt geöffnet'), icon: <History className="h-3.5 w-3.5" /> },
      ]} />

      {tab === 'favoriten' && (
        <>
          {meta.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Hash className="h-4 w-4 text-ink-3" />
              <button className="chip" data-on={tag === ''} onClick={() => setTag('')}>{t('Alle Favoriten')}</button>
              {meta.tags.map((t) => <button key={t.tag} className="chip" data-on={tag === t.tag} onClick={() => setTag(t.tag)}>#{t.tag} <b>{t.count}</b></button>)}
            </div>
          )}
          <div className="card overflow-hidden">
            {list(favs.data?.items, <EmptyState icon={<Star className="h-7 w-7" />} title={tag ? t('Nichts mit #{tag}', { tag }) : t('Noch keine Favoriten')} text={t('Klicke in der Liste oder im Viewer auf den Stern. Mit Tags und Notizen findest du Dokumente später in Sekunden.')} />)}
          </div>
        </>
      )}

      {tab === 'notizen' && (
        <div className="space-y-3">
          {notes.data?.items.length === 0 && <div className="card"><EmptyState icon={<StickyNote className="h-7 w-7" />} title={t('Noch keine Notizen')} text={t('Öffne eine Datei und schreibe rechts im Detailbereich eine Notiz – z. B. „Frist bis 31.03.“.')} /></div>}
          {notes.data?.items.map((n) => (
            <article key={n.path} className="card p-4">
              <p className="whitespace-pre-wrap text-sm">{n.note}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs text-ink-3">
                <span className="sensitive min-w-0 flex-1 truncate">{n.item ? dirname(n.path) + ' / ' + n.item.name : n.path}</span>
                <span>{formatRelative(n.updated)}</span>
                {n.item && !n.missing ? <button className="font-semibold text-accent hover:underline" onClick={() => preview.open(n.item as ApiItem)}>{t('Datei öffnen')}</button> : <span className="text-warn">{t('Datei fehlt')}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'verlauf' && <div className="card overflow-hidden">{list(recent.data?.items, <EmptyState icon={<History className="h-7 w-7" />} title={t('Noch nichts geöffnet')} />)}</div>}
    </div>
  );
}
