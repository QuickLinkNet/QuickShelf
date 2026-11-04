import { t } from '../i18n';
export type ViewerKind = 'pdf' | 'image' | 'text' | 'docx' | 'xlsx' | 'video' | 'audio';
export type FileGroup = 'dokumente' | 'tabellen' | 'bilder' | 'videos' | 'audio' | '3d' | 'code' | 'archive' | 'sonstiges';

const GROUPS: Record<Exclude<FileGroup, 'sonstiges'>, string[]> = {
  dokumente: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'pages', 'eml', 'msg'],
  tabellen: ['xls', 'xlsx', 'xlsm', 'csv', 'ods', 'numbers'],
  bilder: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'psd', 'svg', 'nef', 'cr2', 'raw'],
  videos: ['mp4', 'mov', 'avi', 'mkv', 'mts', 'm2ts', 'wmv', 'vob', 'm4v', 'webm', '3gp'],
  audio: ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'flac', 'aac'],
  '3d': ['stl', 'obj', '3mf', 'gcode', 'c4d', 'max', '3ds', 'lwo', 'dxf', 'blend', 'step', 'stp', 'fbx', 'mtl', 'tga'],
  code: ['js', 'ts', 'tsx', 'jsx', 'php', 'json', 'sql', 'py', 'h', 'cpp', 'c', 'o', 'xml', 'html', 'css', 'yml', 'yaml', 'sqlite', 'db'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'wpress'],
};

export const GROUP_LABEL: Record<FileGroup, string> = {
  dokumente: t('Dokumente'),
  tabellen: t('Tabellen'),
  bilder: t('Bilder'),
  videos: t('Videos'),
  audio: t('Audio'),
  '3d': t('3D & Druck'),
  code: t('Code & Daten'),
  archive: t('Archive'),
  sonstiges: t('Sonstiges'),
};

/** One colour per group, used for icons, charts and legends. */
export const GROUP_COLOR: Record<FileGroup, string> = {
  dokumente: '#6366f1',
  tabellen: '#10b981',
  bilder: '#f59e0b',
  videos: '#ec4899',
  audio: '#8b5cf6',
  '3d': '#06b6d4',
  code: '#64748b',
  archive: '#a16207',
  sonstiges: '#94a3b8',
};

export function groupOf(ext: string | undefined): FileGroup {
  const e = (ext ?? '').toLowerCase();
  for (const [key, list] of Object.entries(GROUPS)) if (list.includes(e)) return key as FileGroup;
  return 'sonstiges';
}

export const groupExtensions = (group: FileGroup): string[] => (group === 'sonstiges' ? [] : GROUPS[group]);

const VIEWERS: Record<string, ViewerKind> = {
  pdf: 'pdf',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
  txt: 'text', md: 'text', csv: 'text', log: 'text', json: 'text',
  docx: 'docx',
  xlsx: 'xlsx',
  mp4: 'video', m4v: 'video', mov: 'video', webm: 'video',
  mp3: 'audio', m4a: 'audio', ogg: 'audio', opus: 'audio', wav: 'audio', flac: 'audio',
};

/** Returns the viewer for a file extension, or null when the browser cannot show it. */
export const viewerKind = (ext: string | undefined): ViewerKind | null => VIEWERS[(ext ?? '').toLowerCase()] ?? null;

/** True when the API can generate a thumbnail (GD supports these formats). */
export const hasThumbnail = (ext: string | undefined): boolean => ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((ext ?? '').toLowerCase());
