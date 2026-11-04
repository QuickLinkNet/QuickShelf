import { Check, Database, HardDrive, Image as ImageIcon, Server, X } from 'lucide-react';
import type { SystemInfo } from '../../../api/types';
import { formatBytes, formatNumber, formatRelative, percent } from '../../../lib/format';
import { cx } from '../../../lib/cx';
import { useArchive } from '../../../state/archive';
import Badge from '../../atoms/Badge';
import Button from '../../atoms/Button';
import ProgressBar from '../../atoms/ProgressBar';
import SectionTitle from '../../molecules/SectionTitle';
import { t } from '../../../i18n';

export function DiskPanel({ sys, archiveBytes }: { sys: SystemInfo; archiveBytes?: number }) {
  const { total, used, free } = sys.disk;
  const pct = total && used ? percent(used, total) : 0;
  return (
    <section className="card card-pad">
      <SectionTitle title={t('Speicher')} hint={t('Datenträger, auf dem das Archiv liegt')} />
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><HardDrive className="h-6 w-6" /></span>
        <div className="flex-1">
          <p className="text-2xl font-bold">{formatBytes(free)} <span className="text-sm font-medium text-ink-3">{t('frei von')} {formatBytes(total)}</span></p>
          <ProgressBar value={pct} tone={pct > 90 ? 'bad' : pct > 75 ? 'warn' : 'accent'} className="mt-2" label={t('Belegung')} />
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-ink-3">{t('Belegt (Datenträger)')}</dt><dd className="font-semibold">{formatBytes(used)} · {pct} %</dd></div>
        {archiveBytes !== undefined && <div><dt className="text-ink-3">{t('Davon dieses Archiv')}</dt><dd className="font-semibold">{formatBytes(archiveBytes)}{total ? ` · ${percent(archiveBytes, total)} %` : ''}</dd></div>}
      </dl>
    </section>
  );
}

export function IndexPanel({ sys }: { sys: SystemInfo }) {
  const { reindex, indexing } = useArchive();
  const i = sys.index;
  return (
    <section className="card card-pad">
      <SectionTitle title={t('Suchindex')} hint={t('Macht Suche, Statistiken und Galerie schnell')} action={<Button size="sm" variant="primary" icon={<Database className="h-4 w-4" />} loading={indexing} onClick={reindex}>{t('Aktualisieren')}</Button>} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-ink-3">{t('Dateien')}</dt><dd className="font-semibold">{formatNumber(i.files)}</dd></div>
        <div><dt className="text-ink-3">{t('Mit Inhalt durchsuchbar')}</dt><dd className="font-semibold">{formatNumber(i.with_text)} ({percent(i.with_text, i.files)} %)</dd></div>
        <div><dt className="text-ink-3">{t('Stand')}</dt><dd className="font-semibold">{formatRelative(i.updated)}</dd></div>
        <div><dt className="text-ink-3">{t('Größe der Datenbank')}</dt><dd className="font-semibold">{formatBytes(i.size_bytes)}</dd></div>
        <div><dt className="text-ink-3">{t('PDF-Text')}</dt><dd><Badge tone={i.pdf_text ? 'ok' : 'warn'}>{i.pdf_text ? t('aktiv') : t('ausgeschaltet')}</Badge></dd></div>
        <div><dt className="text-ink-3">{t('OCR (Scans)')}</dt><dd><Badge tone={i.ocr_enabled ? 'ok' : 'neutral'}>{i.ocr_enabled ? t('aktiv') : t('ausgeschaltet')}</Badge></dd></div>
      </dl>
      {!i.pdf_text && <p className="mt-3 rounded-xl bg-warn/10 px-3 py-2 text-xs text-ink-2">{t('PDF-Inhalte sind nicht durchsuchbar. Auf dem NAS prüfen, ob pdftotext installiert ist und PDF_TEXT nicht auf 0 steht.')}</p>}
    </section>
  );
}

const FEATURES: Array<{ key: keyof SystemInfo['api']['features']; label: string; why: string }> = [
  { key: 'sqlite', label: t('SQLite'), why: t('Suchindex, Statistik, Merkliste') },
  { key: 'thumbnails', label: t('GD (Bilder)'), why: t('Vorschaubilder und Galerie') },
  { key: 'zip', label: t('ZipArchive'), why: t('Ordner und Auswahl als ZIP laden') },
  { key: 'exif', label: 'EXIF', why: t('Fotos richtig drehen, schnelle Mini-Vorschauen') },
  { key: 'mbstring', label: t('mbstring'), why: t('Umlaute in Suche und Dateinamen') },
];

export function ApiPanel({ sys }: { sys: SystemInfo }) {
  const a = sys.api;
  return (
    <section className="card card-pad">
      <SectionTitle title={t('API-Server')} hint={t('PHP {v0} auf {v1} · {v2} Speicher', { v0: a.php, v1: a.os, v2: a.memory_limit })} action={<Badge tone={a.read_only ? 'ok' : 'warn'}>{a.read_only ? t('nur lesend') : t('schreibend')}</Badge>} />
      <ul className="divide-y divide-line">
        {FEATURES.map((f) => (
          <li key={f.key} className="flex items-center gap-3 py-2.5 text-sm">
            <span className={cx('flex h-6 w-6 items-center justify-center rounded-full', a.features[f.key] ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad')}>{a.features[f.key] ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}</span>
            <span className="w-28 font-medium">{f.label}</span>
            <span className="text-ink-3">{f.why}</span>
          </li>
        ))}
      </ul>
      {a.hidden_folders > 0 && <p className="mt-3 flex items-center gap-2 text-xs text-ink-3"><Server className="h-3.5 w-3.5" /> {a.hidden_folders} {t('Ordner sind per Konfiguration ausgeblendet.')}</p>}
    </section>
  );
}

export function ThumbsPanel({ sys }: { sys: SystemInfo }) {
  return (
    <section className="card card-pad">
      <SectionTitle title={t('Vorschaubilder')} hint={t('Zwischenspeicher neben dem Index – jederzeit löschbar')} />
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><ImageIcon className="h-6 w-6" /></span>
        <p className="text-sm"><b className="text-xl">{formatNumber(sys.thumbs.files)}</b> {t('Bilder ·')} {formatBytes(sys.thumbs.bytes)}<br /><span className="text-ink-3">{t('In der Galerie lassen sich weitere im Voraus erzeugen („Vorschauen vorbereiten“).')}</span></p>
      </div>
    </section>
  );
}
