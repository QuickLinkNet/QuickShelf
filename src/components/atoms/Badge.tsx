import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';
const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  accent: 'bg-accent-soft text-accent',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  bad: 'bg-bad/15 text-bad',
};

export default function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[tone], className)}>{children}</span>;
}
