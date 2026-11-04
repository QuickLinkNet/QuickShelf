import { t } from '../i18n';
/** Client-side helpers for exporting lists (CSV download, clipboard text, AI prompt). */

const esc = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Semicolon CSV with BOM so Excel (German locale) opens umlauts correctly. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A ready-to-paste prompt that asks an AI assistant to propose better names / a better place for files. */
export function sortingPrompt(topic: string, paths: string[], root?: string): string {
  const prefix = root ? root.replace(/[\\/]+$/, '') : '';
  const list = paths.slice(0, 200).map((p) => `- ${prefix}${prefix ? p.replace(/\//g, '\\') : p}`).join('\n');
  return [
    t('Ich pflege ein persönliches Dateiarchiv. {topic}', { topic }),
    '',
    t('Bitte schau dir die Dateien an, schlage sprechende Namen im Muster „JJJJ-MM-TT_Absender_Art“ vor und sage mir, in welchen Themenordner sie gehören.'),
    t('Wichtig: erst eine Liste zum Absegnen erstellen, nichts verschieben oder löschen, bevor ich zustimme.'),
    '',
    `${t('Dateien')} (${Math.min(paths.length, 200)}${paths.length > 200 ? ` ${t('von')} ${paths.length}` : ''}):`,
    list,
  ].join('\n');
}
