import { EyeOff } from 'lucide-react';
import type { AreaStat } from '../../../api/types';
import { prettyName } from '../../../lib/paths';
import { useSettings } from '../../../state/settings';
import { t } from '../../../i18n';

/** Chips to exclude whole areas (e.g. bought 3D libraries) from the clean-up analysis. */
export default function SkipAreas({ areas }: { areas: AreaStat[] }) {
  const { settings, set } = useSettings();
  const toggle = (name: string) => set('skipAreas', settings.skipAreas.includes(name) ? settings.skipAreas.filter((n) => n !== name) : [...settings.skipAreas, name]);
  if (areas.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-3"><EyeOff className="h-3.5 w-3.5" /> {t('Ignorieren:')}</span>
      {areas.map((a) => (
        <button key={a.name} className="chip" data-on={settings.skipAreas.includes(a.name)} aria-pressed={settings.skipAreas.includes(a.name)} onClick={() => toggle(a.name)} title={t('Zählt nicht zur Analyse')}>
          {prettyName(a.name)}
        </button>
      ))}
    </div>
  );
}
