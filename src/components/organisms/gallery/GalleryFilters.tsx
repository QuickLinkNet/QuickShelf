import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { useEffect, useState } from 'react';
import { get } from '../../../api/client';
import type { AreaStat, FolderInfo, YearStat } from '../../../api/types';
import { prettyName } from '../../../lib/paths';
import { formatNumber } from '../../../lib/format';
import IconButton from '../../atoms/IconButton';
import Segmented from '../../atoms/Segmented';
import type { TileSize } from './PhotoGrid';
import { t } from '../../../i18n';

type Props = {
  areas: AreaStat[];
  years: YearStat[];
  scope: string;
  year: string;
  order: 'asc' | 'desc';
  size: TileSize;
  onScope: (scope: string) => void;
  onYear: (year: string) => void;
  onOrder: (order: 'asc' | 'desc') => void;
  onSize: (size: TileSize) => void;
};

const sel = 'input !h-10 !w-auto !py-0 !pr-9 text-sm';

export default function GalleryFilters({ areas, years, scope, year, order, size, onScope, onYear, onOrder, onSize }: Props) {
  const area = '/' + (scope.split('/')[1] ?? '');
  const [children, setChildren] = useState<FolderInfo['children']>([]);
  const hasArea = scope !== '';

  useEffect(() => {
    if (!hasArea) return setChildren([]);
    let live = true;
    get<FolderInfo>('/folder', { path: area }).then((f) => live && setChildren(f.children)).catch(() => live && setChildren([]));
    return () => { live = false; };
  }, [area, hasArea]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={sel} value={hasArea ? area : ''} onChange={(e) => onScope(e.target.value)} aria-label={t('Bereich')}>
        <option value="">{t('Alle Bereiche')}</option>
        {areas.map((a) => <option key={a.path} value={a.path}>{prettyName(a.name)}</option>)}
      </select>
      {hasArea && children.length > 0 && (
        <select className={sel} value={scope === area ? '' : scope} onChange={(e) => onScope(e.target.value || area)} aria-label={t('Unterordner')}>
          <option value="">{t('Alle Unterordner')}</option>
          {children.map((c) => <option key={c.path} value={c.path}>{prettyName(c.name)} ({formatNumber(c.files)})</option>)}
        </select>
      )}
      <select className={sel} value={year} onChange={(e) => onYear(e.target.value)} aria-label={t('Jahr')}>
        <option value="">{t('Alle Jahre')}</option>
        {years.filter((y) => y.year >= 1990).reverse().map((y) => <option key={y.year} value={String(y.year)}>{y.year}</option>)}
      </select>
      <IconButton label={order === 'desc' ? t('Neueste zuerst – umkehren') : t('Älteste zuerst – umkehren')} onClick={() => onOrder(order === 'desc' ? 'asc' : 'desc')}>
        {order === 'desc' ? <ArrowDownWideNarrow className="h-[18px] w-[18px]" /> : <ArrowUpNarrowWide className="h-[18px] w-[18px]" />}
      </IconButton>
      <div className="ml-auto">
        <Segmented size="sm" label={t('Kachelgröße')} value={size} onChange={onSize} options={[{ value: 'klein', label: 'S' }, { value: 'mittel', label: 'M' }, { value: 'gross', label: 'L' }]} />
      </div>
    </div>
  );
}
