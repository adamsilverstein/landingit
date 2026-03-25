import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfig } from '../hooks/useConfig.js';

describe('useConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initialises with default config', () => {
    const { result } = renderHook(() => useConfig());
    expect(result.current.config.repos).toEqual([]);
    expect(result.current.enabledRepos).toEqual([]);
  });

  it('adds a repo', () => {
    const { result } = renderHook(() => useConfig());
    act(() => result.current.addRepo('acme', 'web'));
    expect(result.current.config.repos).toHaveLength(1);
    expect(result.current.config.repos[0]).toEqual({
      owner: 'acme',
      name: 'web',
      enabled: true,
    });
  });

  it('does not add a duplicate repo', () => {
    const { result } = renderHook(() => useConfig());
    act(() => result.current.addRepo('acme', 'web'));
    act(() => result.current.addRepo('acme', 'web'));
    expect(result.current.config.repos).toHaveLength(1);
  });

  it('removes a repo by index', () => {
    const { result } = renderHook(() => useConfig());
    act(() => result.current.addRepo('a', 'one'));
    act(() => result.current.addRepo('b', 'two'));
    act(() => result.current.removeRepo(0));
    expect(result.current.config.repos).toHaveLength(1);
    expect(result.current.config.repos[0].name).toBe('two');
  });

  it('toggles a repo enabled/disabled', () => {
    const { result } = renderHook(() => useConfig());
    act(() => result.current.addRepo('acme', 'web'));
    expect(result.current.config.repos[0].enabled).toBe(true);

    act(() => result.current.toggleRepo(0));
    expect(result.current.config.repos[0].enabled).toBe(false);

    act(() => result.current.toggleRepo(0));
    expect(result.current.config.repos[0].enabled).toBe(true);
  });

  it('enabledRepos filters disabled repos', () => {
    const { result } = renderHook(() => useConfig());
    act(() => result.current.addRepo('a', 'one'));
    act(() => result.current.addRepo('b', 'two'));
    act(() => result.current.toggleRepo(0)); // disable first
    expect(result.current.enabledRepos).toHaveLength(1);
    expect(result.current.enabledRepos[0].name).toBe('two');
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useConfig());
    act(() => result.current.addRepo('acme', 'web'));

    const stored = JSON.parse(localStorage.getItem('gh-dashboard-config')!);
    expect(stored.repos).toHaveLength(1);
    expect(stored.repos[0].owner).toBe('acme');
  });
});
