import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
};

/** Square icon-only button. `label` is required for accessibility and used as tooltip. */
const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, children, active, size = 'md', className, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        'disabled:opacity-40',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export default IconButton;
