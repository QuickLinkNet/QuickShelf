import { useState } from 'react';
import { cx } from '../../lib/cx';
import { t } from '../../i18n';

export type Slice = { key: string; label: string; value: number; color: string };
type Props = { slices: Slice[]; center?: { top: string; bottom: string }; size?: number; format?: (v: number) => string; className?: string };

/** Pure-SVG donut chart with legend and hover highlight. */
export default function DonutChart({ slices, center, size = 176, format = (v) => String(v), className }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const active = slices.find((s) => s.key === hover);

  return (
    <div className={cx('flex flex-col items-center gap-5 sm:flex-row', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90" role="img" aria-label={t('Verteilung nach Dateityp')}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="13" />
          {slices.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.key}
                cx="50" cy="50" r={r} fill="none" stroke={s.color}
                strokeWidth={hover === s.key ? 15 : 13}
                strokeDasharray={`${Math.max(0, len - 0.8)} ${c - Math.max(0, len - 0.8)}`}
                strokeDashoffset={-offset}
                className="transition-all duration-200"
                opacity={hover && hover !== s.key ? 0.35 : 1}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold leading-tight">{active ? format(active.value) : center?.top}</span>
          <span className="text-[11px] text-ink-3">{active ? active.label : center?.bottom}</span>
        </div>
      </div>
      <ul className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-1">
        {slices.map((s) => (
          <li key={s.key} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 truncate text-ink-2">{s.label}</span>
            <span className="tabular-nums text-xs font-semibold">{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
