import { Download, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { API_BASE, DEFAULT_API_BASE, get, setApiOverride } from '../api/client';
import type { Overview } from '../api/types';
import Button from '../components/atoms/Button';
import Segmented from '../components/atoms/Segmented';
import Switch from '../components/atoms/Switch';
import SectionTitle from '../components/molecules/SectionTitle';
import SettingRow from '../components/molecules/SettingRow';
import AccountPanel from '../components/organisms/settings/AccountPanel';
import AccentPicker from '../components/organisms/settings/AccentPicker';
import Shortcuts from '../components/organisms/settings/Shortcuts';
import SkipAreas from '../components/organisms/cleanup/SkipAreas';
import PageHeader from '../components/templates/PageHeader';
import { useApi } from '../hooks/useApi';
import { downloadText } from '../lib/export';
import { useSettings, type Theme, type ViewMode } from '../state/settings';
import { useToast } from '../state/toast';
import { readLangPref, setLangPref, t, type LangPref } from '../i18n';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card card-pad">
      <SectionTitle title={title} hint={hint} />
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { settings, set, reset } = useSettings();
  const { toast } = useToast();
  const overview = useApi<Overview>('/overview', undefined, { ttl: 300_000 });
  const [api, setApi] = useState(API_BASE);

  const exportMeta = async () => {
    try {
      downloadText('archiv-merkliste.json', JSON.stringify(await get('/meta/export'), null, 2), 'application/json');
    } catch (e) {
      toast(e instanceof Error ? e.message : t('Export fehlgeschlagen'), 'warn');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow={t('Persönlich')} title={t('Einstellungen')} subtitle={t('Gelten nur für diesen Browser und werden lokal gespeichert.')} />

      <Section title={t('Zugang')}><AccountPanel /></Section>

      <Section title={t('Darstellung')}>
        <SettingRow title={t('Sprache')} description={t('Gilt für Oberfläche, Datums- und Zahlenformate. Die Seite lädt dabei neu.')}>
          <Segmented
            label={t('Sprache')}
            value={readLangPref()}
            onChange={(v: LangPref) => { setLangPref(v); location.reload(); }}
            options={[{ value: 'auto', label: t('Automatisch') }, { value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]}
          />
        </SettingRow>
        <SettingRow title={t('Design')} description={t('Folgt standardmäßig der Einstellung deines Geräts.')}>
          <Segmented label={t('Design')} value={settings.theme} onChange={(v: Theme) => set('theme', v)} options={[{ value: 'system', label: t('Automatisch') }, { value: 'hell', label: t('Hell') }, { value: 'dunkel', label: t('Dunkel') }]} />
        </SettingRow>
        <SettingRow title={t('Akzentfarbe')}><AccentPicker value={settings.accent} onChange={(a) => set('accent', a)} /></SettingRow>
        <SettingRow title={t('Standardansicht für Dateien')}>
          <Segmented label={t('Ansicht')} value={settings.view} onChange={(v: ViewMode) => set('view', v)} options={[{ value: 'liste', label: t('Liste') }, { value: 'kacheln', label: t('Kacheln') }]} />
        </SettingRow>
        <SettingRow title={t('Kompakte Listen')} description={t('Engere Zeilen – mehr Dateien auf einen Blick.')}><Switch label={t('Kompakte Listen')} checked={settings.compact} onChange={(v) => set('compact', v)} /></SettingRow>
      </Section>

      <Section title={t('Suche & Index')}>
        <SettingRow title={t('Standardmäßig im Dokumentinhalt suchen')} description={t('Die Befehlspalette (Strg+K) durchsucht dann auch den Text in PDFs und Dokumenten. Etwas langsamer.')}><Switch label={t('Inhaltssuche')} checked={settings.contentSearch} onChange={(v) => set('contentSearch', v)} /></SettingRow>
        <SettingRow title={t('Index automatisch auffrischen')} description={t('Beim Öffnen wird ein Index älter als 30 Minuten im Hintergrund aktualisiert – so bleibt die Suche nach dem Umsortieren aktuell.')}><Switch label={t('Auto-Index')} checked={settings.autoIndex} onChange={(v) => set('autoIndex', v)} /></SettingRow>
      </Section>

      <Section title={t('Datenschutz')} hint={t('Praktisch, wenn jemand mitschaut oder du den Bildschirm teilst.')}>
        <SettingRow title={t('Diskreter Modus')} description={t('Verwischt Dateinamen, Pfade und Vorschaubilder. Beim Darüberfahren werden sie kurz scharf. Schnell umschaltbar über das Auge oben rechts.')}><Switch label={t('Diskreter Modus')} checked={settings.privacy} onChange={(v) => set('privacy', v)} /></SettingRow>
      </Section>

      <Section title={t('Aufräum-Analyse')} hint={t('Bereiche, die bei Dubletten, Namen und Bewertung nicht mitzählen – z. B. gekaufte 3D-Bibliotheken.')}>
        <div className="py-4"><SkipAreas areas={overview.data?.areas ?? []} /></div>
      </Section>

      <Section title={t('Verbindung')} hint={t('Nützlich, wenn sich die Adresse deines NAS ändert – ohne neu zu bauen.')}>
        <SettingRow title={t('API-Adresse')} description={t('Standard laut Build: {DEFAULT_API_BASE}. Leer lassen, um den Standard zu verwenden.', { DEFAULT_API_BASE })}>
          <div className="flex w-full flex-col gap-2 sm:w-96 sm:flex-row">
            <input className="input font-mono text-xs" value={api} onChange={(e) => setApi(e.target.value)} aria-label={t('API-Adresse')} placeholder={DEFAULT_API_BASE} />
            <Button onClick={() => { setApiOverride(api === DEFAULT_API_BASE ? '' : api); location.reload(); }}>{t('Speichern')}</Button>
          </div>
        </SettingRow>
      </Section>

      <Section title={t('Daten')}>
        <SettingRow title={t('Merkliste exportieren')} description={t('Favoriten, Tags, Notizen und gespeicherte Suchen als JSON-Datei – ein Backup für den Fall der Fälle.')}><Button icon={<Download className="h-4 w-4" />} onClick={exportMeta}>{t('Exportieren')}</Button></SettingRow>
        <SettingRow title={t('Einstellungen zurücksetzen')} description={t('Setzt nur diese Browser-Einstellungen zurück, nichts im Archiv.')}><Button variant="danger" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { reset(); toast(t('Einstellungen zurückgesetzt'), 'ok'); }}>{t('Zurücksetzen')}</Button></SettingRow>
      </Section>

      <section className="card card-pad"><SectionTitle title={t('Tastenkürzel')} /><Shortcuts /></section>
      <p className="px-1 text-xs text-ink-3">API: <span className="font-mono">{API_BASE}</span></p>
    </div>
  );
}
