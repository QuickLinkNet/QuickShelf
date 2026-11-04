import { lang } from '../i18n';
/** "Strg" on Windows/Linux, "⌘" on macOS. */
export const MOD_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : lang === 'de' ? 'Strg' : 'Ctrl';
