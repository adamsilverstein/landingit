import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { ViewMode, FilterMode, SortMode } from './types.js';
import { createClient } from './github/client.js';
import { getToken, setToken as saveToken, clearToken } from './config.js';
import { useConfig } from './hooks/useConfig.js';
import { useGithubData } from './hooks/useGithubData.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { Header } from './components/Header.js';
import { FilterBar } from './components/FilterBar.js';
import { PRTable } from './components/PRTable.js';
import { StatusBar } from './components/StatusBar.js';
import { HelpModal } from './components/HelpModal.js';
import { RepoManager } from './components/RepoManager.js';
import { TokenSetup } from './components/TokenSetup.js';

const FILTER_CYCLE: FilterMode[] = ['all', 'failing', 'needs-review'];
const SORT_CYCLE: SortMode[] = ['updated', 'created', 'repo', 'status'];

export function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const { config, enabledRepos, addRepo, removeRepo, toggleRepo } = useConfig();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [cursorIndex, setCursorIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>(config.defaults.filter);
  const [sort, setSort] = useState<SortMode>(config.defaults.sort);
  const [mineOnly, setMineOnly] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const octokit = useMemo(
    () => (token ? createClient(token) : null),
    [token]
  );

  // Fetch authenticated user's login
  useEffect(() => {
    if (!octokit) return;
    octokit.users.getAuthenticated().then(
      ({ data }) => setUsername(data.login),
      (e) => console.warn('Failed to fetch user:', e)
    );
  }, [octokit]);

  // Pass username when mineOnly is true so the hook uses the search API
  const { items, loading, error, lastRefresh, refresh } = useGithubData(
    octokit,
    enabledRepos,
    config.defaults.maxPrsPerRepo,
    mineOnly ? username : null
  );

  const toggleMineOnly = useCallback(() => {
    setMineOnly((prev) => !prev);
    setCursorIndex(0);
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...items];

    if (filter === 'failing') {
      result = result.filter((pr) => pr.ciStatus === 'failure');
    } else if (filter === 'needs-review') {
      result = result.filter(
        (pr) =>
          pr.reviewState.changesRequested > 0 || pr.reviewState.commentCount > 0
      );
    }

    result.sort((a, b) => {
      switch (sort) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'repo': {
          const repoA = `${a.repo.owner}/${a.repo.name}`;
          const repoB = `${b.repo.owner}/${b.repo.name}`;
          return repoA.localeCompare(repoB);
        }
        case 'status': {
          const priority: Record<string, number> = {
            failure: 0, pending: 1, mixed: 2, none: 3, success: 4,
          };
          return (priority[a.ciStatus] ?? 3) - (priority[b.ciStatus] ?? 3);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [items, filter, sort]);

  // Clamp cursor when filtered list shrinks
  useEffect(() => {
    setCursorIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const moveCursor = useCallback(
    (delta: number) => {
      setCursorIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return 0;
        if (next >= filtered.length) return Math.max(0, filtered.length - 1);
        return next;
      });
    },
    [filtered.length]
  );

  const openSelected = useCallback(() => {
    const item = filtered[cursorIndex];
    if (item) window.open(item.url, '_blank');
  }, [filtered, cursorIndex]);

  const cycleFilter = useCallback(() => {
    setFilter((prev) => {
      const idx = FILTER_CYCLE.indexOf(prev);
      return FILTER_CYCLE[(idx + 1) % FILTER_CYCLE.length];
    });
    setCursorIndex(0);
  }, []);

  const cycleSort = useCallback(() => {
    setSort((prev) => {
      const idx = SORT_CYCLE.indexOf(prev);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  }, []);

  const handleSetFilter = useCallback((mode: FilterMode) => {
    setFilter(mode);
    setCursorIndex(0);
  }, []);

  const handleSetSort = useCallback((key: SortMode) => {
    setSort(key);
  }, []);

  const handleSignOut = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  const handleSaveToken = useCallback((t: string) => {
    saveToken(t);
    setTokenState(t);
  }, []);

  const shortcutActions = useMemo(
    () => ({
      viewMode,
      setViewMode,
      moveCursor,
      openSelected,
      cycleFilter,
      cycleSort,
      refresh,
      toggleMineOnly,
    }),
    [viewMode, setViewMode, moveCursor, openSelected, cycleFilter, cycleSort, refresh, toggleMineOnly]
  );

  useKeyboardShortcuts(shortcutActions);

  if (!token) {
    return <TokenSetup onSave={handleSaveToken} />;
  }

  return (
    <div className="app">
      <Header
        loading={loading}
        lastRefresh={lastRefresh}
        repoCount={enabledRepos.length}
        itemCount={filtered.length}
        onOpenRepos={() => setViewMode('repos')}
        onSignOut={handleSignOut}
      />
      <FilterBar
        active={filter}
        onFilter={handleSetFilter}
        mineOnly={mineOnly}
        onToggleMine={toggleMineOnly}
        username={username}
      />
      <PRTable
        items={filtered}
        cursorIndex={cursorIndex}
        sort={sort}
        onSort={handleSetSort}
      />
      <StatusBar error={error} />

      {viewMode === 'help' && (
        <HelpModal onClose={() => setViewMode('list')} />
      )}
      {viewMode === 'repos' && (
        <RepoManager
          repos={config.repos}
          onToggle={toggleRepo}
          onRemove={removeRepo}
          onAdd={addRepo}
          onClose={() => setViewMode('list')}
        />
      )}
    </div>
  );
}
