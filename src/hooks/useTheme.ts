import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types.js';

const STORAGE_KEY = 'gh-dashboard-theme';
const THEME_CYCLE: ThemeMode[] = ['dark', 'light', 'system'];

function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'system';
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(loadTheme);

  const cycleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const idx = THEME_CYCLE.indexOf(prev);
      const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Apply resolved theme to <html> and listen for system changes
  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(themeMode);
      document.documentElement.setAttribute('data-theme', resolved);
    };

    apply();

    if (themeMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [themeMode]);

  return { themeMode, cycleTheme };
}
