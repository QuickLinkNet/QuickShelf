import { CornerDownLeft, Database, EyeOff, Folder, History, Moon, Search as SearchIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../../api/client';
import type { ApiItem, Overview } from '../../api/types';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { cx } from '../../lib/cx';
import { dirname, prettyName } from '../../lib/paths';
import { NAV } from '../../nav';
import { useArchive } from '../../state/archive';
import { usePreview } from '../../state/preview';
import { useSettings } from '../../state/settings';
import FileIcon from '../atoms/FileIcon';
import Kbd from '../atoms/Kbd';
import Spinner from '../atoms/Spinner';
import Modal from '../molecules/Modal';
import { locale, t } from '../../i18n';

type Entry = { id: string; group: string; label: string; hint?: string; icon?: LucideIcon; file?: ApiItem; run: () => void };
type Props = { open: boolean; onClose: () => void };

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const preview = usePreview();
  const { settings, set, dark } = useSettings();
  const { reindex } = useArchive();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [files, setFiles] = useState<ApiItem[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const q = useDebounce(query.trim(), 200);

  const overview = useApi<Overview>(open ? '/overview' : null, undefined, { ttl: 300_000 });
  const recent = useApi<{ items: ApiItem[] }>(open ? '/meta/recent' : null, { limit: 5 }, { ttl: 10_000 });

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setFiles([]);
  }, [open]);

  useEffect(() => {
    if (!open || q.length < 2) {
      setFiles([]);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    // "#steuer" lists everything carrying that tag; anything else is a normal search.
    const request = q.startsWith('#')
      ? get<{ items: ApiItem[] }>('/meta/favorites', { tag: q.slice(1).trim() }, controller.signal)
      : get<{ items: ApiItem[] }>('/search', { query: q, limit: 8, content: settings.contentSearch, sort: 'modified', order: 'desc' }, controller.signal);
    request
      .then((r) => setFiles(r.items))
      .catch(() => undefined)
      .finally(() => !controller.signal.aborted && setBusy(false));
    return () => controller.abort();
  }, [q, open, settings.contentSearch]);

  const go = (to: string) => () => {
    onClose();
    navigate(to);
  };

  const entries = useMemo<Entry[]>(() => {
    const needle = query.trim().toLowerCase();
    const match = (s: string) => needle === '' || s.toLowerCase().includes(needle);
    const out: Entry[] = [];
    NAV.filter((n) => match(n.name)).forEach((n) => out.push({ id: `p${n.href}`, group: t('Seiten'), label: n.name, hint: n.hint, icon: n.icon, run: go(n.href) }));
    (overview.data?.areas ?? [])
      .filter((a) => match(a.name) || match(prettyName(a.name)))
      .forEach((a) => out.push({ id: `a${a.path}`, group: t('Bereiche'), label: prettyName(a.name), hint: t('{v0} Dateien', { v0: a.files.toLocaleString(locale) }), icon: Folder, run: go(`/files?path=${encodeURIComponent(a.path)}`) }));
    const actions: Entry[] = [
      { id: 'x-index', group: t('Aktionen'), label: t('Suchindex aktualisieren'), icon: Database, run: () => { onClose(); void reindex(); } },
      { id: 'x-theme', group: t('Aktionen'), label: dark ? t('Helles Design einschalten') : t('Dunkles Design einschalten'), icon: Moon, run: () => { set('theme', dark ? 'hell' : 'dunkel'); onClose(); } },
      { id: 'x-privacy', group: t('Aktionen'), label: settings.privacy ? t('Diskreten Modus ausschalten') : t('Diskreter Modus einschalten'), icon: EyeOff, run: () => { set('privacy', !settings.privacy); onClose(); } },
    ];
    out.push(...actions.filter((a) => match(a.label)));
    if (needle === '') {
      (recent.data?.items ?? []).forEach((f) => out.push({ id: `r${f.path}`, group: t('Zuletzt geöffnet'), label: f.name, hint: dirname(f.path), file: f, icon: History, run: () => { onClose(); preview.open(f, recent.data?.items); } }));
    }
    files.forEach((f) => out.push({ id: `f${f.path}`, group: t('Dateien'), label: f.name, hint: dirname(f.path), file: f, run: () => { onClose(); preview.open(f, files); } }));
    if (needle.length >= 2) {
      out.push({ id: 'x-search', group: t('Suche'), label: t('„{v0}“ in allen Dateien suchen', { v0: query.trim() }), icon: SearchIcon, run: go(`/files?q=${encodeURIComponent(query.trim())}`) });
    }
    return out;
  }, [query, files, overview.data, recent.data, dark, settings.privacy]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((a) => Math.min(entries.length - 1, a + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      entries[active]?.run();
    }
  };

  let lastGroup = '';
  return (
    <Modal open={open} onClose={onClose} label={t('Suche und Befehle')} variant="palette">
      <div className="flex items-center gap-3 border-b border-line px-4">
        {busy ? <Spinner className="h-5 w-5 text-accent" /> : <SearchIcon className="h-5 w-5 text-ink-3" />}
        <input
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder={t('Datei, Ordner, Seite oder Befehl … (#Tag für Tags)')}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3"
          aria-label={t('Suchbegriff')}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
        />
        <Kbd>{t('Esc')}</Kbd>
      </div>
      <ul id="palette-list" ref={list} role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
        {entries.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-3">{busy ? t('Suche …') : t('Nichts gefunden.')}</li>}
        {entries.map((e, i) => {
          const header = e.group !== lastGroup ? e.group : null;
          lastGroup = e.group;
          const Icon = e.icon;
          return (
            <li key={e.id} role="presentation">
              {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{header}</p>}
              <button
                role="option"
                aria-selected={i === active}
                data-idx={i}
                onMouseMove={() => setActive(i)}
                onClick={e.run}
                className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === active ? 'bg-accent-soft' : 'hover:bg-surface-2')}
              >
                {e.file && e.group === t('Dateien') ? <FileIcon ext={e.file.ext} size="sm" /> : (
                  <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', i === active ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2')}>{Icon ? <Icon className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="sensitive block truncate text-sm font-medium">{e.label}</span>
                  {e.hint && <span className="sensitive block truncate text-xs text-ink-3">{e.hint}</span>}
                </span>
                {i === active && <CornerDownLeft className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-4 border-t border-line bg-surface-2/50 px-4 py-2 text-[11px] text-ink-3">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('wählen')}</span>
        <span className="flex items-center gap-1"><Kbd>↵</Kbd> {t('öffnen')}</span>
        <span className="ml-auto hidden sm:block">{t('Tipp: Mit Strg+K von überall erreichbar')}</span>
      </div>
    </Modal>
  );
}
