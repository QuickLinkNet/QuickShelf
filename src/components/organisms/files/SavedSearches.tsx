import { Bookmark, BookmarkPlus, X } from 'lucide-react';
import { useState } from 'react';
import { post } from '../../../api/client';
import type { SavedSearch } from '../../../api/types';
import { useApi } from '../../../hooks/useApi';
import { toUrlParams, fromUrlParams, type BrowserQuery } from '../../../lib/query';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import { t } from '../../../i18n';

type Props = { query: BrowserQuery; searching: boolean; onRun: (q: BrowserQuery) => void };

/** Saved searches as chips; while a search is active the current one can be saved under a name. */
export default function SavedSearches({ query, searching, onRun }: Props) {
  const { toast } = useToast();
  const { data, reload } = useApi<{ items: SavedSearch[] }>('/meta/searches', undefined, { ttl: 5000 });
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState('');

  const save = async () => {
    if (!label.trim()) return;
    try {
      await post('/meta/search', { label: label.trim(), params: toUrlParams(query) });
      toast(t('Suche gespeichert'), 'ok');
      setNaming(false);
      setLabel('');
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('Speichern fehlgeschlagen'), 'warn');
    }
  };
  const remove = async (id: number) => {
    await post('/meta/search/delete', { id }).catch(() => undefined);
    reload();
  };

  const items = data?.items ?? [];
  if (!searching && items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.length > 0 && <span className="flex items-center gap-1.5 text-xs font-medium text-ink-3"><Bookmark className="h-3.5 w-3.5" /> {t('Gespeichert')}</span>}
      {items.map((s) => (
        <span key={s.id} className="chip !gap-1 !pr-1.5">
          <button onClick={() => onRun(fromUrlParams(new URLSearchParams(s.params as Record<string, string>)))}>{s.label}</button>
          <button onClick={() => remove(s.id)} aria-label={t('{v0} löschen', { v0: s.label })} className="rounded-full p-0.5 text-ink-3 hover:bg-surface-3 hover:text-ink"><X className="h-3 w-3" /></button>
        </span>
      ))}
      {searching && !naming && (
        <Button size="sm" variant="ghost" icon={<BookmarkPlus className="h-4 w-4" />} onClick={() => { setNaming(true); setLabel(query.q); }}>{t('Suche merken')}</Button>
      )}
      {searching && naming && (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <input autoFocus className="input !h-8 !w-44 !py-0 text-xs" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} aria-label={t('Name der gespeicherten Suche')} />
          <Button size="sm" variant="primary" type="submit">{t('Speichern')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setNaming(false)}>{t('Abbrechen')}</Button>
        </form>
      )}
    </div>
  );
}
