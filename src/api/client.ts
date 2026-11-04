/** Thin typed wrapper around the PHP API. All URLs are built here so components never touch fetch directly. */

import { t } from '../i18n';

const STORAGE_KEY = 'nas.api';
const readOverride = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Build-time default (VITE_API_BASE) unless the user set another address in the settings.
 * Without either, the API is expected in the `api/` folder next to index.html (works in any sub-folder).
 */
export const DEFAULT_API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) || 'api').replace(/\/+$/, '');
export const API_BASE: string = (readOverride() || DEFAULT_API_BASE).replace(/\/+$/, '');

/** Saves (or clears, with an empty value) a custom API address; takes effect after a reload. */
export function setApiOverride(value: string): void {
  try {
    if (value.trim()) localStorage.setItem(STORAGE_KEY, value.trim());
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked */
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'nas.token';
/** Session token for the Authorization header (the API also sets an HttpOnly cookie for media tags). */
export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null): void => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage blocked: the cookie still works */
    }
  },
};
/** Fired when the API answers 401, so the app can show the login again. */
export const AUTH_EVENT = 'nas:unauthorized';

const authHeaders = (): Record<string, string> => {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type Params = Record<string, string | number | boolean | undefined | null | string[]>;

export function qs(params: Params = {}): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value)) value.forEach((v) => p.append(`${key}[]`, v));
    else p.set(key, value === true ? '1' : String(value));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = t('API Fehler ({status})', { status: res.status });
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body.error) message = t(body.error);
      code = body.code;
    } catch {
      /* keep the generic message */
    }
    if (res.status === 401 && code === 'auth') window.dispatchEvent(new Event(AUTH_EVENT));
    throw new ApiError(res.status, message, code);
  }
  return (await res.json()) as T;
}

export const get = <T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> =>
  fetch(`${API_BASE}${path}${qs(params)}`, { signal, headers: authHeaders() }).then((res) => parse<T>(res));

export const post = <T>(path: string, body: unknown = {}, signal?: AbortSignal): Promise<T> =>
  fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    signal,
  }).then((res) => parse<T>(res));

export const urls = {
  download: (path: string) => `${API_BASE}/download${qs({ path })}`,
  inline: (path: string) => `${API_BASE}/download${qs({ path, inline: true })}`,
  thumb: (path: string, w = 320) => `${API_BASE}/thumb${qs({ path, w })}`,
  zip: (paths: string[], name = 'archiv') => `${API_BASE}/zip${qs({ paths, name })}`,
};

/** Rebuilds the search index in slices until the API reports it is done. Returns false when aborted. */
export async function rebuildIndex(onProgress?: (round: number) => void, signal?: AbortSignal): Promise<boolean> {
  for (let round = 1; round <= 400; round += 1) {
    if (signal?.aborted) return false;
    const data = await post<{ done?: boolean }>('/index/rebuild', {}, signal);
    onProgress?.(round);
    if (data.done !== false) return true;
  }
  return true;
}
