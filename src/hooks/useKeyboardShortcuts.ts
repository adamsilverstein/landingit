import { useEffect } from 'react';
import type { MainTab, ViewMode } from '../types.js';

interface ShortcutActions {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  mainTab: MainTab;
  setMainTab: (tab: MainTab) => void;
  moveCursor: (delta: number) => void;
  openSelected: () => void;
  previewSelected: () => void;
  cycleFilter: () => void;
  cycleSort: () => void;
  refresh: () => void;
  toggleMineOnly: () => void;
  cycleTheme: () => void;
  focusSearch: () => void;
  cycleItemType: () => void;
  toggleMilestoneGrouping: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs, except for Escape so modals can still close.
      if (
        e.key !== 'Escape' &&
        (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      const { viewMode, setViewMode, mainTab, setMainTab } = actions;

      // `n` toggles between the pulls and notifications tabs from any non-modal state.
      if (viewMode === 'list' && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setMainTab(mainTab === 'notifications' ? 'pulls' : 'notifications');
        return;
      }

      // Most PR-list shortcuts are inert while the notifications tab is foregrounded;
      // it has its own filters/search and doesn't have a cursor to move.
      if (viewMode === 'list' && mainTab === 'notifications') {
        if (e.key === '?') {
          setViewMode('help');
        } else if (e.key === 'r') {
          actions.refresh();
        } else if (e.key === 'T') {
          actions.cycleTheme();
        } else if (e.key === 'c') {
          setViewMode('repos');
        }
        return;
      }

      if (viewMode === 'help') {
        if (e.key === '?' || e.key === 'Escape') {
          e.preventDefault();
          setViewMode('list');
        }
        return;
      }

      if (viewMode === 'repos') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setViewMode('list');
        }
        return;
      }

      if (viewMode === 'detail') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setViewMode('list');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          actions.openSelected();
        }
        return;
      }

      switch (e.key) {
        case '?':
          setViewMode('help');
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          actions.moveCursor(1);
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          actions.moveCursor(-1);
          break;
        case 'Enter':
          actions.openSelected();
          break;
        case 'p':
        case ' ':
          e.preventDefault();
          actions.previewSelected();
          break;
        case 'f':
          actions.cycleFilter();
          break;
        case 's':
          actions.cycleSort();
          break;
        case 'r':
          actions.refresh();
          break;
        case 'm':
          actions.toggleMineOnly();
          break;
        case 't':
          actions.cycleItemType();
          break;
        case 'T':
          actions.cycleTheme();
          break;
        case 'c':
          setViewMode('repos');
          break;
        case '/':
          e.preventDefault();
          actions.focusSearch();
          break;
        case 'g':
          actions.toggleMilestoneGrouping();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [actions]);
}
