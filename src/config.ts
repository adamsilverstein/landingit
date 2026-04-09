// Backward-compatible synchronous localStorage config for the web app.
// The shared module uses async StorageAdapter; this wraps localStorage directly.
import type { Config } from '../shared/types.js';
import { STORAGE_KEYS } from '../shared/constants.js';

const DEFAULT_CONFIG: Config = {
  repos: [],
  defaults: {
    sort: 'updated',
    filter: 'all',
    maxPrsPerRepo: 30,
    autoRefreshInterval: 300,
    staleDays: 14,
  },
};

export function loadConfig(): Config {
  const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (!raw) return { ...DEFAULT_CONFIG, repos: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      repos: parsed.repos ?? [],
      defaults: { ...DEFAULT_CONFIG.defaults, ...parsed.defaults },
    };
  } catch {
    return { ...DEFAULT_CONFIG, repos: [] };
  }
}

export function saveConfig(config: Config): void {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}
