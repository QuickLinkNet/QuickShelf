import { useEffect, useState } from 'react';
import { API_BASE } from '../api/client';

/**
 * Safety net for self-hosters: the API keeps the password hash and the search index in `api/data`.
 * If the web server hands that file out (e.g. nginx without the deny rule), warn loudly.
 */
export function useExposureCheck(active: boolean): boolean {
  const [exposed, setExposed] = useState(false);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch(`${API_BASE}/data/auth.json`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const text = await res.text();
        if (text.includes('"hash"')) setExposed(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [active]);
  return exposed;
}
