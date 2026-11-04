import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

type Option<T extends string> = { value: T; label: string; icon?: ReactNode };
type Props<T extends string> = { value: T; onChange: (value: T) => void; options: Option<T>[]; label: string; size?: 'sm' | 'md' };

/** Segmented control (radio group look): Liste | Kacheln, Hell | Dunkel … */
export default function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-[10px] font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
