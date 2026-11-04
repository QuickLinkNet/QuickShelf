import { Inbox, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Overview } from '../../../api/types';
import { formatBytes, formatNumber, formatRelative, greeting } from '../../../lib/format';
import { isInbox } from '../../../lib/areas';
import Button from '../../atoms/Button';
import Kbd from '../../atoms/Kbd';
import { MOD_KEY } from '../../../lib/platform';
import Skeleton from '../../atoms/Skeleton';
import { t } from '../../../i18n';

type Props = { overview: Overview | null; onSearch: () => void };

export default function Hero({ overview, onSearch }: Props) {
  const inbox = overview?.areas.find((a) => isInbox(a.name));
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-2xl animate-rise">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{greeting()}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t('Dein Archiv, aufgeräumt und griffbereit.')}</h1>
        {overview ? (
          <p className="muted mt-3 text-base">
            <b className="text-ink">{formatNumber(overview.totals.files)}</b> {t('Dateien in')} <b className="text-ink">{formatNumber(overview.totals.dirs)}</b> {t('Ordnern ·')}{' '}
            <b className="text-ink">{formatBytes(overview.totals.bytes)}</b> {t('· zuletzt geändert')} {formatRelative(overview.totals.latest)}
          </p>
        ) : (
          <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" icon={<Search className="h-5 w-5" />} onClick={onSearch}>
            {t('Suchen')}
            <span className="ml-1 hidden items-center gap-1 sm:flex"><Kbd>{MOD_KEY}</Kbd><Kbd>K</Kbd></span>
          </Button>
          {inbox && inbox.files > 0 && (
            <Link to={`/files?path=${encodeURIComponent(inbox.path)}`}>
              <Button size="lg" icon={<Inbox className="h-5 w-5 text-accent" />}>{inbox.files} {t('im Eingang')}</Button>
            </Link>
          )}
          <Link to="/cleanup"><Button size="lg" icon={<Sparkles className="h-5 w-5 text-accent" />}>{t('Aufräumen')}</Button></Link>
        </div>
      </div>
    </section>
  );
}
