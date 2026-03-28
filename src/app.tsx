import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { DashboardItem, OwnershipFilter } from './types.js';
import { createClient, type RateLimit } from './github/client.js';
import { getToken, setToken as saveToken, clearToken } from './config.js';
import { useConfig } from './hooks/useConfig.js';
import { useGithubData } from './hooks/useGithubData.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { useLastSeen } from './hooks/useLastSeen.js';
import { useFilteredItems } from './hooks/useFilteredItems.js';
import { useModalState } from './hooks/useModalState.js';
import { useColumnSettings } from './hooks/useColumnSettings.js';
import { Header } from './components/Header.js';
import { FilterBar } from './components/FilterBar.js';
import { PRTable } from './components/PRTable.js';
import { StatusBar } from './components/StatusBar.js';
import { HelpModal } from './components/HelpModal.js';
import { RepoManager } from './components/RepoManager.js';
import { TokenSetup } from './components/TokenSetup.js';
import { DetailPanel } from './components/DetailPanel.js';

const OWNERSHIP_CYCLE: OwnershipFilter[] = ['created', 'assigned', 'involved', 'everyone'];

export function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const { config, enabledRepos, addRepo, removeRepo, toggleRepo, toggleRepoByName } = useConfig();
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('created');
  const [username, setUsername] = useState<string | null>(null);
  const { cycleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);

  const { markSeen, isUnseen } = useLastSeen();
  const { visibleColumns, columnOrder, toggleColumn, reorderColumns, resetColumns } = useColumnSettings();

  const {
    viewMode, setViewMode, previewItem, isModalOpen,
    openDetail, closeDetail, openRepos, closeModal,
  } = useModalState();

  const handleRateLimit = useCallback((rl: RateLimit) => setRateLimit(rl), []);

  const octokit = useMemo(
    () => (token ? createClient(token, handleRateLimit) : null),
    [token, handleRateLimit]
  );

  // Fetch authenticated user's login
  useEffect(() => {
    if (!octokit) return;
    octokit.users.getAuthenticated().then(
      ({ data }) => setUsername(data.login),
      (e) => console.warn('Failed to fetch user:', e)
    );
  }, [octokit]);

  // Pass username for user-specific filters, null for "everyone"
  const { items, loading, error, failedRepos, lastRefresh, refresh } = useGithubData(
    octokit,
    enabledRepos,
    config.defaults.maxPrsPerRepo,
    ownershipFilter !== 'everyone' ? username : null,
    username,
    ownershipFilter
  );

  const {
    filtered, filter, sort, sortDirection, searchQuery, setSearchQuery,
    itemTypeFilter, setItemTypeFilter, cursorIndex, setCursorIndex,
    prStateFilters, togglePRStateFilter,
    labelFilters, toggleLabelFilter, clearLabelFilters, availableLabels,
    moveCursor, cycleFilter, cycleSort,
    handleSetFilter, handleSetSort, cycleItemType,
  } = useFilteredItems({
    items,
    defaultFilter: config.defaults.filter,
    defaultSort: config.defaults.sort,
    isUnseen,
    staleDays: config.defaults.staleDays,
  });

  const { secondsLeft: autoRefreshSecondsLeft, reset: resetAutoRefresh } = useAutoRefresh({
    intervalSeconds: config.defaults.autoRefreshInterval,
    paused: isModalOpen,
    onRefresh: refresh,
  });

  const handleRefresh = useCallback(() => {
    refresh();
    resetAutoRefresh();
  }, [refresh, resetAutoRefresh]);

  const cycleOwnership = useCallback(() => {
    setOwnershipFilter((prev) => {
      const idx = OWNERSHIP_CYCLE.indexOf(prev);
      return OWNERSHIP_CYCLE[(idx + 1) % OWNERSHIP_CYCLE.length];
    });
    setCursorIndex(0);
  }, [setCursorIndex]);

  const openSelected = useCallback(() => {
    const item = filtered[cursorIndex];
    if (item) {
      markSeen(item);
      window.open(item.url, '_blank');
    }
  }, [filtered, cursorIndex, markSeen]);

  const previewPR = useCallback((item: DashboardItem) => {
    if (item.kind !== 'pr') return;
    openDetail(item);
  }, [openDetail]);

  const previewSelected = useCallback(() => {
    const item = filtered[cursorIndex];
    if (item?.kind === 'pr') {
      openDetail(item);
    }
  }, [filtered, cursorIndex, openDetail]);

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

  const unseenCount = useMemo(
    () => items.filter((pr) => isUnseen(pr)).length,
    [items, isUnseen]
  );

  const hiddenRepos = useMemo(
    () => config.repos.filter((r) => !r.enabled),
    [config.repos]
  );

  const shortcutActions = useMemo(
    () => ({
      viewMode,
      setViewMode,
      moveCursor,
      openSelected,
      previewSelected,
      cycleFilter,
      cycleSort,
      refresh: handleRefresh,
      toggleMineOnly: cycleOwnership,
      cycleTheme,
      focusSearch,
      cycleItemType,
    }),
    [viewMode, setViewMode, moveCursor, openSelected, previewSelected, cycleFilter, cycleSort, handleRefresh, cycleOwnership, cycleTheme, focusSearch, cycleItemType]
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
        unseenCount={unseenCount}
        onOpenRepos={openRepos}
        onSignOut={handleSignOut}
        autoRefreshSecondsLeft={autoRefreshSecondsLeft}
        rateLimit={rateLimit}
      />
      <FilterBar
        active={filter}
        onFilter={handleSetFilter}
        ownershipFilter={ownershipFilter}
        onSetOwnership={setOwnershipFilter}
        username={username}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        itemTypeFilter={itemTypeFilter}
        onSetItemType={setItemTypeFilter}
        hiddenRepos={hiddenRepos}
        onRestoreRepo={toggleRepoByName}
        prStateFilters={prStateFilters}
        onTogglePRState={togglePRStateFilter}
        labelFilters={labelFilters}
        onToggleLabel={toggleLabelFilter}
        onClearLabels={clearLabelFilters}
        availableLabels={availableLabels}
      />
      <PRTable
        items={filtered}
        cursorIndex={cursorIndex}
        sort={sort}
        sortDirection={sortDirection}
        onSort={handleSetSort}
        onPreview={previewPR}
        isUnseen={isUnseen}
        onOpen={markSeen}
        onHideRepo={toggleRepoByName}
        staleDays={config.defaults.staleDays}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        onToggleColumn={toggleColumn}
        onReorderColumns={reorderColumns}
        onResetColumns={resetColumns}
      />
      <StatusBar error={error} failedRepos={failedRepos} searchQuery={searchQuery} matchCount={filtered.length} totalCount={items.length} />

      {viewMode === 'help' && (
        <HelpModal onClose={closeModal} />
      )}
      {viewMode === 'repos' && (
        <RepoManager
          repos={config.repos}
          onToggle={toggleRepo}
          onRemove={removeRepo}
          onAdd={addRepo}
          onClose={closeModal}
        />
      )}
      {viewMode === 'detail' && previewItem && previewItem.kind === 'pr' && octokit && (
        <DetailPanel
          item={previewItem}
          octokit={octokit}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
