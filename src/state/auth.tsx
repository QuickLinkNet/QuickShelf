import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthStatus } from '../api/auth';
import { AUTH_EVENT } from '../api/client';
import { t } from '../i18n';

type Ctx = {
  status: AuthStatus | null;
  /** True when the API could not be reached at all. */
  unreachable: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [unreachable, setUnreachable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await authApi.status());
      setUnreachable(false);
    } catch {
      setUnreachable(true);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const onUnauthorized = () => void refresh();
    window.addEventListener(AUTH_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_EVENT, onUnauthorized);
  }, [refresh]);

  const value = useMemo(() => ({ status, unreachable, refresh, logout }), [status, unreachable, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error(t('useAuth braucht den AuthProvider'));
  return ctx;
}
