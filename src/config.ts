import type { Config } from './types.js';

const STORAGE_KEY = 'gh-dashboard-config';
const TOKEN_KEY = 'gh-dashboard-token';

const DEFAULT_CONFIG: Config = {
  repos: [],
  defaults: {
    sort: 'updated',
    filter: 'all',
    maxPrsPerRepo: 30,
  },
};

export function loadConfig(): Config {
  const raw = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
