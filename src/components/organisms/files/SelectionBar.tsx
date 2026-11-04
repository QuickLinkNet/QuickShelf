import { Archive, Star, X } from 'lucide-react';
import { urls } from '../../../api/client';
import { useMetaState } from '../../../state/meta';
import Button from '../../atoms/Button';
import { t } from '../../../i18n';

type Props = { paths: string[]; onClear: () => void };

/** Floating action bar for multi-selection: ZIP download or add everything to the shortlist. */
export default function SelectionBar({ paths, onClear }: Props) {
  const { toggleFavorite, isFavorite } = useMetaState();
  if (paths.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6">
      <div className="card flex animate-pop items-center gap-2 px-3 py-2 shadow-pop">
        <span className="px-2 text-sm font-semibold">{paths.length} {t('ausgewählt')}</span>
        <a href={urls.zip(paths, 'Auswahl')}><Button size="sm" variant="primary" icon={<Archive className="h-4 w-4" />}>{t('Als ZIP laden')}</Button></a>
        <Button size="sm" icon={<Star className="h-4 w-4" />} onClick={() => paths.filter((p) => !isFavorite(p)).forEach((p) => void toggleFavorite(p))}>{t('Merken')}</Button>
        <button onClick={onClear} aria-label={t('Auswahl aufheben')} className="rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
