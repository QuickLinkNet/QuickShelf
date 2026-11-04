import { Check, Copy, FolderOpen, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../../../api/client';
import type { ApiItem, DuplicateGroup, DuplicatesResult } from '../../../api/types';
import { useApi } from '../../../hooks/useApi';
import { copyText, downloadText, toCsv } from '../../../lib/export';
import { formatBytes, formatNumber } from '../../../lib/format';
import { basename, dirname } from '../../../lib/paths';
import { usePreview } from '../../../state/preview';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import Skeleton from '../../atoms/Skeleton';
import Badge from '../../atoms/Badge';
import FileIcon from '../../atoms/FileIcon';
import EmptyState from '../../molecules/EmptyState';
import ErrorNote from '../../molecules/ErrorNote';
import { t } from '../../../i18n';

type Verdict = 'same' | 'different' | 'unknown';

function Group({ g }: { g: DuplicateGroup }) {
  const navigate = useNavigate();
  const preview = usePreview();
  const { toast } = useToast();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const ext = g.name.split('.').pop()?.toLowerCase();

  const verify = async () => {
    setBusy(true);
    try {
      const r = await post<{ hashes: Record<string, string | null> }>('/insights/verify', { paths: g.paths.slice(0, 12) });
      const hashes = Object.values(r.hashes);
      setVerdict(hashes.some((h) => h === null) ? 'unknown' : new Set(hashes).size === 1 ? 'same' : 'different');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('Prüfung fehlgeschlagen'), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <FileIcon ext={ext} />
        <div className="min-w-0 flex-1">
          <p className="sensitive truncate text-sm font-semibold">{g.name}</p>
          <p className="text-xs text-ink-3">{g.count}× · je {formatBytes(g.size)} · <b className="text-warn">{formatBytes(g.wasted)} {t('Verschwendung')}</b></p>
        </div>
        {verdict === 'same' && <Badge tone="ok"><Check className="h-3 w-3" /> {t('Inhalt identisch')}</Badge>}
        {verdict === 'different' && <Badge tone="warn"><X className="h-3 w-3" /> {t('Inhalt unterschiedlich')}</Badge>}
        {verdict === 'unknown' && <Badge>{t('nicht lesbar')}</Badge>}
        <Button size="sm" loading={busy} icon={<ShieldCheck className="h-4 w-4" />} onClick={verify}>{t('Prüfen')}</Button>
      </div>
      <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
        {g.paths.map((p) => (
          <li key={p} className="flex items-center gap-2 px-3 py-2">
            <button className="sensitive min-w-0 flex-1 truncate text-left text-xs text-ink-2 hover:text-accent" title={p} onClick={() => preview.open({ name: basename(p), type: 'file', ext, size: g.size, modified: g.modified, path: p } as ApiItem)}>{dirname(p)}</button>
            <button aria-label={t('Pfad kopieren')} title={t('Pfad kopieren')} className="rounded p-1 text-ink-3 hover:text-ink" onClick={async () => toast((await copyText(p)) ? t('Pfad kopiert') : t('Kopieren nicht möglich'), 'ok')}><Copy className="h-3.5 w-3.5" /></button>
            <button aria-label={t('Ordner öffnen')} title={t('Ordner öffnen')} className="rounded p-1 text-ink-3 hover:text-ink" onClick={() => navigate(`/files?path=${encodeURIComponent(dirname(p))}`)}><FolderOpen className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
    </li>
  );
}

type Props = { scope: string; skip: string };

export default function DuplicatesPanel({ scope, skip }: Props) {
  const [min, setMin] = useState(51200);
  const { data, loading, error, reload } = useApi<DuplicatesResult>('/insights/duplicates', { scope, skip, min, limit: 60 });
  const exportCsv = () => data && downloadText('dubletten.csv', toCsv(['Name', t('Größe (Byte)'), 'Anzahl', t('Verschwendung (Byte)'), 'Pfade'], data.groups.map((g) => [g.name, g.size, g.count, g.wasted, g.paths.join(' | ')])));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="muted flex-1">
          {t('Dateien mit gleichem Namen und gleicher Größe. Mit „Prüfen“ wird der Inhalt per Hash verglichen, bevor du etwas löschst.')}
        </p>
        <label className="flex items-center gap-2 text-xs text-ink-3">{t('Mindestgröße')}
          <select className="input !h-9 !w-auto !py-0" value={min} onChange={(e) => setMin(Number(e.target.value))}>
            <option value={1024}>1 KB</option><option value={51200}>50 KB</option><option value={1048576}>1 MB</option><option value={10485760}>10 MB</option><option value={104857600}>100 MB</option>
          </select>
        </label>
        <Button size="sm" onClick={exportCsv} disabled={!data}>CSV</Button>
      </div>
      {data && <p className="text-sm"><b>{formatNumber(data.stats.groups)}</b> {t('Gruppen ·')} <b>{formatNumber(data.stats.wasted_files)}</b> {t('überflüssige Dateien ·')} <b className="text-warn">{formatBytes(data.stats.wasted_bytes)}</b> {t('Platz')}</p>}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>}
      {data && data.groups.length === 0 && <div className="card"><EmptyState icon={<Check className="h-7 w-7" />} title={t('Keine Dubletten')} text={t('Mit diesen Einstellungen gibt es keine doppelten Dateien.')} /></div>}
      <ul className="space-y-3">{data?.groups.map((g) => <Group key={g.name + g.size} g={g} />)}</ul>
    </div>
  );
}
