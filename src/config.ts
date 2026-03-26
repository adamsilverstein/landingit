import type { Config } from './types.js';
import { STORAGE_KEYS } from './constants.js';

const DEFAULT_CONFIG: Config = {
  repos: [],
  defaults: {
    sort: 'updated',
    filter: 'all',
    maxPrsPerRepo: 30,
    autoRefreshInterval: 300, // 5 minutes in seconds, 0 = disabled
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
