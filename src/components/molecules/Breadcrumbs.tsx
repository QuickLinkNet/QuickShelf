import { ChevronRight, Home } from 'lucide-react';
import { crumbs, prettyName } from '../../lib/paths';
import { cx } from '../../lib/cx';
import { t } from '../../i18n';

type Props = { path: string; onOpen: (path: string) => void; className?: string };

/** Clickable path; long paths scroll horizontally instead of wrapping. */
export default function Breadcrumbs({ path, onOpen, className }: Props) {
  const parts = crumbs(path);
  return (
    <nav aria-label={t('Ordnerpfad')} className={cx('flex items-center gap-0.5 overflow-x-auto whitespace-nowrap text-sm', className)}>
      {parts.map((c, i) => {
        const last = i === parts.length - 1;
        return (
          <span key={c.path} className="flex items-center">
            {i > 0 && <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />}
            <button
              onClick={() => onOpen(c.path)}
              aria-current={last ? 'page' : undefined}
              className={cx('sensitive flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors', last ? 'font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}
            >
              {i === 0 && <Home className="h-3.5 w-3.5" />}
              {i === 0 ? c.name : prettyName(c.name)}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
