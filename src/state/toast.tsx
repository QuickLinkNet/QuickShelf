import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from '../lib/cx';
import { t } from '../i18n';

type Kind = 'ok' | 'warn' | 'info';
type Toast = { id: number; kind: Kind; text: string };
type Ctx = { toast: (text: string, kind?: Kind) => void };

const ToastContext = createContext<Ctx>({ toast: () => undefined });

const ICON = { ok: CheckCircle2, warn: AlertTriangle, info: Info } as const;
const TONE: Record<Kind, string> = { ok: 'text-ok', warn: 'text-warn', info: 'text-accent' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (text: string, kind: Kind = 'info') => {
      const id = next.current++;
      setItems((list) => [...list.slice(-3), { id, kind, text }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        {items.map((item) => {
          const Icon = ICON[item.kind];
          return (
            <div key={item.id} className="card pointer-events-auto flex max-w-md animate-pop items-center gap-3 px-4 py-3 text-sm shadow-pop">
              <Icon className={cx('h-5 w-5 shrink-0', TONE[item.kind])} />
              <span className="flex-1 text-ink">{item.text}</span>
              <button onClick={() => dismiss(item.id)} className="text-ink-3 hover:text-ink" aria-label={t('Schließen')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): Ctx => useContext(ToastContext);
