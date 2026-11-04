import { Download, Eye, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { urls } from '../../api/client';
import type { ApiItem } from '../../api/types';
import { cx } from '../../lib/cx';
import { formatBytes, formatDate } from '../../lib/format';
import { viewerKind } from '../../lib/fileTypes';
import { dirname } from '../../lib/paths';
import { useMetaState } from '../../state/meta';
import { useSettings } from '../../state/settings';
import IconButton from '../atoms/IconButton';
import Thumb from './Thumb';
import { t } from '../../i18n';

type Props = {
  item: ApiItem;
  onOpen: (item: ApiItem) => void;
  /** Second line: defaults to the folder of the file. */
  subtitle?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  extra?: ReactNode;
  compact?: boolean;
};

/** One file in a list: thumbnail, name, location, date, size and quick actions. */
export default function FileRow({ item, onOpen, subtitle, selected, onSelect, extra, compact }: Props) {
  const { isFavorite, toggleFavorite } = useMetaState();
  const { settings } = useSettings();
  const dense = compact ?? settings.compact;
  const fav = isFavorite(item.path);
  const isDir = item.type === 'dir';
  const canView = isDir || viewerKind(item.ext) !== null;

  return (
    <div
      className={cx(
        'group flex items-center gap-3 border-b border-line/70 px-3 transition-colors last:border-b-0 hover:bg-surface-2/70 sm:px-4',
        dense ? 'py-2' : 'py-3',
        selected && 'bg-accent-soft/60'
      )}
    >
      {onSelect && (
        <input type="checkbox" checked={Boolean(selected)} onChange={onSelect} aria-label={t('{v0} auswählen', { v0: item.name })} className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]" />
      )}
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(item)}>
        <Thumb path={item.path} ext={item.ext} dir={isDir} size={dense ? 'sm' : 'md'} />
        <span className="min-w-0">
          <span className="sensitive block truncate text-sm font-medium">{item.name}</span>
          <span className="sensitive block truncate text-xs text-ink-3">{subtitle ?? (isDir ? t('Ordner') : dirname(item.path))}</span>
          {item.snippet && <span className="sensitive mt-0.5 line-clamp-2 text-xs text-ink-2">{item.snippet}</span>}
        </span>
      </button>
      {extra}
      <span className="hidden w-24 shrink-0 text-right text-xs text-ink-3 md:block">{item.type === 'file' ? formatDate(item.modified) : ''}</span>
      <span className="hidden w-20 shrink-0 text-right text-xs font-medium text-ink-2 sm:block">{item.type === 'file' ? formatBytes(item.size) : ''}</span>
      <div className="flex shrink-0 items-center">
        {!isDir && (
          <IconButton label={fav ? t('Aus Merkliste entfernen') : t('Zur Merkliste')} active={fav} size="sm" onClick={() => toggleFavorite(item.path)} className={cx(!fav && 'sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100')}>
            <Star className={cx('h-4 w-4', fav && 'fill-current')} />
          </IconButton>
        )}
        {!isDir && canView && (
          <IconButton label={t('Vorschau')} size="sm" onClick={() => onOpen(item)} className="hidden sm:inline-flex"><Eye className="h-4 w-4" /></IconButton>
        )}
        {!isDir && (
          <a href={urls.download(item.path)} aria-label={t('Herunterladen')} title={t('Herunterladen')} className="hidden h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink sm:inline-flex">
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
