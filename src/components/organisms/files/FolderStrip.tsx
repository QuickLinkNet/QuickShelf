import { CalendarRange, Files, HardDrive } from 'lucide-react';
import type { FolderInfo } from '../../../api/types';
import { GROUP_COLOR, type FileGroup } from '../../../lib/fileTypes';
import { formatBytes, formatDate, formatNumber } from '../../../lib/format';
import Skeleton from '../../atoms/Skeleton';
import { t, tl } from '../../../i18n';

/** One-line summary of the open folder with a stacked bar of its file types. */
export default function FolderStrip({ info }: { info: FolderInfo | null }) {
  if (!info) return <Skeleton className="h-12 w-full rounded-xl" />;
  const total = info.types.reduce((s, t) => s + t.files, 0) || 1;
  return (
    <div className="card flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="flex items-center gap-2"><Files className="h-4 w-4 text-accent" /><b>{formatNumber(info.files)}</b> {tl('Dateien')}</span>
        <span className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-accent" /><b>{formatBytes(info.bytes)}</b></span>
        {info.oldest && info.newest && (
          <span className="flex items-center gap-2 text-ink-2"><CalendarRange className="h-4 w-4 text-accent" />{formatDate(info.oldest)} – {formatDate(info.newest)}</span>
        )}
      </div>
      {info.types.length > 0 && (
        <div className="flex-1 sm:max-w-xs sm:ml-auto" title={info.types.map((ty) => `${t(ty.label)}: ${formatNumber(ty.files)}`).join(' · ')}>
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
            {info.types.map((t) => <span key={t.key} style={{ width: `${(t.files / total) * 100}%`, background: GROUP_COLOR[t.key as FileGroup] ?? '#94a3b8' }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
