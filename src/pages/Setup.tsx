import { ArrowLeft, ArrowRight, Check, FolderOpen, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import RequirementsList from '../components/organisms/RequirementsList';
import { authApi } from '../api/auth';
import Button from '../components/atoms/Button';
import Switch from '../components/atoms/Switch';
import AuthLayout from '../components/templates/AuthLayout';
import { useAuth } from '../state/auth';
import { t } from '../i18n';

const STEPS = [t('Archiv'), 'Passwort', 'Schreiben'] as const;

/** First run: pick the archive folder, set a password, decide whether files may be moved. */
export default function Setup() {
  const { status, refresh } = useAuth();
  const locked = status?.data_root_locked ?? false;
  const [step, setStep] = useState(locked ? 1 : 0);
  const [path, setPath] = useState('');
  const [folderNote, setFolderNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [write, setWrite] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const checkFolder = async () => {
    setBusy(true);
    try {
      const res = await authApi.checkFolder(path.trim());
      setFolderNote(res.ok ? { ok: true, text: t('Gefunden – {n} Einträge im obersten Ordner.', { n: res.entries ?? 0 }) } : { ok: false, text: res.error ?? t('Ordner nicht nutzbar.') });
      if (res.ok) setStep(1);
    } catch (e) {
      setFolderNote({ ok: false, text: e instanceof Error ? e.message : t('Prüfung fehlgeschlagen') });
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      await authApi.setup({ password, read_only: !write, data_root: locked ? undefined : path.trim() });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Einrichtung fehlgeschlagen'));
      setBusy(false);
    }
  };

  const passwordOk = password.length >= 8 && password === repeat;

  return (
    <AuthLayout wide title={t('Willkommen bei QuickShelf')} subtitle={t('In drei Schritten ist alles eingerichtet.')}>
      <RequirementsList onBlocking={setBlocked} />
      <ol className="mb-6 flex items-center justify-center gap-2 text-xs font-semibold" aria-label={t('Fortschritt')}>
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${i === step ? 'bg-accent text-accent-ink' : i < step ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-3'}`} aria-current={i === step ? 'step' : undefined}>
            {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm text-ink-2">{t('Wo liegt dein Archiv? Gib den vollständigen Ordnerpfad an, so wie ihn der Webserver sieht (z. B. /volume1/Archiv oder D:\\Archiv).')}</p>
          </div>
          <input className="input font-mono text-sm" autoFocus value={path} onChange={(e) => { setPath(e.target.value); setFolderNote(null); }} placeholder="/volume1/Archiv" aria-label={t('Archivordner')} onKeyDown={(e) => e.key === 'Enter' && path.trim() && !blocked && void checkFolder()} />
          {folderNote && <p role="status" className={`text-sm ${folderNote.ok ? 'text-ok' : 'text-bad'}`}>{folderNote.text}</p>}
          <Button variant="primary" className="w-full" loading={busy} disabled={!path.trim() || blocked} onClick={checkFolder} icon={<ArrowRight className="h-4 w-4" />}>{t('Ordner prüfen und weiter')}</Button>
        </div>
      )}

      {step === 1 && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (passwordOk) setStep(2); }}>
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm text-ink-2">{t('Mit diesem Passwort schützt du dein Archiv. Mindestens 8 Zeichen – ein Satz ist besser als ein Wort.')}</p>
          </div>
          <input type="password" autoFocus autoComplete="new-password" className="input" placeholder={t('Passwort')} aria-label={t('Passwort')} value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" autoComplete="new-password" className="input" placeholder={t('Passwort wiederholen')} aria-label={t('Passwort wiederholen')} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          {repeat && password !== repeat && <p className="text-sm text-bad">{t('Die Passwörter stimmen nicht überein.')}</p>}
          <div className="flex gap-2">
            {!locked && <Button onClick={() => setStep(0)} icon={<ArrowLeft className="h-4 w-4" />}>{t('Zurück')}</Button>}
            <Button type="submit" variant="primary" className="flex-1" disabled={!passwordOk || blocked} icon={<ArrowRight className="h-4 w-4" />}>{t('Weiter')}</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm text-ink-2">{t('Standardmäßig bleibt dein Archiv unverändert: Das Cockpit liest nur. Wenn du später Dateien einsortieren, umbenennen und verschieben möchtest, schalte das hier ein. Jede Änderung wird protokolliert und lässt sich rückgängig machen.')}</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 px-4 py-3">
            <span className="text-sm font-medium">{t('Änderungen am Archiv erlauben')}</span>
            <Switch label={t('Änderungen erlauben')} checked={write} onChange={setWrite} />
          </div>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={() => setStep(1)} icon={<ArrowLeft className="h-4 w-4" />}>{t('Zurück')}</Button>
            <Button variant="primary" className="flex-1" loading={busy} disabled={blocked} onClick={finish} icon={<Check className="h-4 w-4" />}>{t('Einrichten und loslegen')}</Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
