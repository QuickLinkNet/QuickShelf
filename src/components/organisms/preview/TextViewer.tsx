import { useEffect, useState } from 'react';
import { urls } from '../../../api/client';
import Spinner from '../../atoms/Spinner';
import ErrorNote from '../../molecules/ErrorNote';
import { t } from '../../../i18n';

const LIMIT = 200_000;

/** Minimal CSV parser (quotes, ; or , separators) – enough for a read-only table preview. */
export function parseCsv(text: string): string[][] {
  const first = text.split('\n', 1)[0] ?? '';
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length && rows.length < 501; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export default function TextViewer({ path, csv }: { path: string; csv?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setText(null);
    setError(null);
    fetch(urls.inline(path))
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(t('API Fehler ({v0})', { v0: r.status })))))
      .then((text) => live && setText(text.length > LIMIT ? `${text.slice(0, LIMIT)}
${t('… (gekürzt)')}` : text))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [path]);

  if (error) return <div className="p-6"><ErrorNote message={error} /></div>;
  if (text === null) return <div className="flex justify-center p-16 text-accent"><Spinner className="h-8 w-8" /></div>;
  if (csv) {
    const rows = parseCsv(text);
    return (
      <div className="sensitive h-full overflow-auto p-4">
        <table className="min-w-full border-collapse text-xs">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i === 0 ? 'sticky top-0 bg-surface-2 font-semibold' : 'odd:bg-surface-2/40'}>
                {r.map((c, j) => (
                  <td key={j} className="max-w-xs truncate whitespace-nowrap border border-line px-2 py-1">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 500 && <p className="mt-2 text-xs text-ink-3">{t('Nur die ersten 500 Zeilen werden angezeigt.')}</p>}
      </div>
    );
  }
  return <pre className="sensitive h-full overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[13px] leading-relaxed">{text || '(leer)'}</pre>;
}
