import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert, WifiOff } from 'lucide-react';
import { useExposureCheck } from '../../hooks/useExposureCheck';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useArchive } from '../../state/archive';
import ErrorBoundary from '../molecules/ErrorBoundary';
import CommandPalette from '../organisms/CommandPalette';
import MobileNav from '../organisms/MobileNav';
import Sidebar from '../organisms/Sidebar';
import Topbar from '../organisms/Topbar';
import { t } from '../../i18n';

/** Sidebar + topbar + content. Owns the command palette (Strg/⌘ + K). */
export default function AppShell() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>('nas.sidebar', false);
  const [palette, setPalette] = useState(false);
  const { offline } = useArchive();
  const exposed = useExposureCheck(true);
  const { pathname } = useLocation();
  const keys = useMemo(
    () => [
      { key: 'k', mod: true, handler: () => setPalette((p) => !p) },
      { key: '/', handler: () => setPalette(true) },
    ],
    []
  );
  useHotkeys(keys);
  // New page = start at the top (the shell itself stays mounted).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <a href="#inhalt" className="sr-only fixed left-3 top-3 z-[90] rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink focus:not-sr-only" onClick={(e) => { e.preventDefault(); document.getElementById('inhalt')?.focus(); }}>{t('Zum Inhalt springen')}</a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <Topbar onSearch={() => setPalette(true)} />
        {exposed && (
          <div className="border-b border-bad/30 bg-bad/10 px-4 py-2 text-center text-sm text-ink" role="alert">
            <ShieldAlert className="mr-2 inline h-4 w-4 text-bad" />
            <b>{t('Sicherheitswarnung:')}</b> {t('Der Webserver liefert den API-Datenordner (api/data) öffentlich aus. Sperre ihn laut README, bevor du das Archiv im Internet erreichbar machst.')}
          </div>
        )}
        {offline && (
          <div className="border-b border-bad/30 bg-bad/10 px-4 py-2 text-center text-sm text-ink" role="alert">
            <WifiOff className="mr-2 inline h-4 w-4 text-bad" />
            {t('Die Archiv-API ist nicht erreichbar. Prüfe, ob das NAS läuft.')}
          </div>
        )}
        <main id="inhalt" tabIndex={-1} key={pathname} className="mx-auto max-w-[1500px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          <ErrorBoundary resetKey={pathname}>
            <Outlet context={{ openSearch: () => setPalette(true) }} />
          </ErrorBoundary>
        </main>
      </div>
      <MobileNav />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
