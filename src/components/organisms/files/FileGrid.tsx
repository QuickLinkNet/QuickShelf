import { Star } from 'lucide-react';
import type { ApiItem } from '../../../api/types';
import { cx } from '../../../lib/cx';
import { formatBytes } from '../../../lib/format';
import { hasThumbnail } from '../../../lib/fileTypes';
import { useMetaState } from '../../../state/meta';
import FileIcon from '../../atoms/FileIcon';
import Thumb from '../../molecules/Thumb';
import { t } from '../../../i18n';

type Props = {
  items: ApiItem[];
  onOpen: (item: ApiItem) => void;
  selected: Set<string>;
  onSelect: (path: string) => void;
};

/** Tile view: big thumbnails for images, icons for everything else. */
export default function FileGrid({ items, onOpen, selected, onSelect }: Props) {
  const { isFavorite, toggleFavorite } = useMetaState();
  return (
    <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {items.map((item) => {
        const isDir = item.type === 'dir';
        const on = selected.has(item.path);
        const fav = isFavorite(item.path);
        return (
          <div key={item.path} className={cx('group relative overflow-hidden rounded-2xl border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-card', on ? 'border-accent ring-2 ring-accent/30' : 'border-line')}>
            <button className="block w-full text-left" onClick={() => onOpen(item)}>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface-2/60">
                {hasThumbnail(item.ext) && !isDir ? (
                  <Thumb path={item.path} ext={item.ext} width={320} className="!h-full !w-full !rounded-none ring-0 transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <FileIcon ext={item.ext} dir={isDir} size="lg" />
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="sensitive truncate text-sm font-medium" title={item.name}>{item.name}</p>
                <p className="text-xs text-ink-3">{isDir ? t('Ordner') : `${(item.ext || t('Datei')).toUpperCase()} · ${formatBytes(item.size)}`}</p>
              </div>
            </button>
            {!isDir && (
              <>
                <input type="checkbox" checked={on} onChange={() => onSelect(item.path)} aria-label={t('{v0} auswählen', { v0: item.name })} className={cx('absolute left-2.5 top-2.5 h-4 w-4 accent-[rgb(var(--accent))]', !on && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')} />
                <button onClick={() => toggleFavorite(item.path)} aria-label={fav ? t('Aus Merkliste entfernen') : t('Zur Merkliste')} className={cx('absolute right-2 top-2 rounded-lg bg-surface/90 p-1.5 shadow backdrop-blur transition-opacity', fav ? 'text-accent' : 'text-ink-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
                  <Star className={cx('h-4 w-4', fav && 'fill-current')} />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
