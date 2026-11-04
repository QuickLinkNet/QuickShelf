import { ArrowDown, ArrowUp, CalendarDays, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { TYPE_FILTERS, datePreset, hasFilters, type BrowserQuery, type SortKey } from '../../../lib/query';
import { cx } from '../../../lib/cx';
import IconButton from '../../atoms/IconButton';
import { t } from '../../../i18n';

type Props = { query: BrowserQuery; onChange: (patch: Partial<BrowserQuery>) => void; dimmed?: boolean };

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'name', label: t('Name') },
  { value: 'modified', label: t('Datum') },
  { value: 'size', label: t('Größe') },
];
const PRESETS = [
  { key: 'heute', label: t('Heute') },
  { key: '7', label: t('7 Tage') },
  { key: '30', label: t('30 Tage') },
  { key: 'jahr', label: t('Dieses Jahr') },
  { key: 'vorjahr', label: t('Letztes Jahr') },
] as const;

export default function FilterBar({ query, onChange, dimmed }: Props) {
  const [dates, setDates] = useState(query.from !== '' || query.to !== '');
  const toggleType = (key: string) =>
    onChange({ types: query.types.includes(key) ? query.types.filter((k) => k !== key) : [...query.types, key] });

  return (
    <div className={cx('space-y-3 transition-opacity', dimmed && 'pointer-events-none opacity-40')}>
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((t) => (
          <button key={t.key} className="chip" data-on={query.types.includes(t.key)} onClick={() => toggleType(t.key)} aria-pressed={query.types.includes(t.key)}>
            {t.label}
          </button>
        ))}
        <button className="chip" data-on={dates} onClick={() => setDates((d) => !d)} aria-pressed={dates}>
          <CalendarDays className="h-3.5 w-3.5" /> {t('Zeitraum')}
        </button>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <label className="flex items-center gap-2 text-xs text-ink-3">
          {t('Sortieren')}
          <select className="input !h-8 !w-auto !py-0 !pr-8 text-xs" value={query.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <IconButton label={query.order === 'asc' ? 'Aufsteigend' : 'Absteigend'} size="sm" onClick={() => onChange({ order: query.order === 'asc' ? 'desc' : 'asc' })}>
          {query.order === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </IconButton>
        {hasFilters(query) && (
          <button className="flex items-center gap-1 text-xs font-medium text-accent hover:underline" onClick={() => { onChange({ types: [], from: '', to: '' }); setDates(false); }}>
            <RotateCcw className="h-3 w-3" /> {t('Zurücksetzen')}
          </button>
        )}
      </div>
      {dates && (
        <div className="card flex animate-pop flex-wrap items-center gap-3 p-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.key} className="chip" onClick={() => onChange(datePreset(p.key))}>{p.label}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-3">{t('Von')} <input type="date" className="input !h-9 !w-auto !py-0" value={query.from} onChange={(e) => onChange({ from: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-xs text-ink-3">{t('Bis')} <input type="date" className="input !h-9 !w-auto !py-0" value={query.to} onChange={(e) => onChange({ to: e.target.value })} /></label>
        </div>
      )}
    </div>
  );
}

