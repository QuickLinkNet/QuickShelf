import { Check, Copy, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ApiItem } from '../../../api/types';
import { useApi } from '../../../hooks/useApi';
import { copyText } from '../../../lib/export';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import FileIcon from '../../atoms/FileIcon';
import Skeleton from '../../atoms/Skeleton';
import EmptyState from '../../molecules/EmptyState';
import { t } from '../../../i18n';

export default function EmptyDirsPanel({ scope, skip }: { scope: string; skip: string }) {
  const { data, loading } = useApi<{ items: ApiItem[] }>('/insights/empty', { scope, skip, limit: 500 });
  const navigate = useNavigate();
  const { toast } = useToast();
  const items = data?.items ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="muted">{t('Ordner, in denen (auch tiefer) keine einzige Datei liegt – meist Reste nach dem Verschieben.')}</p>
        <Button size="sm" icon={<Copy className="h-4 w-4" />} disabled={items.length === 0} onClick={async () => toast((await copyText(items.map((i) => i.path).join('\n'))) ? t('Pfadliste kopiert') : t('Kopieren nicht möglich'), 'ok')}>{t('Pfade kopieren')}</Button>
      </div>
      <div className="card overflow-hidden">
        {loading && !data && <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>}
        {data && items.length === 0 && <EmptyState icon={<Check className="h-7 w-7" />} title={t('Keine leeren Ordner')} />}
        {items.map((d) => (
          <div key={d.path} className="flex items-center gap-3 border-b border-line/70 px-4 py-2.5 last:border-b-0">
            <FileIcon dir size="sm" />
            <span className="sensitive min-w-0 flex-1 truncate text-sm" title={d.path}>{d.path}</span>
            <button className="rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label={t('Übergeordneten Ordner öffnen')} onClick={() => navigate(`/files?path=${encodeURIComponent(d.path.replace(/\/[^/]+$/, '') || '/')}`)}><FolderOpen className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
