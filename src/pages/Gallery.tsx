import { Images, Film } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { Overview } from '../api/types';
import Segmented from '../components/atoms/Segmented';
import Skeleton from '../components/atoms/Skeleton';
import EmptyState from '../components/molecules/EmptyState';
import ErrorNote from '../components/molecules/ErrorNote';
import GalleryFilters from '../components/organisms/gallery/GalleryFilters';
import PhotoGrid from '../components/organisms/gallery/PhotoGrid';
import WarmButton from '../components/organisms/gallery/WarmButton';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePhotos } from '../hooks/usePhotos';
import { formatNumber } from '../lib/format';
import { usePreview } from '../state/preview';
import type { TileSize } from '../components/organisms/gallery/PhotoGrid';
import { t } from '../i18n';

export default function Gallery() {
  const [params, setParams] = useSearchParams();
  const [size, setSize] = useLocalStorage<TileSize>('nas.gallery.size', 'mittel');
  const preview = usePreview();
  const overview = useApi<Overview>('/overview', undefined, { ttl: 300_000 });

  // Default to the photo area so scanned documents do not flood the gallery; 'all' shows every image.
  const photoArea = overview.data?.areas.find((a) => /foto|bild/i.test(a.name))?.path ?? '';
  const rawScope = params.get('scope');
  const scope = rawScope === 'all' ? '' : rawScope ?? photoArea;
  const year = params.get('year') ?? '';
  const kind = params.get('kind') === 'video' ? 'video' : 'foto';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const patch = (next: Record<string, string>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  const photos = usePhotos({ scope, order, kind, from: year ? `${year}-01-01` : '', to: year ? `${year}-12-31` : '' }, rawScope !== null || overview.data !== null || overview.error !== null);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('Galerie')}
        subtitle={photos.loading ? t('Wird geladen …') : `${formatNumber(photos.total)} ${kind === 'video' ? t('Videos') : t('Fotos')}${year ? ` ${t('aus')} ${year}` : ''} – ${t('nach Datum sortiert')}`}
        actions={<><Segmented size="sm" label={t('Medium')} value={kind} onChange={(k) => patch({ kind: k === 'video' ? 'video' : '' })} options={[{ value: 'foto', label: t('Fotos'), icon: <Images className="h-3.5 w-3.5" /> }, { value: 'video', label: t('Videos'), icon: <Film className="h-3.5 w-3.5" /> }]} />{kind === 'foto' && <WarmButton scope={scope} />}</>}
      />
      <GalleryFilters
        areas={overview.data?.areas ?? []} years={overview.data?.years ?? []}
        scope={scope} year={year} order={order} size={size}
        onScope={(s) => patch({ scope: s || 'all' })} onYear={(y) => patch({ year: y })} onOrder={(o) => patch({ order: o === 'desc' ? '' : o })} onSize={setSize}
      />
      {photos.error && <ErrorNote message={photos.error} />}
      {photos.loading && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-7">{Array.from({ length: 21 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
      )}
      {!photos.loading && !photos.error && photos.items.length === 0 && (
        <div className="card"><EmptyState icon={<Images className="h-7 w-7" />} title={kind === 'video' ? t('Keine Videos gefunden') : t('Keine Fotos gefunden')} text={t('Wähle einen anderen Bereich oder ein anderes Jahr.')} /></div>
      )}
      {photos.items.length > 0 && (
        <PhotoGrid video={kind === 'video'} items={photos.items} size={size} hasMore={photos.hasMore} onMore={photos.more} onOpen={(p) => preview.open(p, photos.items)} />
      )}
    </div>
  );
}
