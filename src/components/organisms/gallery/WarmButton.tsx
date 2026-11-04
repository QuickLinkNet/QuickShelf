import { Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { post } from '../../../api/client';
import { formatNumber } from '../../../lib/format';
import { useToast } from '../../../state/toast';
import Button from '../../atoms/Button';
import { t } from '../../../i18n';

type Slice = { created: number; checked: number; last: string; done: boolean };

/** Pre-generates thumbnails for a folder so the gallery scrolls smoothly even on a slow NAS. */
export default function WarmButton({ scope }: { scope: string }) {
  const { toast } = useToast();
  const [state, setState] = useState<{ running: boolean; checked: number; created: number }>({ running: false, checked: 0, created: 0 });
  const stop = useRef(false);

  const run = async () => {
    stop.current = false;
    let after = '';
    let created = 0;
    let checked = 0;
    setState({ running: true, checked: 0, created: 0 });
    try {
      for (let i = 0; i < 2000 && !stop.current; i += 1) {
        const r = await post<Slice>('/thumbs/warm', { scope, width: 320, after });
        created += r.created;
        checked += r.checked;
        after = r.last;
        setState({ running: true, checked, created });
        if (r.done) break;
      }
      toast(t('Vorschaubilder bereit ({v0} neu erzeugt)', { v0: formatNumber(created) }), 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Fehlgeschlagen', 'warn');
    } finally {
      setState((s) => ({ ...s, running: false }));
    }
  };

  return state.running ? (
    <Button size="sm" onClick={() => { stop.current = true; }}>{t('Stopp ·')} {formatNumber(state.checked)} {t('geprüft')}</Button>
  ) : (
    <Button size="sm" icon={<Zap className="h-4 w-4" />} onClick={run} title={t('Erzeugt Vorschaubilder im Voraus – danach lädt die Galerie sofort')}>{t('Vorschauen vorbereiten')}</Button>
  );
}
