import { lazy, Suspense } from 'react';
import { Download } from 'lucide-react';
import { urls } from '../../../api/client';
import type { ApiItem } from '../../../api/types';
import { viewerKind } from '../../../lib/fileTypes';
import FileIcon from '../../atoms/FileIcon';
import Spinner from '../../atoms/Spinner';
import Button from '../../atoms/Button';
import ImageViewer from './ImageViewer';
import MediaViewer from './MediaViewer';
import TextViewer from './TextViewer';
import { t } from '../../../i18n';

const DocxViewer = lazy(() => import('./DocxViewer'));
const XlsxViewer = lazy(() => import('./XlsxViewer'));

function Fallback({ item }: { item: ApiItem }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <FileIcon ext={item.ext} size="lg" />
      <div>
        <p className="font-semibold">{t('Keine Vorschau für .{ext}', { ext: item.ext || 'datei' })}</p>
        <p className="muted mt-1">{t('Dieses Format kann der Browser nicht anzeigen.')}</p>
      </div>
      <a href={urls.download(item.path)}><Button variant="primary" icon={<Download className="h-4 w-4" />}>{t('Herunterladen')}</Button></a>
    </div>
  );
}

/** Picks the right viewer for a file (PDF, image, video, audio, text, Word, Excel) or a download fallback. */
export default function Viewer({ item }: { item: ApiItem }) {
  const kind = viewerKind(item.ext);
  const spin = <div className="flex h-full items-center justify-center text-accent"><Spinner className="h-8 w-8" /></div>;
  switch (kind) {
    case 'pdf':
      return <iframe key={item.path} title={item.name} src={`${urls.inline(item.path)}#view=FitH`} className="h-full w-full border-0 bg-white" />;
    case 'image':
      return <ImageViewer path={item.path} name={item.name} />;
    case 'video':
    case 'audio':
      return <MediaViewer path={item.path} kind={kind} name={item.name} />;
    case 'text':
      return <TextViewer path={item.path} csv={item.ext === 'csv'} />;
    case 'docx':
      return <Suspense fallback={spin}><DocxViewer path={item.path} /></Suspense>;
    case 'xlsx':
      return <Suspense fallback={spin}><XlsxViewer path={item.path} /></Suspense>;
    default:
      return <Fallback item={item} />;
  }
}
