import { Sparkles } from 'lucide-react';
import type { ApiItem, AreaStat } from '../../../api/types';
import { useApi } from '../../../hooks/useApi';
import { usePreview } from '../../../state/preview';
import Thumb from '../../molecules/Thumb';
import SectionTitle from '../../molecules/SectionTitle';
import { t } from '../../../i18n';

const yearsAgo = (ts: number) => new Date().getFullYear() - new Date(ts * 1000).getFullYear();

/** "An diesem Tag": photos from today's date in earlier years. Hidden when there are none. */
export default function MemoriesStrip({ areas }: { areas: AreaStat[] | undefined }) {
  const preview = usePreview();
  const now = new Date();
  const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const photoArea = areas?.find((a) => /foto|bild/i.test(a.name))?.path ?? '';
  const { data } = useApi<{ items: ApiItem[] }>(areas ? '/memories' : null, { date: md, limit: 14, scope: photoArea }, { ttl: 3_600_000 });
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <SectionTitle title={t('An diesem Tag')} hint={t('Fotos vom heutigen Datum in früheren Jahren')} />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {items.map((p) => (
          <button key={p.path} onClick={() => preview.open(p, items)} className="group relative h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-surface-2 shadow-card transition-transform hover:-translate-y-0.5 sm:h-44 sm:w-44">
            <Thumb path={p.path} ext={p.ext} width={320} size="lg" className="!h-full !w-full !rounded-none ring-0" />
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-8 text-xs font-semibold text-white">
              <Sparkles className="h-3 w-3" /> {yearsAgo(p.modified) === 1 ? t('vor {n} Jahr', { n: 1 }) : t('vor {n} Jahren', { n: yearsAgo(p.modified) })}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
