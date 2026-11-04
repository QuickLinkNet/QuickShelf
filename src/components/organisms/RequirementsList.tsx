import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authApi, type RequirementItem } from '../../api/auth';
import { t } from '../../i18n';

/** Wizard server check: one calm line when all is well, otherwise what is missing and how to fix it. */
export default function RequirementsList({ onBlocking }: { onBlocking: (blocking: boolean) => void }) {
  const [items, setItems] = useState<RequirementItem[] | null>(null);

  useEffect(() => {
    let live = true;
    authApi.requirements().then((r) => {
      if (!live) return;
      setItems(r.items);
      onBlocking(r.blocking);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [onBlocking]);

  if (!items) return null;
  const problems = items.filter((i) => !i.ok);
  if (problems.length === 0) {
    return <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-ok"><CheckCircle2 className="h-4 w-4" />{t('Server bereit – alle Voraussetzungen erfüllt.')}</p>;
  }
  return (
    <div className="mb-5 space-y-2 rounded-xl border border-line bg-surface-2/60 p-3" role="status">
      <p className="text-sm font-semibold">{t('Systemprüfung')}</p>
      {problems.map((i) => (
        <div key={i.id} className="flex items-start gap-2 text-sm">
          {i.required ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />}
          <div>
            <span className="font-medium">{t(i.label)}</span>
            <span className="block text-xs text-ink-2">{t(i.hint)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
