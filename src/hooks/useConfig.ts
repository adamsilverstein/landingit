import { useState, useCallback, useMemo } from 'react';
import { loadConfig, saveConfig } from '../config.js';
import type { Config } from '../types.js';

export function useConfig(configPath?: string) {
  const [config, setConfig] = useState<Config>(() => loadConfig(configPath));

  const persist = useCallback(
    (updated: Config) => {
      setConfig(updated);
      saveConfig(updated, configPath);
    },
    [configPath]
  );

  const addRepo = useCallback(
    (owner: string, name: string) => {
      setConfig((prev) => {
        const exists = prev.repos.some(
          (r) => r.owner === owner && r.name === name
        );
        if (exists) return prev;
        const updated = {
          ...prev,
          repos: [...prev.repos, { owner, name, enabled: true }],
        };
        saveConfig(updated, configPath);
        return updated;
      });
    },
    [configPath]
  );

  const removeRepo = useCallback(
    (index: number) => {
      setConfig((prev) => {
        const updated = {
          ...prev,
          repos: prev.repos.filter((_, i) => i !== index),
        };
        saveConfig(updated, configPath);
        return updated;
      });
    },
    [configPath]
  );

  const toggleRepo = useCallback(
    (index: number) => {
      setConfig((prev) => {
        const updated = {
          ...prev,
          repos: prev.repos.map((r, i) =>
            i === index ? { ...r, enabled: !r.enabled } : r
          ),
        };
        saveConfig(updated, configPath);
        return updated;
      });
    },
    [configPath]
  );

  // Stable reference: only changes when the actual repo list changes
  const enabledRepos = useMemo(
    () => config.repos.filter((r) => r.enabled),
    [config.repos]
  );

  return { config, enabledRepos, addRepo, removeRepo, toggleRepo };
}
