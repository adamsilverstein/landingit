import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ViewMode, FilterMode, SortMode, SortDirection, ItemTypeFilter } from './types.js';
import { createClient } from './github/client.js';
import { getToken, setToken as saveToken, clearToken } from './config.js';
import { useConfig } from './hooks/useConfig.js';
import { useGithubData } from './hooks/useGithubData.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { Header } from './components/Header.js';
import { FilterBar } from './components/FilterBar.js';
import { PRTable } from './components/PRTable.js';
import { StatusBar } from './components/StatusBar.js';
import { HelpModal } from './components/HelpModal.js';
import { RepoManager } from './components/RepoManager.js';
import { TokenSetup } from './components/TokenSetup.js';

const FILTER_CYCLE: FilterMode[] = ['all', 'failing', 'needs-review'];
const SORT_CYCLE: SortMode[] = ['updated', 'created', 'repo', 'status', 'number', 'state', 'title', 'author', 'reviews'];
const ITEM_TYPE_CYCLE: ItemTypeFilter[] = ['both', 'prs', 'issues'];

export function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const { config, enabledRepos, addRepo, removeRepo, toggleRepo } = useConfig();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [cursorIndex, setCursorIndex] = useState(0);
  const [filter, setFilter] = useState<FilterMode>(config.defaults.filter);
  const [sort, setSort] = useState<SortMode>(config.defaults.sort);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [mineOnly, setMineOnly] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const { cycleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('both');

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
  const { items, loading, error, failedRepos, lastRefresh, refresh } = useGithubData(
    octokit,
    enabledRepos,
    config.defaults.maxPrsPerRepo,
    mineOnly ? username : null
  );

  const isModalOpen = viewMode !== 'list';

  const { secondsLeft: autoRefreshSecondsLeft, reset: resetAutoRefresh } = useAutoRefresh({
    intervalSeconds: config.defaults.autoRefreshInterval,
    paused: isModalOpen,
    onRefresh: refresh,
  });

  // Reset countdown on manual refresh
  const handleRefresh = useCallback(() => {
    refresh();
    resetAutoRefresh();
  }, [refresh, resetAutoRefresh]);

  const toggleMineOnly = useCallback(() => {
    setMineOnly((prev) => !prev);
    setCursorIndex(0);
  }, []);

  const cycleItemType = useCallback(() => {
    setItemTypeFilter((prev) => {
      const idx = ITEM_TYPE_CYCLE.indexOf(prev);
      return ITEM_TYPE_CYCLE[(idx + 1) % ITEM_TYPE_CYCLE.length];
    });
    setCursorIndex(0);
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...items];

    // Filter by item type (PR vs Issue vs Both)
    if (itemTypeFilter === 'prs') {
      result = result.filter((item) => item.kind === 'pr');
    } else if (itemTypeFilter === 'issues') {
      result = result.filter((item) => item.kind === 'issue');
    }

    if (filter === 'failing') {
      result = result.filter((item) => item.kind === 'pr' && item.ciStatus === 'failure');
    } else if (filter === 'needs-review') {
      result = result.filter(
        (item) =>
          item.kind === 'pr' &&
          (item.reviewState.changesRequested > 0 || item.reviewState.commentCount > 0)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((pr) => {
        const repoFullName = `${pr.repo.owner}/${pr.repo.name}`.toLowerCase();
        return (
          pr.title.toLowerCase().includes(q) ||
          pr.author.toLowerCase().includes(q) ||
          repoFullName.includes(q) ||
          `#${pr.number}`.includes(q)
        );
      });
    }

    const dir = sortDirection === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'updated':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'created':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'repo': {
          const repoA = `${a.repo.owner}/${a.repo.name}`;
          const repoB = `${b.repo.owner}/${b.repo.name}`;
          cmp = repoA.localeCompare(repoB);
          break;
        }
        case 'status': {
          const priority: Record<string, number> = {
            failure: 0, pending: 1, mixed: 2, none: 3, success: 4,
          };
          const aStatus = a.kind === 'pr' ? a.ciStatus : 'none';
          const bStatus = b.kind === 'pr' ? b.ciStatus : 'none';
          cmp = (priority[aStatus] ?? 3) - (priority[bStatus] ?? 3);
          break;
        }
        case 'number':
          cmp = a.number - b.number;
          break;
        case 'state':
          cmp = a.state.localeCompare(b.state);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'author':
          cmp = a.author.localeCompare(b.author);
          break;
        case 'reviews': {
          const rsA = a.kind === 'pr' ? a.reviewState : { approvals: 0, changesRequested: 0, commentCount: 0 };
          const rsB = b.kind === 'pr' ? b.reviewState : { approvals: 0, changesRequested: 0, commentCount: 0 };
          const scoreA = rsA.approvals * 10 - rsA.changesRequested * 10 + rsA.commentCount;
          const scoreB = rsB.approvals * 10 - rsB.changesRequested * 10 + rsB.commentCount;
          cmp = scoreA - scoreB;
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });

    return result;
  }, [items, filter, sort, sortDirection, searchQuery, itemTypeFilter]);

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
    setSort((prev) => {
      if (prev === key) {
        setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortDirection('desc');
      }
      return key;
    });
  }, []);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
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
      refresh: handleRefresh,
      toggleMineOnly,
      cycleTheme,
      focusSearch,
      cycleItemType,
    }),
    [viewMode, setViewMode, moveCursor, openSelected, cycleFilter, cycleSort, handleRefresh, toggleMineOnly, cycleTheme, focusSearch, cycleItemType]
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
        autoRefreshSecondsLeft={autoRefreshSecondsLeft}
      />
      <FilterBar
        active={filter}
        onFilter={handleSetFilter}
        mineOnly={mineOnly}
        onToggleMine={toggleMineOnly}
        username={username}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        itemTypeFilter={itemTypeFilter}
        onSetItemType={setItemTypeFilter}
      />
      <PRTable
        items={filtered}
        cursorIndex={cursorIndex}
        sort={sort}
        sortDirection={sortDirection}
        onSort={handleSetSort}
      />
      <StatusBar error={error} failedRepos={failedRepos} searchQuery={searchQuery} matchCount={filtered.length} totalCount={items.length} />

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
