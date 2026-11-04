import { useState } from 'react';
import { urls } from '../../api/client';
import { cx } from '../../lib/cx';
import { hasThumbnail } from '../../lib/fileTypes';
import FileIcon from '../atoms/FileIcon';

type Props = { path: string; ext?: string; dir?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string; width?: 160 | 320 | 640 };

const BOX = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' } as const;

/** Thumbnail for images, typed icon for everything else (and when the thumbnail fails to load). */
export default function Thumb({ path, ext, dir, size = 'md', className, width = 160 }: Props) {
  const [failed, setFailed] = useState(false);
  if (dir || failed || !hasThumbnail(ext)) return <FileIcon ext={ext} dir={dir} size={size} className={className} />;
  return (
    <img
      src={urls.thumb(path, width)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cx('sensitive shrink-0 bg-surface-2 object-cover ring-1 ring-line', BOX[size], className)}
    />
  );
}
