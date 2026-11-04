import { CalendarPlus, FolderInput, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { organize } from '../../../api/organize';
import type { ApiItem } from '../../../api/types';
import { useMoveSuggestions } from '../../../hooks/useMoveSuggestions';
import { dirname, join } from '../../../lib/paths';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import FolderPicker from './FolderPicker';
import { t } from '../../../i18n';

type Props = {
  item: ApiItem;
  /** Called after a successful move/rename with the new path. */
  onMoved: (newPath: string) => void;
  /** Folder that should not be suggested (e.g. the inbox itself). */
  avoid?: string;
};

const isoDate = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);

/** Rename + move controls with destination suggestions. Only shown when the API allows writing. */
export default function MoveBar({ item, onMoved, avoid = '' }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState(item.name);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const suggestions = useMoveSuggestions(item, avoid);
  useEffect(() => setName(item.name), [item.path, item.name]);

  const run = async (op: () => Promise<{ path: string; move_id: number }>, success: string) => {
    setBusy(true);
    try {
      const r = await op();
      toast(success, 'ok');
      onMoved(r.path);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Fehlgeschlagen', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const moveTo = (folder: string) => run(() => organize.move(item.path, join(folder, name.trim() || item.name)), t('Verschoben nach {folder}', { folder }));
  const rename = () => name.trim() && name.trim() !== item.name && run(() => organize.rename(item.path, name.trim()), 'Umbenannt');
  const dated = /^\d{4}-\d{2}-\d{2}_/.test(name);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3" htmlFor="rename">{t('Name')}</label>
        <div className="flex gap-2">
          <input id="rename" className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rename()} />
          <Button icon={<Pencil className="h-4 w-4" />} onClick={rename} disabled={busy || !name.trim() || name.trim() === item.name} aria-label={t('Umbenennen')}>{t('Umbenennen')}</Button>
        </div>
        {!dated && (
          <button className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline" onClick={() => setName(`${isoDate(item.modified)}_${name}`)}>
            <CalendarPlus className="h-3.5 w-3.5" /> {t('Datum voranstellen ({date}_)', { date: isoDate(item.modified) })}
          </button>
        )}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">{t('Verschieben nach')}</p>
        <div className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <button key={s.folder} disabled={busy} onClick={() => moveTo(s.folder)} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm transition hover:border-accent hover:bg-accent-soft disabled:opacity-50" title={t('Ähnliche Dateien liegen hier (Treffer {v0})', { v0: s.score })}>
              <FolderInput className="h-4 w-4 shrink-0 text-accent" />
              <span className="sensitive min-w-0 flex-1 truncate">{s.folder}</span>
              <span className="text-[10px] font-semibold uppercase text-ink-3">{t('Vorschlag')}</span>
            </button>
          ))}
          <Button variant="primary" icon={<FolderInput className="h-4 w-4" />} onClick={() => setPicker(true)} disabled={busy}>{t('Ordner wählen …')}</Button>
        </div>
      </div>
      <FolderPicker open={picker} start={dirname(item.path) === avoid ? '/' : dirname(item.path)} onClose={() => setPicker(false)} onPick={(f) => { setPicker(false); void moveTo(f); }} />
    </div>
  );
}
