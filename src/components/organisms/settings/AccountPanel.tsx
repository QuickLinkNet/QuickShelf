import { KeyRound, LogOut } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { authApi } from '../../../api/auth';
import { useAuth } from '../../../state/auth';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import SettingRow from '../../molecules/SettingRow';
import { t } from '../../../i18n';

/** Password change and logout. Hidden when the login is switched off (AUTH=0). */
export default function AccountPanel() {
  const { status, logout } = useAuth();
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  if (!status?.auth_enabled) {
    return <p className="py-4 text-sm text-ink-2">{t('Der Login ist auf diesem Server abgeschaltet (AUTH=0).')}</p>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      toast(t('Passwort geändert. Andere Geräte müssen sich neu anmelden.'), 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : t('Passwort konnte nicht geändert werden'), 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingRow title={t('Passwort ändern')} description={t('Meldet alle anderen Geräte ab. Mindestens 8 Zeichen.')}>
        <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:w-96">
          <input type="password" autoComplete="current-password" className="input" placeholder={t('Aktuelles Passwort')} aria-label={t('Aktuelles Passwort')} value={current} onChange={(e) => setCurrent(e.target.value)} />
          <input type="password" autoComplete="new-password" className="input" placeholder={t('Neues Passwort')} aria-label={t('Neues Passwort')} value={next} onChange={(e) => setNext(e.target.value)} />
          <Button type="submit" loading={busy} disabled={!current || next.length < 8} icon={<KeyRound className="h-4 w-4" />}>{t('Passwort ändern')}</Button>
        </form>
      </SettingRow>
      <SettingRow title={t('Abmelden')} description={t('Beendet die Sitzung in diesem Browser.')}>
        <Button onClick={() => void logout()} icon={<LogOut className="h-4 w-4" />}>{t('Abmelden')}</Button>
      </SettingRow>
    </>
  );
}
