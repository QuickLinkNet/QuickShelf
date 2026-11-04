import Kbd from '../../atoms/Kbd';
import { MOD_KEY } from '../../../lib/platform';
import { t } from '../../../i18n';

const GROUPS: Array<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
  { title: t('Überall'), items: [
    { keys: [MOD_KEY, 'K'], label: t('Suche und Befehle öffnen') },
    { keys: ['/'], label: t('Suche und Befehle öffnen') },
    { keys: ['Esc'], label: t('Fenster oder Viewer schließen') },
  ] },
  { title: t('Im Viewer'), items: [
    { keys: ['←', '→'], label: t('Vorherige / nächste Datei') },
    { keys: ['S'], label: t('Zur Merkliste (Stern)') },
    { keys: ['I'], label: t('Details ein-/ausblenden') },
  ] },
  { title: t('Dateien'), items: [
    { keys: ['⌫'], label: t('Einen Ordner höher') },
    { keys: ['Enter'], label: t('Suche ausführen') },
  ] },
];

export default function Shortcuts() {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{g.title}</h3>
          <ul className="space-y-2">
            {g.items.map((i) => (
              <li key={i.label + i.keys.join()} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-2">{i.label}</span>
                <span className="flex shrink-0 gap-1">{i.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
