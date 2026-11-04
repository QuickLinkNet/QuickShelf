import { cx } from '../../lib/cx';

type Props = { value: number; tone?: 'accent' | 'ok' | 'warn' | 'bad'; className?: string; label?: string };

const TONE = { accent: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad' } as const;

export default function ProgressBar({ value, tone = 'accent', className, label }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx('h-2 overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-700', TONE[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
