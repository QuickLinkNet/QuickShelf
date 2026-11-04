import { Copy, FileQuestion, FileWarning, FolderX, HardDrive, Inbox, type LucideIcon } from 'lucide-react';
import type { InsightsSummary } from '../../../api/types';
import { cx } from '../../../lib/cx';
import { formatBytes, formatNumber } from '../../../lib/format';
import Skeleton from '../../atoms/Skeleton';
import ScoreRing from '../../molecules/ScoreRing';
import { t, tl } from '../../../i18n';

export type CleanupTab = 'overview' | 'duplicates' | 'names' | 'large' | 'empty' | 'noext' | 'inbox';

type Card = { tab: CleanupTab; icon: LucideIcon; label: string; value: string; hint: string; bad: boolean };

function cards(s: InsightsSummary): Card[] {
  const names = s.names.reduce((n, r) => n + r.count, 0);
  return [
    { tab: 'duplicates', icon: Copy, label: t('Dubletten'), value: formatBytes(s.duplicates.wasted_bytes), hint: t('{v0} Gruppen, {v1} überflüssige Dateien', { v0: formatNumber(s.duplicates.groups), v1: formatNumber(s.duplicates.wasted_files) }), bad: s.duplicates.wasted_files > 0 },
    { tab: 'names', icon: FileWarning, label: t('Kryptische Namen'), value: formatNumber(names), hint: t('IMG_1234, Scans, Kopien, nur Zahlen'), bad: names > 0 },
    { tab: 'inbox', icon: Inbox, label: t('Im Eingang'), value: formatNumber(s.inbox_files), hint: t('noch nicht einsortiert'), bad: s.inbox_files > 0 },
    { tab: 'large', icon: HardDrive, label: t('Riesige Dateien'), value: formatNumber(s.huge), hint: t('über 500 MB'), bad: false },
    { tab: 'empty', icon: FolderX, label: t('Leere Ordner'), value: formatNumber(s.empty_dirs), hint: t('ohne Dateien darunter'), bad: s.empty_dirs > 0 },
    { tab: 'noext', icon: FileQuestion, label: t('Ohne Endung'), value: formatNumber(s.no_ext), hint: t('Typ nicht erkennbar'), bad: s.no_ext > 0 },
  ];
}

type Props = { summary: InsightsSummary | null; onOpen: (tab: CleanupTab) => void };

export default function OverviewCards({ summary, onOpen }: Props) {
  return (
    <div className="space-y-6">
      <section className="card flex flex-col items-center gap-6 p-6 sm:flex-row">
        {summary ? <ScoreRing score={summary.score} size={132} /> : <Skeleton className="h-32 w-32 rounded-full" />}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold">{summary ? (summary.score >= 80 ? t('Dein Archiv ist in guter Verfassung.') : summary.score >= 55 ? t('Ordentlich – mit Luft nach oben.') : t('Hier lohnt sich Aufräumen richtig.')) : t('Analysiere Archiv …')}</h2>
          <p className="muted mt-1.5 max-w-xl">{t('Die Bewertung berücksichtigt kryptische Dateinamen, Dubletten, leere Ordner und alles, was noch im Eingang liegt. Ignorierte Bereiche (unten) zählen nicht mit.')}</p>
          {summary && <p className="mt-2 text-xs text-ink-3">{t('Grundlage:')} {formatNumber(summary.total_files)} {tl('Dateien')}</p>}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(summary ? cards(summary) : []).map((c, i) => {
          const Icon = c.icon;
          return (
            <button key={c.tab} onClick={() => onOpen(c.tab)} style={{ animationDelay: `${i * 40}ms` }} className="card group animate-rise p-5 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-pop">
              <span className="flex items-center justify-between">
                <span className={cx('flex h-11 w-11 items-center justify-center rounded-xl', c.bad ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok')}><Icon className="h-5 w-5" /></span>
                <span className="text-xs font-semibold text-accent opacity-0 transition group-hover:opacity-100">{t('Ansehen →')}</span>
              </span>
              <span className="mt-4 block text-2xl font-bold tracking-tight">{c.value}</span>
              <span className="block text-sm font-semibold">{c.label}</span>
              <span className="mt-0.5 block text-xs text-ink-3">{c.hint}</span>
            </button>
          );
        })}
        {!summary && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </div>
  );
}
