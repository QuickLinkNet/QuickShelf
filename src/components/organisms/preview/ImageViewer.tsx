import { Minus, Plus, RotateCw, Scan } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { urls } from '../../../api/client';
import IconButton from '../../atoms/IconButton';
import Spinner from '../../atoms/Spinner';
import { t } from '../../../i18n';

type Props = { path: string; name: string };

/** Image with fit / zoom (buttons, wheel, double click) and drag-to-pan. */
export default function ImageViewer({ path, name }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setRotate(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
    setState('loading');
  }, [path, reset]);

  const change = (delta: number) => setZoom((z) => Math.min(8, Math.max(0.25, +(z + delta).toFixed(2))));

  return (
    <div
      className="relative flex h-full w-full touch-none select-none items-center justify-center overflow-hidden bg-black/90"
      onWheel={(e) => change(e.deltaY < 0 ? 0.2 : -0.2)}
      onDoubleClick={() => (zoom === 1 ? setZoom(2.5) : reset())}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current || zoom === 1) return;
        setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
      }}
      onPointerUp={() => (drag.current = null)}
    >
      {state === 'loading' && <Spinner className="absolute h-8 w-8 text-white/70" />}
      {state === 'error' ? (
        <p className="px-6 text-center text-sm text-white/80">{t('Dieses Bildformat kann der Browser nicht anzeigen. Lade die Datei herunter, um sie zu öffnen.')}</p>
      ) : (
        <img
          src={urls.inline(path)}
          alt={name}
          draggable={false}
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className="sensitive max-h-full max-w-full object-contain transition-transform duration-150"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotate}deg)`, cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
        />
      )}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-black/60 p-1 text-white backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
        <IconButton label={t('Verkleinern')} onClick={() => change(-0.25)} className="!text-white hover:!bg-white/15"><Minus className="h-4 w-4" /></IconButton>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)} %</span>
        <IconButton label={t('Vergrößern')} onClick={() => change(0.25)} className="!text-white hover:!bg-white/15"><Plus className="h-4 w-4" /></IconButton>
        <IconButton label={t('Drehen')} onClick={() => setRotate((r) => (r + 90) % 360)} className="!text-white hover:!bg-white/15"><RotateCw className="h-4 w-4" /></IconButton>
        <IconButton label={t('Einpassen')} onClick={reset} className="!text-white hover:!bg-white/15"><Scan className="h-4 w-4" /></IconButton>
      </div>
    </div>
  );
}
