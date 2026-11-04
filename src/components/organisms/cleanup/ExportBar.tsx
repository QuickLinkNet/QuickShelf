import { Bot, ClipboardCopy, FileDown } from 'lucide-react';
import type { ApiItem } from '../../../api/types';
import { copyText, downloadText, sortingPrompt, toCsv } from '../../../lib/export';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import { t } from '../../../i18n';

type Props = { items: ApiItem[]; name: string; topic: string };

/** CSV download, path list and a ready-made AI prompt for the files currently shown. */
export default function ExportBar({ items, name, topic }: Props) {
  const { toast } = useToast();
  const root = (import.meta.env.VITE_DATA_ROOT as string | undefined)?.replace(/^file:\/\//, '');
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" icon={<FileDown className="h-4 w-4" />} onClick={() => downloadText(`${name}.csv`, toCsv(['Pfad', 'Name', t('Größe (Byte)'), t('Geändert')], items.map((i) => [i.path, i.name, i.size ?? '', new Date(i.modified * 1000).toISOString().slice(0, 10)])))}>CSV</Button>
      <Button size="sm" icon={<ClipboardCopy className="h-4 w-4" />} onClick={async () => toast((await copyText(items.map((i) => i.path).join('\n'))) ? t('Pfadliste kopiert') : t('Kopieren nicht möglich'), 'ok')}>{t('Pfade kopieren')}</Button>
      <Button size="sm" variant="primary" icon={<Bot className="h-4 w-4" />} onClick={async () => toast((await copyText(sortingPrompt(topic, items.map((i) => i.path), root))) ? t('Prompt kopiert – jetzt bei Claude einfügen') : t('Kopieren nicht möglich'), 'ok')}>{t('Prompt für Claude')}</Button>
    </div>
  );
}
