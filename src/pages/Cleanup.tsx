import { useSearchParams } from 'react-router-dom';
import type { InsightsSummary, Overview } from '../api/types';
import Segmented from '../components/atoms/Segmented';
import ErrorNote from '../components/molecules/ErrorNote';
import DuplicatesPanel from '../components/organisms/cleanup/DuplicatesPanel';
import EmptyDirsPanel from '../components/organisms/cleanup/EmptyDirsPanel';
import OverviewCards, { type CleanupTab } from '../components/organisms/cleanup/OverviewCards';
import PagedFiles from '../components/organisms/cleanup/PagedFiles';
import SkipAreas from '../components/organisms/cleanup/SkipAreas';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { formatNumber } from '../lib/format';
import { prettyName } from '../lib/paths';
import { useArchive } from '../state/archive';
import { useSettings } from '../state/settings';
import { t } from '../i18n';

const TABS: Array<{ value: CleanupTab; label: string }> = [
  { value: 'overview', label: t('Überblick') }, { value: 'duplicates', label: t('Dubletten') }, { value: 'names', label: t('Namen') },
  { value: 'inbox', label: t('Eingang') }, { value: 'large', label: t('Große Dateien') }, { value: 'empty', label: t('Leere Ordner') }, { value: 'noext', label: t('Ohne Endung') },
];

export default function Cleanup() {
  const [params, setParams] = useSearchParams();
  const { version } = useArchive();
  const { settings } = useSettings();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'overview') as CleanupTab;
  const kind = params.get('kind') ?? 'kamera';
  const scope = params.get('scope') ?? '';
  const skip = settings.skipAreas.join(',');
  const go = (next: Record<string, string>) => setParams({ ...Object.fromEntries(params), ...next }, { replace: false });

  const overview = useApi<Overview>('/overview', undefined, { ttl: 300_000, deps: [version] });
  const summary = useApi<InsightsSummary>('/insights/summary', { scope, skip }, { deps: [version, skip, scope] });
  const s = summary.data;
  const base = { scope, skip };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('Pflege')} title={t('Aufräumen')} subtitle={t('Finde, was dein Archiv unübersichtlich macht – nichts wird verändert, nur analysiert.')} />
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented label={t('Bereich der Analyse')} value={tab} onChange={(t) => go({ tab: t })} options={TABS} size="sm" />
      </div>
      <SkipAreas areas={overview.data?.areas ?? []} />
      {summary.error && <ErrorNote message={summary.error} onRetry={summary.reload} />}

      {tab === 'overview' && <OverviewCards summary={s} onOpen={(t) => go({ tab: t })} />}
      {tab === 'duplicates' && <DuplicatesPanel scope={scope} skip={skip} />}
      {tab === 'names' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {s?.names.map((r) => (
              <button key={r.key} className="chip" data-on={kind === r.key} onClick={() => go({ kind: r.key })} title={t(r.hint)}>
                {t(r.label)} <b>{formatNumber(r.count)}</b>
              </button>
            ))}
          </div>
          <PagedFiles endpoint="/insights/names" params={{ ...base, kind }} exportName={`namen-${kind}`} topic={t('Diese Dateien haben unklare Namen ({kind}).', { kind: s?.names.find((r) => r.key === kind)?.label ?? kind })} empty={t('In dieser Kategorie gibt es nichts zu tun.')} />
        </div>
      )}
      {tab === 'inbox' && <PagedFiles endpoint="/search" params={{ ...base, scope: scope || (overview.data?.areas.find((a) => /eingang|inbox/i.test(a.name))?.path ?? '/99_Eingang'), query: '', sort: 'modified', order: 'desc' }} exportName="eingang" topic={t('Diese Dateien liegen noch im Eingang und müssen einsortiert werden.')} empty={t('Der Eingang ist leer – super.')} />}
      {tab === 'large' && <PagedFiles endpoint="/insights/large" params={{ ...base, min: 100 * 1024 * 1024 }} exportName="grosse-dateien" topic={t('Das sind die größten Dateien. Welche kann ich archivieren oder komprimieren?')} empty={t('Keine Datei über 100 MB.')} />}
      {tab === 'empty' && <EmptyDirsPanel scope={scope} skip={skip} />}
      {tab === 'noext' && <PagedFiles endpoint="/insights/noext" params={base} exportName="ohne-endung" topic={t('Diese Dateien haben keine Dateiendung. Was sind das für Dateien?')} empty={t('Alle Dateien haben eine Endung.')} />}
      {scope && <p className="text-xs text-ink-3">{t('Eingeschränkt auf')} {prettyName(scope.split('/').pop() ?? scope)}. <button className="text-accent hover:underline" onClick={() => go({ scope: '' })}>{t('Aufheben')}</button></p>}
    </div>
  );
}
