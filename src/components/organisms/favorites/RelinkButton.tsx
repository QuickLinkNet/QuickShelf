import { Link2, Search } from 'lucide-react';
import { useState } from 'react';
import { get, post } from '../../../api/client';
import type { ApiItem } from '../../../api/types';
import { dirname } from '../../../lib/paths';
import { useMetaState } from '../../../state/meta';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import { t } from '../../../i18n';

type Props = { item: ApiItem; onDone: () => void };

/** For a favourite whose file moved: finds files with the same name and re-links the annotations. */
export default function RelinkButton({ item, onDone }: Props) {
  const { toast } = useToast();
  const { bump } = useMetaState();
  const [candidates, setCandidates] = useState<ApiItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setBusy(true);
    try {
      const r = await get<{ items: ApiItem[] }>('/search', { query: item.name, limit: 8, sort: 'modified', order: 'desc' });
      setCandidates(r.items.filter((i) => i.name === item.name));
    } catch {
      setCandidates([]);
    } finally {
      setBusy(false);
    }
  };

  const link = async (to: string) => {
    await post('/meta/relink', { from: item.path, to });
    toast(t('Neu verknüpft'), 'ok');
    bump();
    onDone();
  };

  if (candidates === null) return <Button size="sm" loading={busy} icon={<Search className="h-3.5 w-3.5" />} onClick={find}>{t('Neuen Ort suchen')}</Button>;
  if (candidates.length === 0) return <span className="text-xs text-ink-3">{t('Nicht mehr im Archiv gefunden')}</span>;
  return (
    <div className="flex flex-col gap-1">
      {candidates.map((c) => (
        <Button key={c.path} size="sm" variant="primary" icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => link(c.path)} title={c.path}>
          <span className="max-w-48 truncate">{dirname(c.path)}</span>
        </Button>
      ))}
    </div>
  );
}
