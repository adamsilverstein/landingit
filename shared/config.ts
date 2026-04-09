import type { Config } from './types.js';
import type { StorageAdapter } from './storage.js';
import { STORAGE_KEYS } from './constants.js';

const DEFAULT_CONFIG: Config = {
  repos: [],
  defaults: {
    sort: 'updated',
    filter: 'all',
    maxPrsPerRepo: 30,
    autoRefreshInterval: 300, // 5 minutes in seconds, 0 = disabled
    staleDays: 14, // days of inactivity before an item is considered stale
  },
};

export function getDefaultConfig(): Config {
  return { ...DEFAULT_CONFIG, repos: [] };
}

export async function loadConfig(storage: StorageAdapter): Promise<Config> {
  const raw = await storage.getItem(STORAGE_KEYS.CONFIG);
  if (!raw) return getDefaultConfig();
  try {
    const parsed = JSON.parse(raw);
    return {
      repos: parsed.repos ?? [],
      defaults: { ...DEFAULT_CONFIG.defaults, ...parsed.defaults },
    };
  } catch {
    return getDefaultConfig();
  }
}

export async function saveConfig(storage: StorageAdapter, config: Config): Promise<void> {
  await storage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export async function getToken(storage: StorageAdapter): Promise<string | null> {
  return storage.getItem(STORAGE_KEYS.TOKEN);
}

export async function setToken(storage: StorageAdapter, token: string): Promise<void> {
  await storage.setItem(STORAGE_KEYS.TOKEN, token);
}

export async function clearToken(storage: StorageAdapter): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.TOKEN);
}
