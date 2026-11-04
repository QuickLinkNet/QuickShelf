import { locale } from '../../../i18n';
import { Play } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { ApiItem } from '../../../api/types';
import { cx } from '../../../lib/cx';
import { formatNumber } from '../../../lib/format';
import Thumb from '../../molecules/Thumb';

export type TileSize = 'klein' | 'mittel' | 'gross';
const COLS: Record<TileSize, string> = {
  klein: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10',
  mittel: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7',
  gross: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
};

const monthLabel = (ts: number) => new Date(ts * 1000).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

type Props = { items: ApiItem[]; size: TileSize; hasMore: boolean; onMore: () => void; onOpen: (item: ApiItem) => void; video?: boolean };

/** Photos grouped by month, with an IntersectionObserver sentinel that loads the next page. */
export default function PhotoGrid({ items, size, hasMore, onMore, onOpen, video }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !sentinel.current) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && onMore(), { rootMargin: '800px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, onMore, items.length]);

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: ApiItem[] }> = [];
    for (const it of items) {
      const label = monthLabel(it.modified);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(it);
      else out.push({ label, items: [it] });
    }
    return out;
  }, [items]);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label}>
          <h2 className="sticky top-16 z-10 -mx-1 mb-3 bg-bg/85 px-1 py-2 text-sm font-semibold backdrop-blur">
            {g.label} <span className="ml-1 font-normal text-ink-3">· {formatNumber(g.items.length)}</span>
          </h2>
          <div className={cx('grid gap-1.5 sm:gap-2', COLS[size])}>
            {g.items.map((p) => (
              <button
                key={p.path}
                onClick={() => onOpen(p)}
                title={p.name}
                className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2 outline-offset-2 transition-transform hover:z-[1] hover:scale-[1.03]"
              >
                <Thumb path={p.path} ext={p.ext} width={size === 'gross' ? 320 : 160} size="lg" className="!h-full !w-full !rounded-none ring-0" />
                {video && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"><Play className="h-5 w-5 fill-current" /></span></span>}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="sensitive block truncate">{p.name}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <div ref={sentinel} className="h-8" aria-hidden="true" />
    </div>
  );
}
