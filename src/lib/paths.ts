import { t } from '../i18n';
export const basename = (path: string): string => path.replace(/\/+$/, '').split('/').pop() ?? '';

export function dirname(path: string): string {
  const idx = path.replace(/\/+$/, '').lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}

export const normalize = (path: string): string => '/' + path.split('/').filter(Boolean).join('/');

export const join = (dir: string, name: string): string => normalize(`${dir}/${name}`);

/** Breadcrumb parts: [{name:'Archiv', path:'/'}, …]. */
export function crumbs(path: string, root = t('Archiv')): Array<{ name: string; path: string }> {
  const out = [{ name: root, path: '/' }];
  let acc = '';
  for (const part of path.split('/').filter(Boolean)) {
    acc += `/${part}`;
    out.push({ name: part, path: acc });
  }
  return out;
}

/** "01_Dokumente" -> "Dokumente": strips sort prefixes for display. */
export function prettyName(name: string): string {
  return name.replace(/^\d{1,3}_/, '').replace(/_/g, ' ');
}

export const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i <= 0 ? '' : name.slice(i + 1).toLowerCase();
};
