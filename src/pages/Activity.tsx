import { CalendarCheck, CalendarDays, Flame, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Heatmap as HeatmapData } from '../api/types';
import Segmented from '../components/atoms/Segmented';
import ErrorNote from '../components/molecules/ErrorNote';
import SectionTitle from '../components/molecules/SectionTitle';
import StatCard from '../components/molecules/StatCard';
import ChangeFeed from '../components/organisms/activity/ChangeFeed';
import Heatmap from '../components/organisms/activity/Heatmap';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { formatNumber } from '../lib/format';
import { useArchive } from '../state/archive';
import { locale, t } from '../i18n';

const RANGES = [{ value: '180', label: t('6 Monate') }, { value: '365', label: t('1 Jahr') }, { value: '730', label: t('2 Jahre') }, { value: '1825', label: t('5 Jahre') }];

export default function Activity() {
  const { version } = useArchive();
  const [range, setRange] = useState('365');
  const [day, setDay] = useState<string | null>(null);
  const heat = useApi<HeatmapData>('/heatmap', { days: range }, { deps: [version] });

  const stats = useMemo(() => {
    const items = heat.data?.items ?? [];
    const cutoff = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().slice(0, 10);
    };
    const sum = (from: string) => items.filter((i) => i.date >= from).reduce((n, i) => n + i.count, 0);
    const best = items.reduce((b, i) => (i.count > b.count ? i : b), { date: '', count: 0, bytes: 0 });
    return { week: sum(cutoff(7)), month: sum(cutoff(30)), active: items.length, best };
  }, [heat.data]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t('Verlauf')} title={t('Aktivität')} subtitle={t('Wann wurden Dateien erstellt oder geändert? Echte Daten aus deinem Archiv.')} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('Letzte 7 Tage')} value={formatNumber(stats.week)} hint={t('Dateien geändert')} icon={<CalendarCheck className="h-5 w-5" />} loading={!heat.data} />
        <StatCard label={t('Letzte 30 Tage')} value={formatNumber(stats.month)} hint={t('Dateien geändert')} icon={<CalendarDays className="h-5 w-5" />} loading={!heat.data} />
        <StatCard label={t('Aktive Tage')} value={formatNumber(stats.active)} hint={t('im gewählten Zeitraum')} icon={<Layers className="h-5 w-5" />} loading={!heat.data} tone="ok" />
        <StatCard label={t('Aktivster Tag')} value={stats.best.count ? formatNumber(stats.best.count) : '–'} hint={stats.best.date ? new Date(stats.best.date).toLocaleDateString(locale) : undefined} icon={<Flame className="h-5 w-5" />} loading={!heat.data} tone="warn" />
      </div>
      <section className="card card-pad">
        <SectionTitle title={t('Kalender')} hint={t('Jeder Kasten ist ein Tag')} action={<Segmented size="sm" label={t('Zeitraum')} value={range} onChange={(v) => { setRange(v); setDay(null); }} options={RANGES} />} />
        {heat.error && <ErrorNote message={heat.error} onRetry={heat.reload} />}
        {heat.data && <Heatmap days={heat.data.days} items={heat.data.items} selected={day} onSelect={(d) => setDay((cur) => (cur === d ? null : d))} />}
      </section>
      <ChangeFeed date={day} version={version} />
    </div>
  );
}
