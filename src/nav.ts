import { Activity, FolderOpen, HardDrive, Images, Inbox, LayoutDashboard, Settings, Sparkles, Star, type LucideIcon } from 'lucide-react';
import { t } from './i18n';

export type NavItem = { name: string; href: string; icon: LucideIcon; hint: string; mobile?: boolean };

export const NAV: NavItem[] = [
  { name: t('Übersicht'), href: '/', icon: LayoutDashboard, hint: t('Dein Archiv auf einen Blick'), mobile: true },
  { name: t('Dateien'), href: '/files', icon: FolderOpen, hint: t('Durchsuchen und stöbern'), mobile: true },
  { name: t('Galerie'), href: '/gallery', icon: Images, hint: t('Fotos nach Datum'), mobile: true },
  { name: t('Aufräumen'), href: '/cleanup', icon: Sparkles, hint: t('Ordnung halten'), mobile: true },
  { name: t('Einsortieren'), href: '/sort', icon: Inbox, hint: t('Eingang durchgehen und ablegen') },
  { name: t('Merkliste'), href: '/favorites', icon: Star, hint: t('Favoriten, Tags, Notizen') },
  { name: t('Aktivität'), href: '/activity', icon: Activity, hint: t('Was sich wann geändert hat') },
  { name: t('System'), href: '/system', icon: HardDrive, hint: t('Speicher und Status') },
  { name: t('Einstellungen'), href: '/settings', icon: Settings, hint: t('Darstellung und Verhalten') },
];

export const isActivePath = (current: string, href: string): boolean =>
  href === '/' ? current === '/' : current === href || current.startsWith(`${href}/`);
