import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { post, urls } from '../../../api/client';
import type { ApiItem } from '../../../api/types';
import { useHotkeys } from '../../../hooks/useHotkeys';
import { cx } from '../../../lib/cx';
import { viewerKind } from '../../../lib/fileTypes';
import { dirname } from '../../../lib/paths';
import { useMetaState } from '../../../state/meta';
import FileIcon from '../../atoms/FileIcon';
import IconButton from '../../atoms/IconButton';
import Modal from '../../molecules/Modal';
import DetailsPanel from '../DetailsPanel';
import Viewer from './Viewer';
import { t } from '../../../i18n';

type Props = { list: ApiItem[]; index: number; onIndex: (i: number) => void; onClose: () => void };

export default function PreviewModal({ list, index, onIndex, onClose }: Props) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useMetaState();
  const [info, setInfo] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  const item = list[index];
  const many = list.length > 1;

  useEffect(() => {
    if (item) void post('/meta/view', { path: item.path }).catch(() => undefined);
  }, [item?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (delta: number) => onIndex((index + delta + list.length) % list.length);
  const keys = useMemo(
    () => [
      { key: 'ArrowRight', handler: () => many && go(1) },
      { key: 'ArrowLeft', handler: () => many && go(-1) },
      { key: 'i', handler: () => setInfo((v) => !v) },
      { key: 's', handler: () => item && void toggleFavorite(item.path) },
    ],
    [many, index, item] // eslint-disable-line react-hooks/exhaustive-deps
  );
  useHotkeys(keys, Boolean(item));

  // Warm the neighbours so stepping through photos feels instant.
  useEffect(() => {
    [list[index + 1], list[index - 1]].forEach((n) => {
      if (n && viewerKind(n.ext) === 'image') new Image().src = urls.inline(n.path);
    });
  }, [index, list]);

  if (!item) return null;
  const fav = isFavorite(item.path);

  return (
    <Modal open onClose={onClose} label={t('Vorschau: {v0}', { v0: item.name })} variant="full">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        <FileIcon ext={item.ext} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="sensitive truncate text-sm font-semibold">{item.name}</p>
          <button
            className="sensitive block max-w-full truncate text-left text-xs text-ink-3 hover:text-accent"
            onClick={() => { onClose(); navigate(`/files?path=${encodeURIComponent(dirname(item.path))}`); }}
          >
            {dirname(item.path)}{many ? ` · ${index + 1} / ${list.length}` : ''}
          </button>
        </div>
        {many && (
          <>
            <IconButton label={t('Vorherige Datei (←)')} onClick={() => go(-1)}><ChevronLeft className="h-5 w-5" /></IconButton>
            <IconButton label={t('Nächste Datei (→)')} onClick={() => go(1)}><ChevronRight className="h-5 w-5" /></IconButton>
          </>
        )}
        <IconButton label={fav ? 'Aus Merkliste entfernen (S)' : 'Zur Merkliste (S)'} active={fav} onClick={() => toggleFavorite(item.path)}>
          <Star className={cx('h-[18px] w-[18px]', fav && 'fill-current')} />
        </IconButton>
        <a href={urls.download(item.path)} aria-label={t('Herunterladen')} title={t('Herunterladen')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink">
          <Download className="h-[18px] w-[18px]" />
        </a>
        <IconButton label={t('Details (I)')} active={info} onClick={() => setInfo((v) => !v)} className="hidden sm:inline-flex"><Info className="h-[18px] w-[18px]" /></IconButton>
        <IconButton label={t('Schließen (Esc)')} onClick={onClose}><X className="h-5 w-5" /></IconButton>
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 bg-surface-2/40" data-autofocus tabIndex={-1}><Viewer item={item} /></main>
        {info && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line bg-surface sm:block xl:w-96">
            <DetailsPanel item={item} onNavigate={onClose} />
          </aside>
        )}
      </div>
    </Modal>
  );
}
