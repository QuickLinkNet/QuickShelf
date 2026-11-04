import { WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import Spinner from '../atoms/Spinner';
import Login from '../../pages/Login';
import Setup from '../../pages/Setup';
import { useAuth } from '../../state/auth';
import AuthLayout from './AuthLayout';
import { t } from '../../i18n';

/** Shows the app only after setup and login; otherwise the wizard or the login form. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { status, unreachable, refresh } = useAuth();
  if (!status) {
    return unreachable ? (
      <AuthLayout title={t('Keine Verbindung')} subtitle={t('Die Archiv-API antwortet nicht.')}>
        <div className="space-y-4 text-center text-sm text-ink-2">
          <WifiOff className="mx-auto h-8 w-8 text-bad" />
          <p>{t('Prüfe, ob dein NAS läuft und die API erreichbar ist.')}</p>
          <button className="font-semibold text-accent hover:underline" onClick={() => void refresh()}>{t('Erneut versuchen')}</button>
        </div>
      </AuthLayout>
    ) : (
      <div className="flex min-h-screen items-center justify-center text-accent"><Spinner className="h-8 w-8" /></div>
    );
  }
  if (status.setup_required) return <Setup />;
  if (status.auth_enabled && !status.authenticated) return <Login />;
  return <>{children}</>;
}
