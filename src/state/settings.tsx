import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { t } from '../i18n';

export type Theme = 'system' | 'hell' | 'dunkel';
export type Accent = 'violett' | 'blau' | 'smaragd' | 'orange' | 'rosa';
export type ViewMode = 'liste' | 'kacheln';

export type Settings = {
  theme: Theme;
  accent: Accent;
  compact: boolean;
  view: ViewMode;
  privacy: boolean;
  contentSearch: boolean;
  autoIndex: boolean;
  /** Top-level folders ignored by the clean-up analysis (e.g. bought 3D libraries). */
  skipAreas: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  accent: 'violett',
  compact: false,
  view: 'liste',
  privacy: false,
  contentSearch: false,
  autoIndex: true,
  skipAreas: [],
};

type Ctx = { settings: Settings; set: <K extends keyof Settings>(key: K, value: Settings[K]) => void; reset: () => void; dark: boolean };
const SettingsContext = createContext<Ctx | null>(null);

function systemDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<Settings>('nas.settings', DEFAULT_SETTINGS);
  const dark = settings.theme === 'dunkel' || (settings.theme === 'system' && systemDark());

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = settings.theme === 'dunkel' || (settings.theme === 'system' && systemDark());
      root.classList.toggle('dark', isDark);
      root.dataset.accent = settings.accent;
      root.classList.toggle('privacy', settings.privacy);
      root.dataset.density = settings.compact ? 'compact' : 'comfort';
    };
    apply();
    if (settings.theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme, settings.accent, settings.privacy, settings.compact]);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      dark,
      set: (key, v) => setSettings((prev) => ({ ...prev, [key]: v })),
      reset: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings, dark, setSettings]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error(t('useSettings braucht den SettingsProvider'));
  return ctx;
}
