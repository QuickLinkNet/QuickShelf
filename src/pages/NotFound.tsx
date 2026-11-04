import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/atoms/Button';
import EmptyState from '../components/molecules/EmptyState';
import { t } from '../i18n';

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-lg">
      <EmptyState icon={<Compass className="h-7 w-7" />} title={t('Diese Seite gibt es nicht')} text={t('Vielleicht hilft dir die Suche (Strg+K) oder die Übersicht weiter.')} action={<Link to="/"><Button variant="primary">{t('Zur Übersicht')}</Button></Link>} />
    </div>
  );
}
