import type { ReactNode } from 'react';
import type { ApiItem } from '../../api/types';
import { formatRelative } from '../../lib/format';
import { usePreview } from '../../state/preview';
import Skeleton from '../atoms/Skeleton';
import FileRow from '../molecules/FileRow';
import SectionTitle from '../molecules/SectionTitle';

type Props = {
  title: string;
  hint?: string;
  items: ApiItem[] | null;
  empty: ReactNode;
  action?: ReactNode;
  showTime?: boolean;
  limit?: number;
};

/** Card with a short list of files that open in the viewer (recent, favourites …). */
export default function FileListCard({ title, hint, items, empty, action, showTime, limit = 8 }: Props) {
  const preview = usePreview();
  const shown = items?.slice(0, limit) ?? null;
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-5"><SectionTitle title={title} hint={hint} action={action} /></div>
      {!shown && (
        <div className="space-y-3 px-5 pb-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      )}
      {shown && shown.length === 0 && <div className="px-5 pb-6 text-sm text-ink-3">{empty}</div>}
      {shown && shown.length > 0 && (
        <div>
          {shown.map((f) => (
            <FileRow
              key={f.path}
              item={f}
              compact
              onOpen={(i) => preview.open(i, items ?? undefined)}
              subtitle={showTime ? `${formatRelative(f.modified)} · ${f.path.split('/').slice(1, -1).join(' › ')}` : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
