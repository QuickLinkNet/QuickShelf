import { useEffect, useState } from 'react';
import { Clock, FileText, Gauge, HardDrive, Zap } from 'lucide-react';
import { API_BASE, get } from '../api/client';
import type { Overview, SystemInfo } from '../api/types';
import Button from '../components/atoms/Button';
import ErrorNote from '../components/molecules/ErrorNote';
import StatCard from '../components/molecules/StatCard';
import { ApiPanel, DiskPanel, IndexPanel, ThumbsPanel } from '../components/organisms/system/Panels';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { formatBytes, formatNumber, formatRelative } from '../lib/format';
import { useArchive } from '../state/archive';
import { t } from '../i18n';

/** Round-trip time to the API, measured with the cheapest endpoint. */
function usePing(): number | null {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const t0 = performance.now();
    get('/index/status').then(() => setMs(Math.round(performance.now() - t0))).catch(() => setMs(null));
  }, []);
  return ms;
}

export default function System() {
  const { version, offline } = useArchive();
  const sys = useApi<SystemInfo>('/system', undefined, { ttl: 5000, deps: [version] });
  const overview = useApi<Overview>('/overview', undefined, { ttl: 300_000 });
  const ping = usePing();
  const s = sys.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('Betrieb')}
        title={t('System')}
        subtitle={<>{t('Verbunden mit')} <span className="font-mono text-xs">{API_BASE}</span></>}
        actions={<Button size="sm" icon={<Zap className="h-4 w-4" />} onClick={sys.reload}>{t('Neu messen')}</Button>}
      />
      {(sys.error || offline) && <ErrorNote message={sys.error ?? t('Die API antwortet nicht.')} onRetry={sys.reload} />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('Antwortzeit')} value={ping === null ? undefined : `${ping} ms`} hint={t('Browser → API')} icon={<Gauge className="h-5 w-5" />} loading={ping === null && !offline} tone={ping !== null && ping > 500 ? 'warn' : 'ok'} />
        <StatCard label={t('Dateien')} value={s ? formatNumber(s.index.files) : undefined} hint={t('im Index')} icon={<FileText className="h-5 w-5" />} loading={!s} />
        <StatCard label={t('Archivgröße')} value={overview.data ? formatBytes(overview.data.totals.bytes) : undefined} hint={t('alle Bereiche')} icon={<HardDrive className="h-5 w-5" />} loading={!overview.data} />
        <StatCard label={t('Index-Stand')} value={s ? formatRelative(s.index.updated) : undefined} hint={t('zuletzt aktualisiert')} icon={<Clock className="h-5 w-5" />} loading={!s} tone="warn" />
      </div>
      {s && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DiskPanel sys={s} archiveBytes={overview.data?.totals.bytes} />
          <IndexPanel sys={s} />
          <ApiPanel sys={s} />
          <ThumbsPanel sys={s} />
        </div>
      )}
    </div>
  );
}
