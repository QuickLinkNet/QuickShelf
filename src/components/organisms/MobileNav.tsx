import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { NAV, isActivePath } from '../../nav';
import { cx } from '../../lib/cx';
import Modal from '../molecules/Modal';
import { t } from '../../i18n';

/** Bottom tab bar for phones; "Mehr" opens the remaining pages. */
export default function MobileNav() {
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  const main = NAV.filter((n) => n.mobile);
  const rest = NAV.filter((n) => !n.mobile);
  const restActive = rest.some((n) => isActivePath(pathname, n.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label={t('Hauptnavigation')}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {main.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link to={item.href} aria-current={active ? 'page' : undefined} className={cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', active ? 'text-accent' : 'text-ink-3')}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
                  {item.name}
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={() => setMore(true)} className={cx('flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', restActive ? 'text-accent' : 'text-ink-3')}>
              <MoreHorizontal className="h-5 w-5" />
              {t('Mehr')}
            </button>
          </li>
        </ul>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} label={t('Weitere Seiten')}>
        <ul className="divide-y divide-line">
          {rest.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link to={item.href} onClick={() => setMore(false)} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className="block text-xs text-ink-3">{item.hint}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
