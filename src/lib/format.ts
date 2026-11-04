import { lang, locale, t } from '../i18n';
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(size: number | null | undefined, digits = 1): string {
  if (size === null || size === undefined || Number.isNaN(size)) return '–';
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < UNITS.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const shown = idx === 0 || value >= 100 ? value.toFixed(0) : value.toFixed(digits);
  return `${shown.replace('.', lang === 'de' ? ',' : '.')} ${UNITS[idx]}`;
}

export const formatNumber = (n: number): string => n.toLocaleString(locale);

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '–';
  return new Date(ts * 1000).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '–';
  return new Date(ts * 1000).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "vor 3 Stunden", "gestern", "vor 2 Wochen" … */
export function formatRelative(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return '–';
  const diff = Math.max(0, now / 1000 - ts);
  if (diff < 45) return t('gerade eben');
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (diff < 604800) return rtf.format(-Math.round(diff / 86400), 'day');
  if (diff < 2629800) return rtf.format(-Math.round(diff / 604800), 'week');
  if (diff < 31557600) return rtf.format(-Math.round(diff / 2629800), 'month');
  return rtf.format(-Math.round(diff / 31557600), 'year');
}

export const plural = (n: number, one: string, many: string): string => `${formatNumber(n)} ${t(n === 1 ? one : many)}`;

export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Greeting by time of day. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return t('Noch wach?');
  if (h < 11) return t('Guten Morgen');
  if (h < 17) return t('Guten Tag');
  if (h < 22) return t('Guten Abend');
  return t('Gute Nacht');
}
