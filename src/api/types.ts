export type ApiItem = {
  name: string;
  type: 'dir' | 'file';
  ext?: string;
  size: number | null;
  modified: number;
  path: string;
  snippet?: string;
  missing?: boolean;
};

export type IndexStatus = {
  ready: boolean;
  files: number;
  with_text: number;
  updated: number | null;
  read_only: boolean;
};

export type AreaStat = { name: string; path: string; files: number; bytes: number; dirs: number; latest: number };
export type TypeStat = { key: string; label: string; files: number; bytes: number };
export type YearStat = { year: number; files: number; bytes: number };

export type Overview = {
  totals: { files: number; bytes: number; with_text: number; dirs: number; latest: number };
  areas: AreaStat[];
  types: TypeStat[];
  years: YearStat[];
  recent: ApiItem[];
  largest: ApiItem[];
};

export type FolderChild = { name: string; path: string; files: number; bytes: number; latest: number };
export type FolderInfo = {
  path: string;
  files: number;
  bytes: number;
  oldest: number | null;
  newest: number | null;
  children: FolderChild[];
  types: TypeStat[];
};

export type HeatDay = { date: string; count: number; bytes: number };
export type Heatmap = { days: number; items: HeatDay[] };
export type ListResult = { items: ApiItem[]; total?: number };

export type NameRule = { key: string; label: string; hint: string; count: number };
export type DuplicateStats = { groups: number; wasted_files: number; wasted_bytes: number };
export type InsightsSummary = {
  total_files: number;
  score: number;
  names: NameRule[];
  duplicates: DuplicateStats;
  empty_dirs: number;
  inbox_files: number;
  no_ext: number;
  huge: number;
  deep_paths: number;
  generated: number;
};

export type DuplicateGroup = { name: string; size: number; count: number; wasted: number; paths: string[]; modified: number };
export type DuplicatesResult = { groups: DuplicateGroup[]; stats: DuplicateStats };

export type SystemInfo = {
  disk: { total: number | null; free: number | null; used: number | null };
  index: IndexStatus & { size_bytes: number; ocr_enabled: boolean; pdf_text: boolean };
  api: {
    php: string;
    os: string;
    memory_limit: string;
    time: number;
    read_only: boolean;
    hidden_folders: number;
    features: Record<'sqlite' | 'thumbnails' | 'zip' | 'exif' | 'mbstring', boolean>;
  };
  thumbs: { files: number; bytes: number };
};

export type Meta = {
  path: string;
  favorite: boolean;
  tags: string[];
  note: string;
  note_updated: number | null;
  views: number;
  last_view: number | null;
};

export type NoteEntry = { path: string; note: string; updated: number; item: ApiItem | null; missing: boolean };
export type SavedSearch = { id: number; label: string; params: Record<string, string | boolean>; created: number };
