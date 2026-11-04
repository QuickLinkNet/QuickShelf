import { Undo2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { organize, type MoveRecord } from '../../../api/organize';
import { basename, dirname } from '../../../lib/paths';
import { formatRelative } from '../../../lib/format';
import { useArchive } from '../../../state/archive';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import { t } from '../../../i18n';

type Props = { refreshKey: number; onUndone: () => void };

/** Last moves with a one-click undo – the safety net that makes sorting in the browser fearless. */
export default function MoveHistory({ refreshKey, onUndone }: Props) {
  const { toast } = useToast();
  const { version } = useArchive();
  const [items, setItems] = useState<MoveRecord[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    organize.history(8).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  useEffect(load, [load, refreshKey, version]);

  const undo = async (m: MoveRecord) => {
    setBusy(m.id);
    try {
      await organize.undo(m.id);
      toast(t('Rückgängig gemacht'), 'ok');
      load();
      onUndone();
    } catch (e) {
      toast(e instanceof Error ? e.message : t('Rückgängig nicht möglich'), 'warn');
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) return <p className="text-sm text-ink-3">{t('Noch nichts verschoben.')}</p>;
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="sensitive truncate font-medium">{basename(m.to)}</p>
            <p className="sensitive truncate text-xs text-ink-3">{dirname(m.from)} → {dirname(m.to)} · {formatRelative(m.at)}</p>
          </div>
          {m.undone ? <span className="text-xs text-ink-3">{t('rückgängig')}</span> : (
            <Button size="sm" icon={<Undo2 className="h-3.5 w-3.5" />} loading={busy === m.id} onClick={() => undo(m)}>{t('Zurück')}</Button>
          )}
        </li>
      ))}
    </ul>
  );
}
