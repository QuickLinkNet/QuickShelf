import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { get } from '../../../api/client';
import type { ApiItem } from '../../../api/types';
import { formatNumber } from '../../../lib/format';
import { usePreview } from '../../../state/preview';
import Button from '../../atoms/Button';
import Skeleton from '../../atoms/Skeleton';
import EmptyState from '../../molecules/EmptyState';
import ErrorNote from '../../molecules/ErrorNote';
import FileRow from '../../molecules/FileRow';
import ExportBar from './ExportBar';
import { Sparkles } from 'lucide-react';
import { t } from '../../../i18n';

type Props = {
  endpoint: string;
  params: Record<string, string | number | undefined>;
  exportName: string;
  topic: string;
  empty: string;
  header?: ReactNode;
};

const PAGE = 100;

/** Paged list of files from an /insights endpoint with export actions. */
export default function PagedFiles({ endpoint, params, exportName, topic, empty, header }: Props) {
  const preview = usePreview();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params) + endpoint;

  const load = useCallback(async (offset: number) => get<{ items: ApiItem[]; total?: number }>(endpoint, { ...params, limit: PAGE, offset }), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    load(0).then((r) => live && (setItems(r.items), setTotal(r.total ?? r.items.length), setLoading(false))).catch((e: Error) => live && (setError(e.message), setLoading(false)));
    return () => { live = false; };
  }, [load]);

  const more = async () => {
    const r = await load(items.length);
    setItems((p) => [...p, ...r.items]);
  };

  if (error) return <ErrorNote message={error} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="muted">{loading ? t('Wird gesucht …') : t('{v0} Dateien', { v0: formatNumber(total) })}</p>
        <ExportBar items={items} name={exportName} topic={topic} />
      </div>
      {header}
      <div className="card overflow-hidden">
        {loading && <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
        {!loading && items.length === 0 && <EmptyState icon={<Sparkles className="h-7 w-7" />} title={t('Alles sauber')} text={empty} />}
        {items.map((f) => <FileRow key={f.path} item={f} onOpen={(i) => preview.open(i, items)} />)}
        {items.length < total && <div className="p-4 text-center"><Button onClick={more}>{t('Weitere laden ({shown} von {total})', { shown: formatNumber(items.length), total: formatNumber(total) })}</Button></div>}
      </div>
    </div>
  );
}
