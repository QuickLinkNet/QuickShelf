import { Archive, CornerLeftUp, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { urls } from '../api/client';
import type { ApiItem } from '../api/types';
import Button from '../components/atoms/Button';
import IconButton from '../components/atoms/IconButton';
import Segmented from '../components/atoms/Segmented';
import Breadcrumbs from '../components/molecules/Breadcrumbs';
import SideSheet from '../components/molecules/SideSheet';
import DetailsPanel from '../components/organisms/DetailsPanel';
import FilterBar from '../components/organisms/files/FilterBar';
import FolderStrip from '../components/organisms/files/FolderStrip';
import ResultList from '../components/organisms/files/ResultList';
import SavedSearches from '../components/organisms/files/SavedSearches';
import SearchBar from '../components/organisms/files/SearchBar';
import SelectionBar from '../components/organisms/files/SelectionBar';
import PageHeader from '../components/templates/PageHeader';
import { useFileBrowser } from '../hooks/useFileBrowser';
import { useHotkeys } from '../hooks/useHotkeys';
import { dirname } from '../lib/paths';
import { formatNumber } from '../lib/format';
import { usePreview } from '../state/preview';
import { useSettings } from '../state/settings';
import { t } from '../i18n';

export default function Files() {
  const b = useFileBrowser();
  const preview = usePreview();
  const { settings, set } = useSettings();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<ApiItem | null>(null);
  const { query } = b;

  // A new folder or search starts with a clean selection.
  useEffect(() => setSelected(new Set()), [query.path, query.q]);

  const open = (item: ApiItem) => (item.type === 'dir' ? b.openFolder(item.path) : preview.open(item, b.items.filter((i) => i.type === 'file')));
  const toggle = (path: string) => setSelected((s) => { const n = new Set(s); if (n.has(path)) n.delete(path); else n.add(path); return n; });
  const up = () => b.openFolder(dirname(query.path));

  const keys = useMemo(() => [{ key: 'Backspace', handler: () => query.path !== '/' && !b.searching && up() }], [query.path, b.searching]); // eslint-disable-line react-hooks/exhaustive-deps
  useHotkeys(keys);

  const headline = b.searching
    ? `${b.loading ? t('Suche läuft') : formatNumber(b.total ?? b.items.length)} ${query.mode === 'dir' ? t('Ordner') : t('Treffer')} ${t('für')} „${query.q}“`
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('Dateien')}
        subtitle={t('Durchsuche dein Archiv nach Namen, Inhalt, Typ und Datum.')}
        actions={
          <>
            <Segmented size="sm" label={t('Ansicht')} value={settings.view} onChange={(v) => set('view', v)} options={[{ value: 'liste', label: t('Liste'), icon: <List className="h-3.5 w-3.5" /> }, { value: 'kacheln', label: t('Kacheln'), icon: <LayoutGrid className="h-3.5 w-3.5" /> }]} />
            {!b.searching && query.path !== '/' && (
              <a href={urls.zip([query.path], query.path.split('/').pop() || 'archiv')}><Button size="sm" icon={<Archive className="h-4 w-4" />}>{t('Ordner als ZIP')}</Button></a>
            )}
            <IconButton label={t('Neu laden')} onClick={b.reload}><RefreshCw className="h-[18px] w-[18px]" /></IconButton>
          </>
        }
      />

      <SearchBar query={query} loading={b.loading} onSubmit={(patch) => b.update(patch)} onClear={b.clearSearch} />
      <SavedSearches query={query} searching={b.searching} onRun={(q) => b.update(q)} />
      <FilterBar query={query} onChange={(patch) => b.update(patch)} dimmed={query.mode === 'dir' && b.searching} />
      {!b.searching && <FolderStrip info={b.folder} />}

      <section className="card overflow-hidden">
        <div className="flex min-h-12 items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
          {b.searching ? (
            <>
              <span className="text-sm font-semibold">{headline}</span>
              <Button size="sm" variant="ghost" className="ml-auto" icon={<CornerLeftUp className="h-4 w-4" />} onClick={b.clearSearch}>{t('Zurück zum Ordner')}</Button>
            </>
          ) : (
            <>
              {query.path !== '/' && <IconButton label={t('Eine Ebene höher (Rücktaste)')} size="sm" onClick={up}><CornerLeftUp className="h-4 w-4" /></IconButton>}
              <Breadcrumbs path={query.path} onOpen={b.openFolder} />
            </>
          )}
        </div>
        <ResultList
          items={b.items} view={settings.view} loading={b.loading} error={b.error} searching={b.searching} folder={b.folder}
          selected={selected} onSelect={toggle} onOpen={open} onInfo={setDetails} onRetry={b.reload}
          canLoadMore={b.canLoadMore} loadingMore={b.loadingMore} onLoadMore={b.loadMore} total={b.total}
          emptyActions={b.searching && !query.inPath && query.mode === 'file' ? <Button onClick={() => b.update({ inPath: true })}>{t('Auch in Ordnernamen suchen')}</Button> : undefined}
        />
      </section>

      <SelectionBar paths={[...selected]} onClear={() => setSelected(new Set())} />
      <SideSheet open={details !== null} onClose={() => setDetails(null)} title={t('Details')}>
        {details && <DetailsPanel item={details} onNavigate={() => setDetails(null)} />}
      </SideSheet>
    </div>
  );
}
