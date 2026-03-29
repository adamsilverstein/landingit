import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
import type { ViewMode } from '../types.js';

function makeActions() {
  return {
    viewMode: 'list' as ViewMode,
    setViewMode: vi.fn(),
    moveCursor: vi.fn(),
    openSelected: vi.fn(),
    previewSelected: vi.fn(),
    cycleFilter: vi.fn(),
    cycleSort: vi.fn(),
    refresh: vi.fn(),
    toggleMineOnly: vi.fn(),
    cycleTheme: vi.fn(),
    focusSearch: vi.fn(),
    cycleItemType: vi.fn(),
    toggleMilestoneGrouping: vi.fn(),
  };
}

function pressKey(key: string, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  if (target) {
    Object.defineProperty(event, 'target', { value: target });
  }
  document.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  let actions: ReturnType<typeof makeActions>;

  beforeEach(() => {
    actions = makeActions();
  });

  describe('list mode shortcuts', () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts(actions));
    });

    it('j moves cursor down', () => {
      pressKey('j');
      expect(actions.moveCursor).toHaveBeenCalledWith(1);
    });

    it('ArrowDown moves cursor down', () => {
      pressKey('ArrowDown');
      expect(actions.moveCursor).toHaveBeenCalledWith(1);
    });

    it('k moves cursor up', () => {
      pressKey('k');
      expect(actions.moveCursor).toHaveBeenCalledWith(-1);
    });

    it('ArrowUp moves cursor up', () => {
      pressKey('ArrowUp');
      expect(actions.moveCursor).toHaveBeenCalledWith(-1);
    });

    it('Enter opens selected', () => {
      pressKey('Enter');
      expect(actions.openSelected).toHaveBeenCalled();
    });

    it('p previews selected', () => {
      pressKey('p');
      expect(actions.previewSelected).toHaveBeenCalled();
    });

    it('Space previews selected', () => {
      pressKey(' ');
      expect(actions.previewSelected).toHaveBeenCalled();
    });

    it('f cycles filter', () => {
      pressKey('f');
      expect(actions.cycleFilter).toHaveBeenCalled();
    });

    it('s cycles sort', () => {
      pressKey('s');
      expect(actions.cycleSort).toHaveBeenCalled();
    });

    it('r refreshes', () => {
      pressKey('r');
      expect(actions.refresh).toHaveBeenCalled();
    });

    it('m toggles mine-only', () => {
      pressKey('m');
      expect(actions.toggleMineOnly).toHaveBeenCalled();
    });

    it('t cycles item type', () => {
      pressKey('t');
      expect(actions.cycleItemType).toHaveBeenCalled();
    });

    it('T cycles theme', () => {
      pressKey('T');
      expect(actions.cycleTheme).toHaveBeenCalled();
    });

    it('c opens repo manager', () => {
      pressKey('c');
      expect(actions.setViewMode).toHaveBeenCalledWith('repos');
    });

    it('? opens help', () => {
      pressKey('?');
      expect(actions.setViewMode).toHaveBeenCalledWith('help');
    });

    it('/ focuses search', () => {
      pressKey('/');
      expect(actions.focusSearch).toHaveBeenCalled();
    });

    it('g toggles milestone grouping', () => {
      pressKey('g');
      expect(actions.toggleMilestoneGrouping).toHaveBeenCalled();
    });
  });

  describe('input suppression', () => {
    it('ignores keys when target is an input element', () => {
      renderHook(() => useKeyboardShortcuts(actions));
      const input = document.createElement('input');
      pressKey('j', input);
      expect(actions.moveCursor).not.toHaveBeenCalled();
    });

    it('ignores keys when target is a textarea', () => {
      renderHook(() => useKeyboardShortcuts(actions));
      const textarea = document.createElement('textarea');
      pressKey('j', textarea);
      expect(actions.moveCursor).not.toHaveBeenCalled();
    });
  });

  describe('help modal mode', () => {
    it('Escape closes help modal', () => {
      actions.viewMode = 'help';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('Escape');
      expect(actions.setViewMode).toHaveBeenCalledWith('list');
    });

    it('? closes help modal', () => {
      actions.viewMode = 'help';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('?');
      expect(actions.setViewMode).toHaveBeenCalledWith('list');
    });

    it('other keys are ignored in help mode', () => {
      actions.viewMode = 'help';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('j');
      expect(actions.moveCursor).not.toHaveBeenCalled();
    });
  });

  describe('repos modal mode', () => {
    it('Escape closes repos modal', () => {
      actions.viewMode = 'repos';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('Escape');
      expect(actions.setViewMode).toHaveBeenCalledWith('list');
    });

    it('other keys are ignored in repos mode', () => {
      actions.viewMode = 'repos';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('j');
      expect(actions.moveCursor).not.toHaveBeenCalled();
    });
  });

  describe('detail panel mode', () => {
    it('Escape closes detail panel', () => {
      actions.viewMode = 'detail';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('Escape');
      expect(actions.setViewMode).toHaveBeenCalledWith('list');
    });

    it('Enter opens selected item in detail mode', () => {
      actions.viewMode = 'detail';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('Enter');
      expect(actions.openSelected).toHaveBeenCalled();
    });

    it('other keys are ignored in detail mode', () => {
      actions.viewMode = 'detail';
      renderHook(() => useKeyboardShortcuts(actions));
      pressKey('j');
      expect(actions.moveCursor).not.toHaveBeenCalled();
      pressKey('f');
      expect(actions.cycleFilter).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const { unmount } = renderHook(() => useKeyboardShortcuts(actions));
      unmount();
      pressKey('j');
      expect(actions.moveCursor).not.toHaveBeenCalled();
    });
  });
});
