import { ArrowRight, Copy, FileWarning, FolderX, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { InsightsSummary } from '../../../api/types';
import { formatBytes, formatNumber } from '../../../lib/format';
import Skeleton from '../../atoms/Skeleton';
import ScoreRing from '../../molecules/ScoreRing';
import SectionTitle from '../../molecules/SectionTitle';
import { t } from '../../../i18n';

type Tip = { icon: React.ReactNode; title: string; text: string; to: string };

function tips(s: InsightsSummary): Tip[] {
  const names = s.names.reduce((n, r) => n + r.count, 0);
  const out: Tip[] = [];
  if (s.inbox_files > 0) out.push({ icon: <FolderX className="h-4 w-4" />, title: t('{v0} Dateien im Eingang', { v0: s.inbox_files }), text: t('Einsortieren hält die Struktur sauber.'), to: '/files?path=%2F99_Eingang' });
  if (s.duplicates.wasted_bytes > 0) out.push({ icon: <Copy className="h-4 w-4" />, title: t('{v0} durch Dubletten', { v0: formatBytes(s.duplicates.wasted_bytes, 1) }), text: t('{v0} Gruppen mit gleichem Namen und gleicher Größe.', { v0: formatNumber(s.duplicates.groups) }), to: '/cleanup' });
  if (names > 0) out.push({ icon: <FileWarning className="h-4 w-4" />, title: t('{v0} Dateien mit kryptischem Namen', { v0: formatNumber(names) }), text: t('IMG_1234, Scans, Kopien – sprechende Namen helfen beim Wiederfinden.'), to: '/cleanup' });
  if (s.empty_dirs > 0) out.push({ icon: <FolderX className="h-4 w-4" />, title: t('{v0} leere Ordner', { v0: s.empty_dirs }), text: t('Ohne Inhalt, können weg.'), to: '/cleanup' });
  return out.slice(0, 3);
}

export default function TipsCard({ summary }: { summary: InsightsSummary | null }) {
  return (
    <section className="card card-pad">
      <SectionTitle title={t('Archiv-Gesundheit')} hint={t('Was als Nächstes am meisten bringt')} action={<Link to="/cleanup" className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">{t('Alles ansehen')} <ArrowRight className="h-3.5 w-3.5" /></Link>} />
      {!summary ? <Skeleton className="h-36 w-full" /> : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ScoreRing score={summary.score} />
          <ul className="flex-1 space-y-3">
            {tips(summary).map((t) => (
              <li key={t.title}>
                <Link to={t.to} className="group flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold group-hover:text-accent">{t.title}</span>
                    <span className="block text-xs text-ink-3">{t.text}</span>
                  </span>
                </Link>
              </li>
            ))}
            {tips(summary).length === 0 && <li className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-ok" /> {t('Alles in bester Ordnung.')}</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
