import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import IconButton from '../atoms/IconButton';
import { t } from '../../i18n';

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Right-hand drawer (details). Full width on phones. */
export default function SideSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end animate-fade">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-label={title} className="relative flex h-full w-full max-w-md animate-rise flex-col border-l border-line bg-surface shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="h-sec">{title}</h2>
          <IconButton label={t('Schließen')} onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
