import { Link, useLocation } from 'react-router-dom';
import { Database, FolderTree, PanelLeft } from 'lucide-react';
import { NAV, isActivePath } from '../../nav';
import { cx } from '../../lib/cx';
import { formatNumber, formatRelative } from '../../lib/format';
import { useArchive } from '../../state/archive';
import Badge from '../atoms/Badge';
import IconButton from '../atoms/IconButton';
import Spinner from '../atoms/Spinner';
import { t, tl } from '../../i18n';

type Props = { collapsed: boolean; onToggle: () => void };

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label={t('QuickShelf – zur Übersicht')}>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-9 w-9 shrink-0 rounded-xl shadow-sm" />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight">QuickShelf</span>
          <span className="block text-[11px] font-medium text-ink-3">{t('persönliches Cockpit')}</span>
        </span>
      )}
    </Link>
  );
}

function IndexCard({ collapsed }: { collapsed: boolean }) {
  const { status, indexing, reindex, offline } = useArchive();
  if (collapsed) {
    return (
      <IconButton label={indexing ? t('Indexiere …') : t('Index aktualisieren')} onClick={reindex} disabled={indexing} className="mx-auto">
        {indexing ? <Spinner className="h-4 w-4" /> : <Database className="h-4 w-4" />}
      </IconButton>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <FolderTree className="h-4 w-4 text-accent" />
          {t('Suchindex')}
        </span>
        {offline ? <Badge tone="bad">{t('offline')}</Badge> : status?.read_only ? <Badge tone="ok">{t('nur lesend')}</Badge> : <Badge tone="warn">{t('schreibend')}</Badge>}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-2">
        {status?.ready ? (
          <>
            <b className="text-ink">{formatNumber(status.files)}</b> {tl('Dateien')}
            <br />
            {t('Stand')} {formatRelative(status.updated)}
          </>
        ) : (
          t('Noch nicht aufgebaut')
        )}
      </p>
      <button
        onClick={reindex}
        disabled={indexing || offline}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-surface py-1.5 text-xs font-semibold text-ink shadow-sm ring-1 ring-line transition hover:ring-accent disabled:opacity-60"
      >
        {indexing ? <Spinner className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
        {indexing ? t('Indexiere …') : t('Aktualisieren')}
      </button>
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { pathname } = useLocation();
  return (
    <aside
      className={cx(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface/80 px-3 py-4 backdrop-blur-xl transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      <div className={cx('mb-6 flex items-center px-1.5', collapsed ? 'justify-center' : 'justify-between')}>
        <Brand compact={collapsed} />
        {!collapsed && (
          <IconButton label={t('Seitenleiste einklappen')} onClick={onToggle} size="sm">
            <PanelLeft className="h-4 w-4" />
          </IconButton>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label={t('Hauptnavigation')}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.name : undefined}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent" />}
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.3 : 1.9} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 space-y-3">
        <IndexCard collapsed={collapsed} />
        {collapsed && (
          <IconButton label={t('Seitenleiste ausklappen')} onClick={onToggle} className="mx-auto">
            <PanelLeft className="h-4 w-4 rotate-180" />
          </IconButton>
        )}
      </div>
    </aside>
  );
}
