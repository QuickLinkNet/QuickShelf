import { cx } from '../../lib/cx';

type Props = { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean };

export default function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-surface-3'
      )}
    >
      <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}
