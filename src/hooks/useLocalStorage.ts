import { useCallback, useEffect, useState } from 'react';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : ({ ...(typeof fallback === 'object' && fallback !== null ? fallback : {}), ...JSON.parse(raw) } as T);
  } catch {
    return fallback;
  }
}

/** Persists small preferences in the browser. Safe when storage is blocked (private mode, quotas). */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? initial : (JSON.parse(raw) as T);
      } catch {
        return initial;
      }
    }
    return read(key, initial);
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);

  const update = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);
  return [value, update];
}
