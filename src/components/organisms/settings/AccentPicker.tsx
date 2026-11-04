import { Check } from 'lucide-react';
import { cx } from '../../../lib/cx';
import type { Accent } from '../../../state/settings';
import { t } from '../../../i18n';

const SWATCHES: Array<{ value: Accent; label: string; color: string }> = [
  { value: 'violett', label: t('Violett'), color: '#7c3aed' },
  { value: 'blau', label: t('Blau'), color: '#2563eb' },
  { value: 'smaragd', label: t('Smaragd'), color: '#059669' },
  { value: 'orange', label: t('Orange'), color: '#ea580c' },
  { value: 'rosa', label: t('Rosa'), color: '#db2777' },
];

export default function AccentPicker({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  return (
    <div role="radiogroup" aria-label={t('Akzentfarbe')} className="flex gap-2.5">
      {SWATCHES.map((s) => (
        <button
          key={s.value}
          role="radio"
          aria-checked={value === s.value}
          aria-label={s.label}
          title={s.label}
          onClick={() => onChange(s.value)}
          className={cx('flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110', value === s.value && 'ring-2 ring-offset-2 ring-offset-surface')}
          style={{ background: s.color, ['--tw-ring-color' as string]: s.color }}
        >
          {value === s.value && <Check className="h-4 w-4" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
