import { en } from './en';

/**
 * Tiny i18n: the German source text is the key, so code stays readable.
 *   t('Dateien')                       -> 'Files' (en) / 'Dateien' (de)
 *   t('{n} Treffer', { n: 5 })         -> '5 results'
 * The language is chosen once at start-up (setting or browser language); changing it reloads the page.
 */
export type Lang = 'de' | 'en';
export type LangPref = Lang | 'auto';

const KEY = 'nas.lang';

export function readLangPref(): LangPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'de' || v === 'en' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function setLangPref(pref: LangPref): void {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage blocked */
  }
}

function detect(): Lang {
  if (import.meta.env.MODE === 'test') return 'de';
  const pref = readLangPref();
  if (pref !== 'auto') return pref;
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export const lang: Lang = detect();
/** Locale for Intl / toLocale*String. */
export const locale = lang === 'de' ? 'de-DE' : 'en-GB';

export function t(text: string, vars?: Record<string, string | number>): string {
  const translated = lang === 'en' ? en[text] ?? text : text;
  return vars ? translated.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : translated;
}

/** Plural helper: tn(n, 'Datei', 'Dateien') -> '1 file' / '3 files' in English via the same dictionary. */
export function tn(n: number, one: string, many: string): string {
  return n === 1 ? t(one) : t(many);
}

/** Like t(), but lower-case in English – for words that follow a number ("12 files"). German nouns keep their capital. */
export function tl(text: string): string {
  const translated = t(text);
  return lang === 'en' ? translated.toLowerCase() : translated;
}
