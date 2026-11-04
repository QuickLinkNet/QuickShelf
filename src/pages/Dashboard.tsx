import { Activity, Database, FileText, Gauge, HardDrive, Images, Sparkles, Star } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import type { ApiItem, InsightsSummary, Overview } from '../api/types';
import AreaGrid from '../components/organisms/dashboard/AreaGrid';
import Hero from '../components/organisms/dashboard/Hero';
import { LinkCard, TypeCard, YearsCard } from '../components/organisms/dashboard/InsightCards';
import MemoriesStrip from '../components/organisms/dashboard/MemoriesStrip';
import TipsCard from '../components/organisms/dashboard/TipsCard';
import FileListCard from '../components/organisms/FileListCard';
import StatCard from '../components/molecules/StatCard';
import SectionTitle from '../components/molecules/SectionTitle';
import ErrorNote from '../components/molecules/ErrorNote';
import { useApi } from '../hooks/useApi';
import { formatBytes, formatNumber, percent } from '../lib/format';
import { useArchive } from '../state/archive';
import { useMetaState } from '../state/meta';
import { useSettings } from '../state/settings';
import { t } from '../i18n';

type Shell = { openSearch?: () => void } | undefined;

export default function Dashboard() {
  const shell = useOutletContext<Shell>();
  const { version } = useArchive();
  const { settings } = useSettings();
  const meta = useMetaState();

  const overview = useApi<Overview>('/overview', undefined, { deps: [version] });
  const summary = useApi<InsightsSummary>('/insights/summary', { skip: settings.skipAreas.join(',') }, { deps: [version] });
  const recent = useApi<{ items: ApiItem[] }>('/meta/recent', { limit: 8 }, { deps: [meta.version] });
  const favorites = useApi<{ items: ApiItem[] }>('/meta/favorites', undefined, { deps: [meta.version] });
  const o = overview.data;

  const openSearch = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

  return (
    <div className="space-y-8">
      <Hero overview={o} onSearch={shell?.openSearch ?? openSearch} />
      {overview.error && <ErrorNote message={overview.error.includes('503') || overview.error.includes('Index') ? t('Der Suchindex ist noch nicht aufgebaut – er wird gerade erstellt …') : overview.error} onRetry={overview.reload} />}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={t('Dateien')} value={o ? formatNumber(o.totals.files) : undefined} hint={o ? t('{v0} Ordner', { v0: formatNumber(o.totals.dirs) }) : undefined} icon={<FileText className="h-5 w-5" />} loading={!o} />
        <StatCard label={t('Belegt')} value={o ? formatBytes(o.totals.bytes) : undefined} hint={o ? t('Ø {v0} pro Datei', { v0: formatBytes(o.totals.bytes / Math.max(1, o.totals.files)) }) : undefined} icon={<HardDrive className="h-5 w-5" />} loading={!o} />
        <StatCard label={t('Im Volltext')} value={o ? formatNumber(o.totals.with_text) : undefined} hint={o ? t('{v0} % mit Inhalt durchsuchbar', { v0: percent(o.totals.with_text, o.totals.files) }) : undefined} icon={<Database className="h-5 w-5" />} loading={!o} tone="ok" />
        <StatCard label={t('Ordnung')} value={summary.data ? `${summary.data.score} / 100` : undefined} hint={t('Archiv-Gesundheit')} icon={<Gauge className="h-5 w-5" />} loading={!summary.data} tone={summary.data && summary.data.score < 55 ? 'bad' : summary.data && summary.data.score < 80 ? 'warn' : 'ok'} />
      </div>

      <MemoriesStrip areas={o?.areas} />

      <section>
        <SectionTitle title={t('Bereiche')} hint={t('Deine Hauptordner im Überblick')} />
        <AreaGrid areas={o?.areas ?? null} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FileListCard title={t('Zuletzt geändert')} hint={t('Neueste Dateien im Archiv')} items={o?.recent ?? null} showTime empty={t('Noch keine Dateien.')} />
        </div>
        <div className="space-y-6">
          <FileListCard
            title={t('Merkliste')}
            items={favorites.data?.items ?? null}
            action={<Link to="/favorites" className="text-xs font-semibold text-accent hover:underline">{t('Alle')}</Link>}
            empty={<span className="flex items-center gap-2"><Star className="h-4 w-4" /> {t('Markiere Dateien mit dem Stern, dann liegen sie hier.')}</span>}
            limit={4}
          />
          <FileListCard title={t('Zuletzt geöffnet')} items={recent.data?.items ?? null} empty={t('Noch nichts geöffnet.')} limit={4} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TypeCard overview={o} />
        <TipsCard summary={summary.data} />
      </div>
      <YearsCard overview={o} />

      <div className="grid gap-4 md:grid-cols-3">
        <LinkCard to="/gallery" title={t('Galerie')} text={t('Fotos nach Datum durchblättern')} icon={<Images className="h-6 w-6" />} />
        <LinkCard to="/cleanup" title={t('Aufräumen')} text={t('Dubletten, Namen, Eingang')} icon={<Sparkles className="h-6 w-6" />} />
        <LinkCard to="/activity" title={t('Aktivität')} text={t('Was hat sich wann geändert?')} icon={<Activity className="h-6 w-6" />} />
      </div>
    </div>
  );
}
