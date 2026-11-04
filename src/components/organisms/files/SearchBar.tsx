import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { BrowserQuery } from '../../../lib/query';
import Button from '../../atoms/Button';
import Segmented from '../../atoms/Segmented';
import Spinner from '../../atoms/Spinner';
import { t } from '../../../i18n';

type Props = {
  query: BrowserQuery;
  loading: boolean;
  onSubmit: (patch: Partial<BrowserQuery>) => void;
  onClear: () => void;
};

/** Search field with Enter-to-search (the NAS is slow, so no search-as-you-type) and scope options. */
export default function SearchBar({ query, loading, onSubmit, onClear }: Props) {
  const [text, setText] = useState(query.q);
  useEffect(() => setText(query.q), [query.q]);
  const searching = query.q !== '';

  const submit = (patch: Partial<BrowserQuery> = {}) => {
    const q = text.trim();
    if (q) onSubmit({ q, ...patch });
  };

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }} role="search">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Segmented
          label={t('Was suchen')}
          value={query.mode}
          onChange={(mode) => onSubmit({ mode, q: text.trim() || query.q })}
          options={[{ value: 'file', label: t('Dateien') }, { value: 'dir', label: t('Ordner') }]}
        />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
          <input
            className="input !h-11 !pl-10 !pr-10"
            type="search"
            enterKeyHint="search"
            placeholder={query.mode === 'file' ? t('Dateiname suchen und Enter drücken …') : t('Ordnername suchen und Enter drücken …')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t('Suchbegriff')}
          />
          {text && (
            <button type="button" aria-label={t('Eingabe löschen')} onClick={() => { setText(''); if (searching) onClear(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" variant="primary" className="h-11 sm:min-w-32" disabled={text.trim() === ''}>
          {loading && searching ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          {t('Suchen')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
        {query.mode === 'file' && (
          <>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-[rgb(var(--accent))]" checked={query.inPath} onChange={(e) => submit({ inPath: e.target.checked })} /> {t('Ordnernamen mitsuchen')}</label>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-[rgb(var(--accent))]" checked={query.content} onChange={(e) => submit({ content: e.target.checked })} /> {t('Im Dokumentinhalt suchen')}</label>
          </>
        )}
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="accent-[rgb(var(--accent))]" checked={query.here} onChange={(e) => submit({ here: e.target.checked })} /> {t('Nur in diesem Ordner')}</label>
      </div>
    </form>
  );
}
