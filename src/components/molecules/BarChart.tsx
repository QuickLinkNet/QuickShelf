import { useState } from 'react';
import { t } from '../../i18n';

export type Bar = { key: string; label: string; value: number; hint?: string };
type Props = { bars: Bar[]; height?: number; format?: (v: number) => string };

/** Compact vertical bar chart (SVG-free: flex + percentage heights, so it scales and stays crisp). */
export default function BarChart({ bars, height = 160, format = (v) => String(v) }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const shown = bars.find((b) => b.key === hover);

  return (
    <div>
      <div className="mb-2 h-5 text-xs text-ink-3" aria-live="polite">
        {shown ? <><b className="text-ink">{shown.label}</b> · {format(shown.value)}{shown.hint ? ` · ${shown.hint}` : ''}</> : t('Mit der Maus über einen Balken fahren')}
      </div>
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label={t('Dateien pro Jahr')}>
        {bars.map((b) => (
          <div key={b.key} className="group flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(b.key)} onMouseLeave={() => setHover(null)}>
            <div
              className="w-full rounded-t-md bg-accent/70 transition-all group-hover:bg-accent"
              style={{ height: `${Math.max(2, (b.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[10px] text-ink-3">
        {bars.map((b, i) => (
          <span key={b.key} className="flex-1 truncate text-center">{bars.length > 14 && i % 2 ? '' : b.label}</span>
        ))}
      </div>
    </div>
  );
}
