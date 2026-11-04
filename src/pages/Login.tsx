import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import Button from '../components/atoms/Button';
import AuthLayout from '../components/templates/AuthLayout';
import { useAuth } from '../state/auth';
import { t } from '../i18n';

export default function Login() {
  const { refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authApi.login(password);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Anmeldung fehlgeschlagen'));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="QuickShelf" subtitle={t('Bitte melde dich an.')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">
          {t('Passwort')}
          <input type="password" autoFocus autoComplete="current-password" className="input mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={busy} disabled={!password} icon={<LogIn className="h-4 w-4" />}>{t('Anmelden')}</Button>
      </form>
    </AuthLayout>
  );
}
