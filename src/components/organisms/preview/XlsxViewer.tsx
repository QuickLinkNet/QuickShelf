import { useEffect, useState } from 'react';
import { urls } from '../../../api/client';
import { cx } from '../../../lib/cx';
import Spinner from '../../atoms/Spinner';
import ErrorNote from '../../molecules/ErrorNote';
import { locale, t } from '../../../i18n';

type Sheet = { sheet: string; data: unknown[][] };

const cell = (v: unknown): string => (v instanceof Date ? v.toLocaleDateString(locale) : v === null || v === undefined ? '' : String(v));

export default function XlsxViewer({ path }: { path: string }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setSheets(null);
    setError(null);
    setIdx(0);
    (async () => {
      const res = await fetch(urls.inline(path));
      if (!res.ok) throw new Error(t('API Fehler ({v0})', { v0: res.status }));
      const { default: readExcelFile } = await import('read-excel-file/browser');
      const result = (await readExcelFile(await res.blob())) as Sheet[];
      if (live) setSheets(result);
    })().catch((e: Error) => live && setError(e.message || t('Vorschau fehlgeschlagen')));
    return () => {
      live = false;
    };
  }, [path]);

  if (error) return <div className="p-6"><ErrorNote message={error} /></div>;
  if (!sheets) return <div className="flex justify-center p-16 text-accent"><Spinner className="h-8 w-8" /></div>;
  const current = sheets[idx];

  return (
    <div className="flex h-full flex-col">
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2">
          {sheets.map((s, i) => (
            <button key={s.sheet} data-on={i === idx} onClick={() => setIdx(i)} className={cx('chip whitespace-nowrap')}>
              {s.sheet}
            </button>
          ))}
        </div>
      )}
      <div className="sensitive flex-1 overflow-auto p-4">
        {current && current.data.length > 0 ? (
          <table className="min-w-full border-collapse text-xs">
            <tbody>
              {current.data.slice(0, 500).map((row, r) => (
                <tr key={r} className={r === 0 ? 'sticky top-0 bg-surface-2 font-semibold' : 'odd:bg-surface-2/40'}>
                  {row.map((c, k) => (
                    <td key={k} className="whitespace-nowrap border border-line px-2 py-1">{cell(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{t('Tabelle ist leer.')}</p>
        )}
        {current && current.data.length > 500 && <p className="mt-2 text-xs text-ink-3">{t('Nur die ersten 500 Zeilen werden angezeigt.')}</p>}
      </div>
    </div>
  );
}
