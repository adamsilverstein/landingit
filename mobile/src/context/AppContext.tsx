import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Octokit } from '@octokit/rest';
import { createClient, type RateLimit } from '../../../shared/github/client.js';
import { getToken, setToken, clearToken } from '../../../shared/config.js';
import { initDetailCache } from '../../../shared/github/details.js';
import { secureStorageAdapter } from '../storage/secureStorageAdapter';
import { asyncStorageAdapter } from '../storage/asyncStorageAdapter';

// Load bundled dev token from local.config.json (gitignored, never committed).
// This file is optional — if missing, the app falls back to Keychain storage.
let localToken: string | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const localConfig = require('../../local.config.json');
  if (localConfig?.token) localToken = localConfig.token;
} catch {
  // File doesn't exist — normal in production builds
}

interface AppContextValue {
  token: string | null;
  octokit: Octokit | null;
  username: string | null;
  rateLimit: RateLimit | null;
  loading: boolean;
  saveToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  token: null,
  octokit: null,
  username: null,
  rateLimit: null,
  loading: true,
  saveToken: async () => {},
  signOut: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token: prefer local dev config, then fall back to Keychain
  useEffect(() => {
    (async () => {
      if (localToken) {
        setTokenState(localToken);
      } else {
        const stored = await getToken(secureStorageAdapter);
        setTokenState(stored);
      }
      setLoading(false);
      // Initialize detail cache with AsyncStorage
      await initDetailCache(asyncStorageAdapter);
    })();
  }, []);

  const handleRateLimit = useCallback((rl: RateLimit) => setRateLimit(rl), []);

  const octokit = useMemo(
    () => (token ? createClient(token, handleRateLimit) : null),
    [token, handleRateLimit]
  );

  // Fetch authenticated user
  useEffect(() => {
    if (!octokit) {
      setUsername(null);
      return;
    }
    octokit.users.getAuthenticated().then(
      ({ data }) => setUsername(data.login),
      (e) => console.warn('Failed to fetch user:', e)
    );
  }, [octokit]);

  const saveTokenHandler = useCallback(async (t: string) => {
    await setToken(secureStorageAdapter, t);
    setTokenState(t);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken(secureStorageAdapter);
    setTokenState(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({ token, octokit, username, rateLimit, loading, saveToken: saveTokenHandler, signOut }),
    [token, octokit, username, rateLimit, loading, saveTokenHandler, signOut]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
