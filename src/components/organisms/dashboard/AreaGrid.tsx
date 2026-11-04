import { Link } from 'react-router-dom';
import type { AreaStat } from '../../../api/types';
import { areaVisual } from '../../../lib/areas';
import { formatBytes, formatNumber, formatRelative, percent } from '../../../lib/format';
import { prettyName } from '../../../lib/paths';
import Skeleton from '../../atoms/Skeleton';
import { t } from '../../../i18n';

type Props = { areas: AreaStat[] | null };

/** One tile per top-level folder with its share of the archive. */
export default function AreaGrid({ areas }: Props) {
  if (!areas) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
    );
  }
  const totalBytes = areas.reduce((s, a) => s + a.bytes, 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {areas.map((a, i) => {
        const { icon: Icon, color } = areaVisual(a.name);
        const share = percent(a.bytes, totalBytes);
        return (
          <Link
            key={a.path}
            to={`/files?path=${encodeURIComponent(a.path)}`}
            style={{ animationDelay: `${i * 40}ms` }}
            className="card group animate-rise p-4 transition-all sm:p-5 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-pop"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-ink-3">{share} %</span>
            </div>
            <h3 className="mt-3 truncate sm:mt-4 text-base font-semibold group-hover:text-accent">{prettyName(a.name)}</h3>
            <p className="mt-0.5 text-xs text-ink-3">
              {formatNumber(a.files)} {t('Dateien ·')} {formatBytes(a.bytes)}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, background: color }} />
            </div>
            <p className="mt-2 text-[11px] text-ink-3">{t('Zuletzt geändert')} {formatRelative(a.latest)}</p>
          </Link>
        );
      })}
    </div>
  );
}
