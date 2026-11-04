import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import Skeleton from '../atoms/Skeleton';

type Props = {
  label: string;
  value?: string;
  hint?: string;
  icon: ReactNode;
  tone?: 'accent' | 'ok' | 'warn' | 'bad';
  loading?: boolean;
  className?: string;
};

const TONE = { accent: 'bg-accent-soft text-accent', ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', bad: 'bg-bad/15 text-bad' } as const;

export default function StatCard({ label, value, hint, icon, tone = 'accent', loading, className }: Props) {
  return (
    <div className={cx('card card-pad flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
        {loading || value === undefined ? <Skeleton className="mt-2.5 h-7 w-24" /> : <p className="mt-1.5 truncate text-2xl font-bold tracking-tight">{value}</p>}
        {hint && <p className="mt-1 truncate text-xs text-ink-3">{hint}</p>}
      </div>
      <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONE[tone])}>{icon}</div>
    </div>
  );
}
