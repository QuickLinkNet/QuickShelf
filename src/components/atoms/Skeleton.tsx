import { cx } from '../../lib/cx';

/** Shimmering placeholder box. Size it with Tailwind classes, e.g. <Skeleton className="h-4 w-1/2" />. */
export default function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className ?? 'h-4 w-full')} aria-hidden="true" />;
}
