import { useEffect, useRef, useState } from 'react';
import { urls } from '../../../api/client';
import Spinner from '../../atoms/Spinner';
import ErrorNote from '../../molecules/ErrorNote';
import { t } from '../../../i18n';

export default function DocxViewer({ path }: { path: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setState('loading');
    (async () => {
      const res = await fetch(urls.inline(path));
      if (!res.ok) throw new Error(t('API Fehler ({v0})', { v0: res.status }));
      const blob = await res.blob();
      const { renderAsync } = await import('docx-preview');
      if (!live || !host.current) return;
      host.current.innerHTML = '';
      await renderAsync(blob, host.current, undefined, { inWrapper: false });
      if (live) setState('ok');
    })().catch((e: Error) => {
      if (!live) return;
      setError(e.message || t('Vorschau fehlgeschlagen'));
      setState('error');
    });
    return () => {
      live = false;
    };
  }, [path]);

  return (
    <div className="h-full overflow-auto bg-surface-2 p-4">
      {state === 'loading' && <div className="flex justify-center p-16 text-accent"><Spinner className="h-8 w-8" /></div>}
      {state === 'error' && <ErrorNote message={error} />}
      <div ref={host} className="sensitive mx-auto max-w-4xl rounded-lg bg-white text-slate-900 shadow-card" />
    </div>
  );
}
