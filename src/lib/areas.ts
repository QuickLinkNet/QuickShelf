import { Box, Briefcase, Camera, FileText, Folder, Inbox, Package, Wrench, type LucideIcon } from 'lucide-react';

export type AreaVisual = { icon: LucideIcon; color: string };

const RULES: Array<[RegExp, AreaVisual]> = [
  [/dokument|unterlagen|papier/i, { icon: FileText, color: '#6366f1' }],
  [/foto|bild|video|medien/i, { icon: Camera, color: '#f59e0b' }],
  [/business|firma|kunden|projekt|arbeit/i, { icon: Briefcase, color: '#10b981' }],
  [/3d|druck|cad/i, { icon: Box, color: '#06b6d4' }],
  [/technik|server|konfig|keys/i, { icon: Wrench, color: '#64748b' }],
  [/software|installer|programm/i, { icon: Package, color: '#8b5cf6' }],
  [/eingang|inbox|sortieren/i, { icon: Inbox, color: '#ec4899' }],
];

/** Icon and colour for a top-level folder, derived from its name (so renamed folders keep working). */
export function areaVisual(name: string): AreaVisual {
  return RULES.find(([re]) => re.test(name))?.[1] ?? { icon: Folder, color: '#94a3b8' };
}

export const isInbox = (name: string): boolean => /eingang|inbox/i.test(name);
