import { get, post, tokenStore } from './client';

export type AuthStatus = {
  auth_enabled: boolean;
  setup_required: boolean;
  authenticated: boolean;
  archive_ok: boolean;
  data_root_locked: boolean;
  read_only: boolean;
};

export type RequirementItem = { id: string; label: string; ok: boolean; required: boolean; value: string; hint: string };

type TokenReply = { ok: boolean; token: string };

export const authApi = {
  status: () => get<AuthStatus>('/auth/status'),
  async login(password: string): Promise<void> {
    tokenStore.set((await post<TokenReply>('/auth/login', { password })).token);
  },
  async setup(input: { password: string; data_root?: string; read_only: boolean }): Promise<void> {
    const reply = await post<TokenReply>('/auth/setup', { ...input, read_only: input.read_only ? '1' : '0' });
    tokenStore.set(reply.token);
  },
  async changePassword(current: string, next: string): Promise<void> {
    tokenStore.set((await post<TokenReply>('/auth/password', { current, next })).token);
  },
  async logout(): Promise<void> {
    tokenStore.set(null);
    await post('/auth/logout').catch(() => undefined);
  },
  requirements: () => get<{ items: RequirementItem[]; blocking: boolean }>('/setup/requirements'),
  checkFolder: (path: string) => post<{ ok: boolean; error?: string; entries?: number }>('/setup/check', { path }),
};
