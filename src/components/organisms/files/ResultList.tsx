import { FolderSearch, FolderX, Info } from 'lucide-react';
import type { ApiItem, FolderInfo } from '../../../api/types';
import type { ViewMode } from '../../../state/settings';
import { formatBytes, formatNumber } from '../../../lib/format';
import Button from '../../atoms/Button';
import IconButton from '../../atoms/IconButton';
import Skeleton from '../../atoms/Skeleton';
import EmptyState from '../../molecules/EmptyState';
import ErrorNote from '../../molecules/ErrorNote';
import FileRow from '../../molecules/FileRow';
import FileGrid from './FileGrid';
import { t, tl } from '../../../i18n';

type Props = {
  items: ApiItem[];
  view: ViewMode;
  loading: boolean;
  error: string | null;
  searching: boolean;
  folder: FolderInfo | null;
  selected: Set<string>;
  onSelect: (path: string) => void;
  onOpen: (item: ApiItem) => void;
  onInfo: (item: ApiItem) => void;
  onRetry: () => void;
  emptyActions?: React.ReactNode;
  canLoadMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  total: number | null;
};

export default function ResultList(p: Props) {
  if (p.error) {
    const gone = p.error.includes('404') || /not found/i.test(p.error);
    return (
      <div className="p-6">
        {gone ? (
          <EmptyState icon={<FolderX className="h-7 w-7" />} title={t('Diesen Ordner gibt es nicht mehr')} text={t('Er wurde vermutlich verschoben oder umbenannt. Aktualisiere den Index oder geh zum Anfang.')} action={<Button onClick={p.onRetry}>{t('Neu laden')}</Button>} />
        ) : <ErrorNote message={p.error} onRetry={p.onRetry} />}
      </div>
    );
  }
  if (p.loading && p.items.length === 0) {
    return <div className="space-y-4 p-5">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className={`h-3.5 w-${i % 2 ? '1/2' : '2/3'}`} /><Skeleton className="h-3 w-1/4" /></div></div>)}</div>;
  }
  if (p.items.length === 0) {
    return <EmptyState icon={<FolderSearch className="h-7 w-7" />} title={p.searching ? t('Nichts gefunden') : t('Dieser Ordner ist leer')} text={p.searching ? t('Probier einen anderen Begriff oder weite die Suche aus.') : undefined} action={p.emptyActions} />;
  }
  const childMap = new Map((p.folder?.children ?? []).map((c) => [c.path, c]));
  return (
    <div className={p.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {p.view === 'kacheln' ? (
        <FileGrid items={p.items} onOpen={p.onOpen} selected={p.selected} onSelect={p.onSelect} />
      ) : (
        p.items.map((item) => {
          const child = childMap.get(item.path);
          return (
            <FileRow
              key={item.path}
              item={item}
              onOpen={p.onOpen}
              subtitle={item.type === 'dir' && child ? `${formatNumber(child.files)} ${tl('Dateien')} · ${formatBytes(child.bytes)}` : undefined}
              selected={p.selected.has(item.path)}
              onSelect={item.type === 'file' ? () => p.onSelect(item.path) : undefined}
              extra={<IconButton label={t('Details')} size="sm" onClick={() => p.onInfo(item)} className="hidden sm:inline-flex"><Info className="h-4 w-4" /></IconButton>}
            />
          );
        })
      )}
      {p.canLoadMore && (
        <div className="p-4 text-center">
          <Button onClick={p.onLoadMore} loading={p.loadingMore}>{t('Weitere laden ({shown} von {total})', { shown: formatNumber(p.items.length), total: formatNumber(p.total ?? 0) })}</Button>
        </div>
      )}
    </div>
  );
}
