import {
  Archive, Box, Code2, File, FileSpreadsheet, FileText, Film, Folder, Image as ImageIcon, Music, type LucideIcon,
} from 'lucide-react';
import { cx } from '../../lib/cx';
import { GROUP_COLOR, groupOf, type FileGroup } from '../../lib/fileTypes';

const ICON: Record<FileGroup, LucideIcon> = {
  dokumente: FileText,
  tabellen: FileSpreadsheet,
  bilder: ImageIcon,
  videos: Film,
  audio: Music,
  '3d': Box,
  code: Code2,
  archive: Archive,
  sonstiges: File,
};

type Props = { ext?: string; dir?: boolean; className?: string; size?: 'sm' | 'md' | 'lg' };

/** Tinted rounded square with an icon matching the file group (or a folder). */
export default function FileIcon({ ext, dir, className, size = 'md' }: Props) {
  const group = groupOf(ext);
  const Icon = dir ? Folder : ICON[group];
  const color = dir ? 'rgb(var(--accent))' : GROUP_COLOR[group];
  const box = size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <span
      className={cx('flex shrink-0 items-center justify-center', box, className)}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <Icon className={icon} strokeWidth={dir ? 2.2 : 1.9} />
    </span>
  );
}
