import { useMemo, useState } from 'react';
import type { HeatDay } from '../../../api/types';
import { cx } from '../../../lib/cx';
import { formatBytes, formatNumber } from '../../../lib/format';
import { locale, t, tl } from '../../../i18n';

type Props = { days: number; items: HeatDay[]; selected: string | null; onSelect: (date: string) => void };
type Cell = { date: string; count: number; bytes: number };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MONTHS = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', ''));
// Monday-first labels for Mon, Wed, Fri, Sun (every second row).
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6].map((d) => (d % 2 === 0 ? new Date(2024, 0, 1 + d).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '') : ''));
const LEVELS = ['bg-surface-2', 'bg-accent/20', 'bg-accent/40', 'bg-accent/65', 'bg-accent'];
const MIN_CELL = 11;

/** GitHub-style calendar: one cell per day (weeks as columns), darker = more files changed. */
export default function Heatmap({ days, items, selected, onSelect }: Props) {
  const [hover, setHover] = useState<Cell | null>(null);

  const { weeks, months, max } = useMemo(() => {
    const byDate = new Map(items.map((i) => [i.date, i]));
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - days + 1);
    const lead = (start.getDay() + 6) % 7; // Monday first
    const cells: Array<Cell | null> = Array(lead).fill(null);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = iso(d);
      cells.push({ date: key, count: byDate.get(key)?.count ?? 0, bytes: byDate.get(key)?.bytes ?? 0 });
    }
    const weeks: Array<Array<Cell | null>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const months: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((w, col) => {
      const first = w.find(Boolean);
      if (!first) return;
      const m = Number(first.date.slice(5, 7)) - 1;
      if (m !== lastMonth && (col === 0 || Number(first.date.slice(8)) <= 7)) {
        months.push({ col, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return { weeks, months, max: Math.max(1, ...items.map((i) => i.count)) };
  }, [items, days]);

  const level = (n: number) => (n === 0 ? 0 : n <= max * 0.2 ? 1 : n <= max * 0.45 ? 2 : n <= max * 0.75 ? 3 : 4);
  const cols = `repeat(${weeks.length}, minmax(${MIN_CELL}px, 1fr))`;

  return (
    <div>
      <div className="mb-3 min-h-5 text-sm" aria-live="polite">
        {hover ? (
          <><b>{new Date(hover.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b> · {hover.count === 0 ? t('keine Änderungen') : `${formatNumber(hover.count)} ${tl('Dateien')} · ${formatBytes(hover.bytes)}`}</>
        ) : <span className="text-ink-3">{t('Fahre über einen Tag – ein Klick zeigt die Dateien darunter.')}</span>}
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2" style={{ minWidth: weeks.length * (MIN_CELL + 4) + 28 }}>
          <div className="mt-5 grid w-6 shrink-0 grid-rows-7 gap-1 text-[10px] text-ink-3" aria-hidden="true">
            {WEEKDAYS.map((l, i) => <span key={i} className="flex items-center">{l}</span>)}
          </div>
          <div className="flex-1">
            <div className="relative mb-1 h-4">
              {months.map((m) => <span key={m.col + m.label} className="absolute text-[10px] text-ink-3" style={{ left: `${(m.col / weeks.length) * 100}%` }}>{m.label}</span>)}
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: cols }}>
              {weeks.map((w, ci) => (
                <div key={ci} className="grid grid-rows-7 gap-1">
                  {Array.from({ length: 7 }).map((_, ri) => {
                    const c = w[ri];
                    if (!c) return <span key={ri} className="aspect-square" />;
                    return (
                      <button
                        key={ri}
                        aria-label={t('{v0}: {v1} Dateien', { v0: c.date, v1: c.count })}
                        onMouseEnter={() => setHover(c)}
                        onFocus={() => setHover(c)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => onSelect(c.date)}
                        className={cx('aspect-square rounded-[3px] transition-transform hover:z-10 hover:scale-125', LEVELS[level(c.count)], selected === c.date && 'ring-2 ring-ink ring-offset-1 ring-offset-surface')}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-ink-3">
        {t('weniger')} {LEVELS.map((l) => <span key={l} className={cx('h-3 w-3 rounded-[3px]', l)} />)} {t('mehr')}
      </div>
    </div>
  );
}
