import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, saveConfig, getToken, setToken, clearToken } from './config.js';

describe('loadConfig / saveConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default config when localStorage is empty', () => {
    const config = loadConfig();
    expect(config.repos).toEqual([]);
    expect(config.defaults).toEqual({
      sort: 'updated',
      filter: 'all',
      maxPrsPerRepo: 30,
    });
  });

  it('round-trips config through save and load', () => {
    const config = {
      repos: [{ owner: 'acme', name: 'app', enabled: true }],
      defaults: { sort: 'created' as const, filter: 'failing' as const, maxPrsPerRepo: 50 },
    };
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded).toEqual(config);
  });

  it('returns default config for malformed JSON', () => {
    localStorage.setItem('gh-dashboard-config', 'not json');
    const config = loadConfig();
    expect(config.repos).toEqual([]);
    expect(config.defaults.sort).toBe('updated');
  });

  it('merges partial defaults with default values', () => {
    saveConfig({
      repos: [{ owner: 'a', name: 'b', enabled: true }],
      defaults: { sort: 'repo', filter: 'all', maxPrsPerRepo: 30 },
    });
    // Simulate a stored config that is missing some defaults
    const stored = JSON.parse(localStorage.getItem('gh-dashboard-config')!);
    delete stored.defaults.maxPrsPerRepo;
    localStorage.setItem('gh-dashboard-config', JSON.stringify(stored));

    const config = loadConfig();
    expect(config.defaults.maxPrsPerRepo).toBe(30); // filled in from DEFAULT_CONFIG
    expect(config.defaults.sort).toBe('repo'); // preserved from stored
  });

  it('handles missing repos field in stored config', () => {
    localStorage.setItem('gh-dashboard-config', JSON.stringify({ defaults: {} }));
    const config = loadConfig();
    expect(config.repos).toEqual([]);
  });
});

describe('getToken / setToken / clearToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no token is set', () => {
    expect(getToken()).toBeNull();
  });

  it('round-trips a token', () => {
    setToken('ghp_testtoken123');
    expect(getToken()).toBe('ghp_testtoken123');
  });

  it('clears the token', () => {
    setToken('ghp_testtoken123');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
