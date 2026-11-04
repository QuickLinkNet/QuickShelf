import { Eye, EyeOff, Moon, Search, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { NAV, isActivePath } from '../../nav';
import { useSettings } from '../../state/settings';
import IconButton from '../atoms/IconButton';
import Kbd from '../atoms/Kbd';
import { MOD_KEY } from '../../lib/platform';
import { Brand } from './Sidebar';
import { t } from '../../i18n';

type Props = { onSearch: () => void };

export default function Topbar({ onSearch }: Props) {
  const { settings, set, dark } = useSettings();
  const { pathname } = useLocation();
  const current = NAV.find((n) => isActivePath(pathname, n.href));

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Brand compact />
        </div>
        <span className="hidden text-sm font-semibold text-ink-2 lg:block">{current?.name ?? 'QuickShelf'}</span>

        <button
          onClick={onSearch}
          className="group flex h-10 min-w-0 max-w-md flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink-3 shadow-sm transition hover:border-accent/50 hover:text-ink-2 lg:ml-6 lg:mr-auto lg:w-full lg:flex-none"
          aria-label={t('Suche und Befehle öffnen')}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">{t('Datei, Ordner oder Befehl suchen …')}</span>
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd>{MOD_KEY}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <div className="flex items-center gap-1">
          <IconButton
            label={settings.privacy ? t('Diskreten Modus ausschalten') : t('Diskreter Modus: Namen und Vorschauen verwischen')}
            active={settings.privacy}
            onClick={() => set('privacy', !settings.privacy)}
          >
            {settings.privacy ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </IconButton>
          <IconButton label={dark ? t('Helles Design') : t('Dunkles Design')} onClick={() => set('theme', dark ? 'hell' : 'dunkel')}>
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
