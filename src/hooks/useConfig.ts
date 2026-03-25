import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { loadConfig, saveConfig } from '../config.js';
import type { Config } from '../types.js';

export function useConfig() {
  const [config, setConfig] = useState<Config>(() => loadConfig());
  const isInitialMount = useRef(true);

  // Persist config to localStorage whenever it changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      saveConfig(config);
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  }, [config]);

  const addRepo = useCallback((owner: string, name: string) => {
    setConfig((prev) => {
      const exists = prev.repos.some(
        (r) => r.owner === owner && r.name === name
      );
      if (exists) return prev;
      return {
        ...prev,
        repos: [...prev.repos, { owner, name, enabled: true }],
      };
    });
  }, []);

  const removeRepo = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      repos: prev.repos.filter((_, i) => i !== index),
    }));
  }, []);

  const toggleRepo = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      repos: prev.repos.map((r, i) =>
        i === index ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  }, []);

  const enabledRepos = useMemo(
    () => config.repos.filter((r) => r.enabled),
    [config.repos]
  );

  return { config, enabledRepos, addRepo, removeRepo, toggleRepo };
}
