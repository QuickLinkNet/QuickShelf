import { Music } from 'lucide-react';
import { urls } from '../../../api/client';
import { t } from '../../../i18n';

type Props = { path: string; kind: 'video' | 'audio'; name: string };

export default function MediaViewer({ path, kind, name }: Props) {
  if (kind === 'video') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <video key={path} src={urls.inline(path)} controls autoPlay playsInline preload="metadata" className="sensitive max-h-full max-w-full" aria-label={name}>
          {t('Dein Browser kann dieses Video nicht abspielen.')}
        </video>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-accent-soft text-accent">
        <Music className="h-14 w-14" />
      </div>
      <p className="sensitive max-w-md truncate text-center text-sm font-medium">{name}</p>
      <audio key={path} src={urls.inline(path)} controls autoPlay preload="metadata" className="w-full max-w-md" />
    </div>
  );
}
