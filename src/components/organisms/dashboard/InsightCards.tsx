import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Overview } from '../../../api/types';
import { GROUP_COLOR, type FileGroup } from '../../../lib/fileTypes';
import { formatBytes, formatNumber } from '../../../lib/format';
import BarChart from '../../molecules/BarChart';
import DonutChart from '../../molecules/DonutChart';
import SectionTitle from '../../molecules/SectionTitle';
import Skeleton from '../../atoms/Skeleton';
import Segmented from '../../atoms/Segmented';
import { useState } from 'react';
import { t } from '../../../i18n';

export function TypeCard({ overview }: { overview: Overview | null }) {
  const [by, setBy] = useState<'bytes' | 'files'>('bytes');
  return (
    <section className="card card-pad">
      <SectionTitle
        title={t('Was liegt im Archiv?')}
        action={<Segmented size="sm" label={t('Nach')} value={by} onChange={setBy} options={[{ value: 'bytes', label: t('Größe') }, { value: 'files', label: t('Anzahl') }]} />}
      />
      {overview ? (
        <DonutChart
          slices={overview.types.map((ty) => ({ key: ty.key, label: t(ty.label), value: ty[by], color: GROUP_COLOR[ty.key as FileGroup] ?? '#94a3b8' }))}
          center={{ top: by === 'bytes' ? formatBytes(overview.totals.bytes, 0) : formatNumber(overview.totals.files), bottom: t('gesamt') }}
          format={(v) => (by === 'bytes' ? formatBytes(v) : formatNumber(v))}
        />
      ) : <Skeleton className="h-44 w-full" />}
    </section>
  );
}

export function YearsCard({ overview }: { overview: Overview | null }) {
  const years = overview?.years.filter((y) => y.year >= 2000).slice(-16) ?? [];
  return (
    <section className="card card-pad">
      <SectionTitle title={t('Dateien pro Jahr')} hint={t('nach Änderungsdatum')} />
      {overview ? (
        <BarChart bars={years.map((y) => ({ key: String(y.year), label: String(y.year).slice(2) === '' ? '' : `’${String(y.year).slice(2)}`, value: y.files, hint: formatBytes(y.bytes) }))} format={(v) => t('{v0} Dateien', { v0: formatNumber(v) })} />
      ) : <Skeleton className="h-44 w-full" />}
    </section>
  );
}

export function LinkCard({ to, title, text, icon }: { to: string; title: string; text: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="card group flex items-center gap-4 p-5 transition hover:border-accent/50">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="muted block truncate">{text}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-ink-3 transition group-hover:translate-x-1 group-hover:text-accent" />
    </Link>
  );
}
