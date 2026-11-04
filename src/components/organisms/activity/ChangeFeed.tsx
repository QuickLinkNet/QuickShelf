import { useEffect, useMemo, useState } from 'react';
import { get } from '../../../api/client';
import type { ApiItem } from '../../../api/types';
import { GROUP_LABEL, type FileGroup } from '../../../lib/fileTypes';
import { formatNumber } from '../../../lib/format';
import { usePreview } from '../../../state/preview';
import Button from '../../atoms/Button';
import Skeleton from '../../atoms/Skeleton';
import FileRow from '../../molecules/FileRow';
import { locale, t, tl } from '../../../i18n';

type Props = { date: string | null; version: number };
const GROUPS: FileGroup[] = ['dokumente', 'tabellen', 'bilder', 'videos', '3d'];
const PAGE = 40;

const dayLabel = (ts: number) => new Date(ts * 1000).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Newest files (grouped by day) – or all files of the day picked in the heatmap. */
export default function ChangeFeed({ date, version }: Props) {
  const preview = usePreview();
  const [group, setGroup] = useState<string>('');
  const [items, setItems] = useState<ApiItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    const req = date
      ? get<{ items: ApiItem[]; total: number }>('/day', { date, limit: 200 })
      : get<{ items: ApiItem[] }>('/changes', { limit: PAGE, group });
    req.then((r) => live && (setItems(r.items), setTotal('total' in r ? (r as { total: number }).total : null), setLoading(false))).catch(() => live && setLoading(false));
    return () => { live = false; };
  }, [date, group, version]);

  const loadMore = async () => {
    const r = await get<{ items: ApiItem[] }>('/changes', { limit: PAGE, offset: items.length, group });
    setItems((p) => [...p, ...r.items]);
  };

  const sections = useMemo(() => {
    const out: Array<{ label: string; items: ApiItem[] }> = [];
    for (const it of items) {
      const label = dayLabel(it.modified);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(it);
      else out.push({ label, items: [it] });
    }
    return out;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="h-sec mr-2">{date ? t('Änderungen am {v0}', { v0: new Date(date).toLocaleDateString(locale) }) : t('Neueste Änderungen')}</h2>
        {!date && (
          <>
            <button className="chip" data-on={group === ''} onClick={() => setGroup('')}>{t('Alle')}</button>
            {GROUPS.map((g) => <button key={g} className="chip" data-on={group === g} onClick={() => setGroup(g)}>{GROUP_LABEL[g]}</button>)}
          </>
        )}
        {date && total !== null && <span className="muted">{formatNumber(total)} {tl('Dateien')}{total > items.length ? ` (erste ${items.length})` : ''}</span>}
      </div>
      <div className="card overflow-clip">
        {loading && <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {!loading && items.length === 0 && <p className="p-8 text-center text-sm text-ink-3">{t('An diesem Tag wurde nichts geändert.')}</p>}
        {sections.map((s) => (
          <section key={s.label}>
            <h3 className="sticky top-16 z-[1] border-b border-line bg-surface-2/90 px-4 py-1.5 text-xs font-semibold text-ink-2 backdrop-blur">{s.label} · {s.items.length}</h3>
            {s.items.map((f) => <FileRow key={f.path} item={f} compact onOpen={(i) => preview.open(i, items)} />)}
          </section>
        ))}
        {!date && !loading && items.length >= PAGE && items.length % PAGE === 0 && <div className="p-4 text-center"><Button onClick={loadMore}>{t('Weitere laden')}</Button></div>}
      </div>
    </div>
  );
}
