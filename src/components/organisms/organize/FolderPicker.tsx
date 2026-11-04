import { ArrowUp, FolderPlus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { get } from '../../../api/client';
import { organize } from '../../../api/organize';
import type { ApiItem, FolderInfo } from '../../../api/types';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatNumber } from '../../../lib/format';
import { dirname, join, prettyName } from '../../../lib/paths';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import FileIcon from '../../atoms/FileIcon';
import Spinner from '../../atoms/Spinner';
import Breadcrumbs from '../../molecules/Breadcrumbs';
import Modal from '../../molecules/Modal';
import { t } from '../../../i18n';

type Props = { open: boolean; start?: string; title?: string; onClose: () => void; onPick: (folder: string) => void };

/** Choose a destination folder: browse, search by name, or create a new folder on the spot. */
export default function FolderPicker({ open, start = '/', title = t('Zielordner wählen'), onClose, onPick }: Props) {
  const { toast } = useToast();
  const [path, setPath] = useState(start);
  const [info, setInfo] = useState<FolderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<ApiItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const q = useDebounce(query.trim(), 250);

  useEffect(() => {
    if (open) {
      setPath(start);
      setQuery('');
      setCreating(false);
    }
  }, [open, start]);

  const reload = (p: string) => {
    setLoading(true);
    return get<FolderInfo>('/folder', { path: p }).then(setInfo).catch(() => setInfo(null)).finally(() => setLoading(false));
  };
  useEffect(() => {
    if (open) void reload(path);
  }, [open, path]);

  useEffect(() => {
    if (!open || q.length < 2) return setFound([]);
    let live = true;
    get<{ items: ApiItem[] }>('/search', { query: q, type: 'dir', inpath: false, limit: 12, sort: 'path' })
      .then((r) => live && setFound(r.items))
      .catch(() => live && setFound([]));
    return () => { live = false; };
  }, [q, open]);

  const create = async () => {
    const target = join(path, name.trim());
    try {
      await organize.mkdir(target);
      toast(t('Ordner „{v0}“ angelegt', { v0: name.trim() }), 'ok');
      setName('');
      setCreating(false);
      setPath(target);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('Anlegen fehlgeschlagen'), 'warn');
    }
  };

  const list = q.length >= 2 ? found.map((f) => ({ name: f.path, path: f.path, files: -1 })) : (info?.children ?? []);
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="flex flex-col" style={{ maxHeight: '80vh' }}>
        <header className="border-b border-line px-5 py-4">
          <h2 className="h-sec">{title}</h2>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input data-autofocus className="input !pl-9" placeholder={t('Ordner suchen …')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('Ordner suchen')} />
          </div>
          {q.length < 2 && <Breadcrumbs path={path} onOpen={setPath} className="-mx-2 mt-2" />}
        </header>
        <div className="min-h-48 flex-1 overflow-y-auto p-2">
          {path !== '/' && q.length < 2 && (
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2" onClick={() => setPath(dirname(path))}>
              <ArrowUp className="h-4 w-4" /> {t('Eine Ebene höher')}
            </button>
          )}
          {loading && <div className="flex justify-center p-6 text-accent"><Spinner /></div>}
          {!loading && list.length === 0 && <p className="p-6 text-center text-sm text-ink-3">{q.length >= 2 ? t('Kein Ordner gefunden.') : t('Keine Unterordner.')}</p>}
          {list.map((c) => (
            <button key={c.path} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-2" onClick={() => (q.length >= 2 ? (setPath(c.path), setQuery('')) : setPath(c.path))}>
              <FileIcon dir size="sm" />
              <span className="sensitive min-w-0 flex-1 truncate text-sm">{q.length >= 2 ? c.path : prettyName(c.name)}</span>
              {c.files >= 0 && <span className="text-xs text-ink-3">{formatNumber(c.files)}</span>}
            </button>
          ))}
        </div>
        <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/50 px-5 py-3">
          {creating ? (
            <form className="flex flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void create(); }}>
              <input autoFocus className="input !h-9 !py-0" placeholder={t('Name des neuen Ordners')} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} aria-label={t('Name des neuen Ordners')} />
              <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>{t('Anlegen')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>{t('Abbrechen')}</Button>
            </form>
          ) : (
            <>
              <Button size="sm" icon={<FolderPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>{t('Neuer Ordner hier')}</Button>
              <span className="sensitive mx-2 min-w-0 flex-1 truncate text-right text-xs text-ink-3">{path}</span>
              <Button variant="primary" onClick={() => onPick(path)}>{t('Hierher verschieben')}</Button>
            </>
          )}
        </footer>
      </div>
    </Modal>
  );
}
