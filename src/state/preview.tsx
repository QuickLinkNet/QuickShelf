import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { ApiItem } from '../api/types';
import PreviewModal from '../components/organisms/preview/PreviewModal';

type Open = (item: ApiItem, siblings?: ApiItem[]) => void;
const PreviewContext = createContext<{ open: Open; close: () => void }>({ open: () => undefined, close: () => undefined });

/** Opens the viewer from anywhere; `siblings` enables ←/→ stepping through a list (photos, results …). */
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ list: ApiItem[]; index: number } | null>(null);

  const open = useCallback<Open>((item, siblings) => {
    const list = siblings && siblings.some((s) => s.path === item.path) ? siblings : [item];
    setState({ list, index: Math.max(0, list.findIndex((s) => s.path === item.path)) });
  }, []);
  const close = useCallback(() => setState(null), []);
  const { key } = useLocation();
  // Any navigation (links, back button, palette) closes the viewer.
  useEffect(() => close(), [key, close]);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <PreviewContext.Provider value={value}>
      {children}
      {state && <PreviewModal list={state.list} index={state.index} onIndex={(i) => setState((s) => (s ? { ...s, index: i } : s))} onClose={close} />}
    </PreviewContext.Provider>
  );
}

export const usePreview = () => useContext(PreviewContext);
