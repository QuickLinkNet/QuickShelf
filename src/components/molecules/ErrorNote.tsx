import { AlertTriangle } from 'lucide-react';
import Button from '../atoms/Button';
import { t } from '../../i18n';

type Props = { message: string; onRetry?: () => void };

export default function ErrorNote({ message, onRetry }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-ink" role="alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-bad" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          {t('Nochmal')}
        </Button>
      )}
    </div>
  );
}
