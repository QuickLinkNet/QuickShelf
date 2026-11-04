import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { lang, t } from './i18n';

document.documentElement.lang = lang;
document.title = t('QuickShelf – Dein persönliches Dokumentenarchiv');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
