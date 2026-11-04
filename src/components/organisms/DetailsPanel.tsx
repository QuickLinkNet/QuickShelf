import { Copy, FolderOpen, Hash, StickyNote, Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiItem } from '../../api/types';
import { useMeta } from '../../hooks/useMeta';
import { GROUP_LABEL, groupOf } from '../../lib/fileTypes';
import { formatBytes, formatDateTime } from '../../lib/format';
import { dirname } from '../../lib/paths';
import { useArchive } from '../../state/archive';
import { useMetaState } from '../../state/meta';
import { useToast } from '../../state/toast';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import MoveBar from './organize/MoveBar';
import FileIcon from '../atoms/FileIcon';
import { t } from '../../i18n';

type Props = { item: ApiItem; onNavigate?: () => void };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

/** Metadata, tags and note of one file – used in the viewer and in the file browser. */
export default function DetailsPanel({ item, onNavigate }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tags: allTags } = useMetaState();
  const { canWrite } = useArchive();
  const { meta, addTag, removeTag, saveNote } = useMeta(item.path);
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => setNote(meta?.note ?? ''), [meta?.note, item.path]);

  const folder = dirname(item.path);
  const suggestions = allTags.filter((t) => !meta?.tags.includes(t.tag) && t.tag.toLowerCase().includes(tag.toLowerCase())).slice(0, 6);
  const submitTag = () => {
    if (tag.trim()) void addTag(tag.trim());
    setTag('');
  };

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-center gap-3">
        <FileIcon ext={item.ext} dir={item.type === 'dir'} size="lg" />
        <div className="min-w-0">
          <p className="sensitive break-words text-sm font-semibold leading-snug">{item.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="accent">{item.type === 'dir' ? t('Ordner') : (item.ext || t('Datei')).toUpperCase()}</Badge>
            {item.type === 'file' && <Badge>{GROUP_LABEL[groupOf(item.ext)]}</Badge>}
          </div>
        </div>
      </div>

      <dl className="divide-y divide-line rounded-xl border border-line px-3.5">
        <Row label={t('Größe')}>{formatBytes(item.size)}</Row>
        <Row label={t('Geändert')}>{formatDateTime(item.modified)}</Row>
        {meta && meta.views > 0 && <Row label={t('Geöffnet')}>{meta.views}×</Row>}
        <Row label={t('Ordner')}>
          <button className="sensitive text-accent hover:underline" onClick={() => { onNavigate?.(); navigate(`/files?path=${encodeURIComponent(folder)}`); }}>
            {folder}
          </button>
        </Row>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => navigator.clipboard?.writeText(item.path).then(() => toast(t('Pfad kopiert'), 'ok'))}>
          {t('Pfad kopieren')}
        </Button>
        <Button size="sm" icon={<FolderOpen className="h-3.5 w-3.5" />} onClick={() => { onNavigate?.(); navigate(`/files?path=${encodeURIComponent(folder)}`); }}>
          {t('Ordner öffnen')}
        </Button>
      </div>

      {canWrite && item.type === 'file' && (
        <section className="rounded-xl border border-line p-3.5">
          <MoveBar item={item} onMoved={() => onNavigate?.()} />
        </section>
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-3"><Tag className="h-3.5 w-3.5" /> {t('Tags')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {meta?.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-2.5 pr-1.5 text-xs font-medium text-accent">
              <Hash className="h-3 w-3" />{tag}
              <button onClick={() => removeTag(tag)} aria-label={t('Tag {tag} entfernen', { tag })} className="rounded-full p-0.5 hover:bg-accent/20"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="relative mt-2">
          <input
            className="input !py-2"
            placeholder={t('Tag hinzufügen … (Enter)')}
            value={tag}
            maxLength={40}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submitTag())}
          />
          {tag && suggestions.length > 0 && (
            <ul className="card absolute inset-x-0 top-full z-10 mt-1 overflow-hidden p-1 shadow-pop">
              {suggestions.map((s) => (
                <li key={s.tag}>
                  <button className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { void addTag(s.tag); setTag(''); }}>
                    <span>#{s.tag}</span>
                    <span className="text-xs text-ink-3">{s.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-3"><StickyNote className="h-3.5 w-3.5" /> {t('Notiz')}</h3>
        <textarea
          className="input min-h-24 resize-y"
          placeholder={t('z. B. „Original liegt im Ordner, Frist bis 31.03.“')}
          value={note}
          maxLength={5000}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (meta?.note ?? '') && saveNote(note)}
        />
        <p className="mt-1 text-xs text-ink-3">{t('Wird beim Verlassen des Feldes gespeichert – nicht im Archiv, sondern in der API-Datenbank.')}</p>
      </section>
    </div>
  );
}
