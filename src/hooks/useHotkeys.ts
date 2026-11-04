import { useEffect } from 'react';

export type Hotkey = {
  /** e.g. 'k', '/', 'Escape', 'ArrowLeft' */
  key: string;
  /** Needs Ctrl (Windows/Linux) or Cmd (macOS). */
  mod?: boolean;
  shift?: boolean;
  /** Also fire while typing in an input. Default: only for combinations with mod. */
  inInput?: boolean;
  handler: (event: KeyboardEvent) => void;
};

const isTyping = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
};

/** Global keyboard shortcuts. Plain keys are ignored while the user types in a field. */
export function useHotkeys(keys: Hotkey[], enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      for (const k of keys) {
        const mod = event.ctrlKey || event.metaKey;
        if (event.key.toLowerCase() !== k.key.toLowerCase()) continue;
        if (Boolean(k.mod) !== mod) continue;
        if (Boolean(k.shift) !== event.shiftKey && k.key.length === 1 && !k.mod) continue;
        if (!k.mod && !k.inInput && isTyping(event.target)) continue;
        event.preventDefault();
        k.handler(event);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, enabled]);
}
