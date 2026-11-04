import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  /** Visual style: centered dialog, full-screen viewer, or top-aligned palette. */
  variant?: 'dialog' | 'full' | 'palette';
  className?: string;
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';

/** Accessible modal: portal, ESC to close, focus trap, restores focus, locks background scroll. */
export default function Modal({ open, onClose, children, label, variant = 'dialog', className }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previous.current = document.activeElement as HTMLElement | null;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current;
    first?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      previous.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className={cx(
        'fixed inset-0 z-[70] flex animate-fade',
        variant === 'palette' ? 'items-start justify-center px-4 pt-[12vh]' : variant === 'full' ? 'items-stretch justify-stretch' : 'items-center justify-center p-4'
      )}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cx(
          'relative animate-pop outline-none',
          variant === 'full' ? 'flex h-full w-full flex-col bg-bg' : 'card max-h-[90vh] w-full overflow-hidden shadow-pop',
          variant === 'palette' && 'max-w-xl',
          variant === 'dialog' && 'max-w-lg',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
