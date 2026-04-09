import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { loadConfig, saveConfig, getDefaultConfig } from '../config.js';
import type { StorageAdapter } from '../storage.js';
import type { Config } from '../types.js';

export function useConfig(storage: StorageAdapter) {
  const [config, setConfig] = useState<Config>(getDefaultConfig);
  const isInitialMount = useRef(true);
  const storageRef = useRef(storage);
  storageRef.current = storage;

  // Load config from storage on mount
  useEffect(() => {
    loadConfig(storage).then((loaded) => {
      setConfig(loaded);
    });
  }, [storage]);

  // Persist config to storage whenever it changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveConfig(storageRef.current, config).catch((e) => {
      console.warn('Failed to save config:', e);
    });
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

  const toggleRepoByName = useCallback((owner: string, name: string) => {
    setConfig((prev) => {
      const index = prev.repos.findIndex(
        (r) => r.owner === owner && r.name === name
      );
      if (index === -1) return prev;
      return {
        ...prev,
        repos: prev.repos.map((r, i) =>
          i === index ? { ...r, enabled: !r.enabled } : r
        ),
      };
    });
  }, []);

  const enabledRepos = useMemo(
    () => config.repos.filter((r) => r.enabled),
    [config.repos]
  );

  return { config, enabledRepos, addRepo, removeRepo, toggleRepo, toggleRepoByName };
}
