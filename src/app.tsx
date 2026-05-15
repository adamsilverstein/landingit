import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { DashboardItem, NotificationItem, OwnershipFilter } from './types.js';
import { createClient, type RateLimit } from './github/client.js';
import { isAuthError } from './github/errors.js';
import { getToken, setToken as saveToken, clearToken } from './config.js';
import { getAuthMethod } from '../shared/auth/method.js';
import { useConfig } from './hooks/useConfig.js';
import { useGithubData } from './hooks/useGithubData.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { useLastSeen } from './hooks/useLastSeen.js';
import { useFilteredItems } from './hooks/useFilteredItems.js';
import { useModalState } from './hooks/useModalState.js';
import { useColumnSettings } from './hooks/useColumnSettings.js';
import { useNotifications } from '../shared/hooks/useNotifications.js';
import {
  useNotificationRules,
  notificationsMatchingRule,
} from '../shared/hooks/useNotificationRules.js';
import { notificationsByItemKey, itemKey } from '../shared/utils/notificationMatch.js';
import { webStorage } from './storage/webStorage.js';
import { Header } from './components/Header.js';
import { FilterBar } from './components/FilterBar.js';
import { PRTable } from './components/PRTable.js';
import { StatusBar } from './components/StatusBar.js';
import { HelpModal } from './components/HelpModal.js';
import { RepoManager } from './components/RepoManager.js';
import { TokenSetup } from './components/TokenSetup.js';
import { OnboardingWizard } from './components/OnboardingWizard.js';
import { DetailPanel } from './components/DetailPanel.js';
import { NotificationsView } from './components/NotificationsView.js';
import { NotificationRulesEditor } from './components/NotificationRulesEditor.js';

const OWNERSHIP_CYCLE: OwnershipFilter[] = ['created', 'assigned', 'involved', 'everyone'];

export function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const { config, configLoaded, enabledRepos, addRepo, removeRepo, toggleRepo, toggleRepoByName } = useConfig();
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('created');
  const [username, setUsername] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const { cycleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [milestoneGrouping, setMilestoneGrouping] = useState(false);
  const [wizardActive, setWizardActive] = useState(false);

  const { markSeen, isUnseen } = useLastSeen();
  const { visibleColumns, columnOrder, toggleColumn, reorderColumns, resetColumns } = useColumnSettings();

  const {
    viewMode, setViewMode, previewItem, notificationsPinnedItem, isModalOpen,
    openDetail, closeDetail, openRepos, openNotifications, openRules, closeModal,
  } = useModalState();

  const handleRateLimit = useCallback((rl: RateLimit) => setRateLimit(rl), []);

  const octokit = useMemo(
    () => (token ? createClient(token, handleRateLimit) : null),
    [token, handleRateLimit]
  );

  const handleInvalidToken = useCallback(() => {
    setTokenExpired(true);
    setUsername(null);
    clearToken();
    setTokenState(null);
  }, []);

  // Fetch authenticated user's login
  useEffect(() => {
    if (!octokit) {
      setUsername(null);
      return;
    }
    let cancelled = false;
    octokit.users.getAuthenticated().then(
      ({ data }) => {
        if (!cancelled) setUsername(data.login);
      },
      (e) => {
        if (cancelled) return;
        console.warn('Failed to fetch user:', e);
        if (isAuthError(e)) {
          handleInvalidToken();
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [octokit, handleInvalidToken]);

  // Pass username for user-specific filters, null for "everyone"
  const { items, loading, error, authError, failedRepos, lastRefresh, refresh } = useGithubData(
    octokit,
    enabledRepos,
    config.defaults.maxPrsPerRepo,
    ownershipFilter !== 'everyone' ? username : null,
    username,
    ownershipFilter
  );

  // When the API returns 401, clear the token to show the re-auth screen
  useEffect(() => {
    if (authError) {
      handleInvalidToken();
    }
  }, [authError, handleInvalidToken]);

  // Activate the onboarding wizard once the user has authenticated but has
  // no repos configured. We deliberately don't open it for unauthenticated
  // users — TokenSetup is the auth surface, and signing out should drop the
  // user back there rather than into the wizard. Setting both branches
  // (true/false) means the flag also clears on sign-out and on adding the
  // first repo.
  useEffect(() => {
    if (tokenExpired) return;
    if (!configLoaded) return;
    setWizardActive(Boolean(token && config.repos.length === 0));
  }, [token, configLoaded, config.repos.length, tokenExpired]);

  const {
    filtered, filter, sort, sortDirection, searchQuery, setSearchQuery,
    itemTypeFilter, setItemTypeFilter, cursorIndex, setCursorIndex,
    prStateFilters, togglePRStateFilter,
    labelFilters, toggleLabelFilter, clearLabelFilters, availableLabels,
    hideMyReplies, toggleHideMyReplies,
    moveCursor, cycleFilter, cycleSort,
    handleSetFilter, handleSetSort, cycleItemType,
  } = useFilteredItems({
    items,
    defaultFilter: config.defaults.filter,
    defaultSort: config.defaults.sort,
    isUnseen,
    staleDays: config.defaults.staleDays,
    authUser: username,
  });

  const { secondsLeft: autoRefreshSecondsLeft, reset: resetAutoRefresh } = useAutoRefresh({
    intervalSeconds: config.defaults.autoRefreshInterval,
    paused: isModalOpen,
    onRefresh: refresh,
  });

  // `rulesRef` lets the refresh-time auto-apply callback read the latest
  // rules without re-instantiating the notifications hook on every rule
  // edit (which would re-trigger a fetch).
  const rulesRef = useRef<ReturnType<typeof useNotificationRules>['rules']>([]);

  const handleAfterNotificationsRefresh = useCallback(
    (fresh: NotificationItem[] | undefined) => {
      if (!fresh) return;
      const ids = new Set<string>();
      for (const rule of rulesRef.current) {
        if (!rule.enabled || !rule.autoApply) continue;
        for (const n of notificationsMatchingRule(rule, fresh)) {
          if (n.unread) ids.add(n.id);
        }
      }
      if (ids.size > 0) {
        // Fire-and-forget; failures are surfaced through the optimistic
        // rollback in useNotifications.
        void markThreadsReadRef.current?.([...ids]);
      }
    },
    []
  );

  // We need to reference markThreadsRead inside the callback above, but the
  // hook hasn't returned yet. Forward via a ref.
  const markThreadsReadRef = useRef<((ids: string[]) => Promise<unknown>) | null>(null);

  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    authError: notificationsAuthError,
    lastRefresh: notificationsLastRefresh,
    refresh: refreshNotifications,
    markThreadRead,
    markThreadsRead,
  } = useNotifications({
    octokit,
    enabled: config.defaults.notificationsEnabled,
    refreshIntervalSeconds: config.defaults.notificationsRefreshInterval,
    storage: webStorage,
    onAfterRefresh: handleAfterNotificationsRefresh,
  });

  // Keep the ref in sync so the after-refresh callback always sees the
  // freshest mark-read function.
  markThreadsReadRef.current = markThreadsRead;

  const notificationsUnreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  /** Map keyed by `${owner}/${repo}#${number}` → unread thread count, for the PR-table indicator. */
  const unreadNotificationsByItem = useMemo(() => {
    const grouped = notificationsByItemKey(notifications.filter((n) => n.unread));
    const counts = new Map<string, number>();
    for (const [key, list] of grouped) counts.set(key, list.length);
    return counts;
  }, [notifications]);

  const getUnreadNotificationCount = useCallback(
    (item: DashboardItem) => unreadNotificationsByItem.get(itemKey(item)) ?? 0,
    [unreadNotificationsByItem]
  );

  const {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
  } = useNotificationRules({ storage: webStorage });

  // Keep rulesRef in sync for the after-refresh auto-apply callback.
  rulesRef.current = rules;

  const applyRule = useCallback(
    async (rule: typeof rules[number]) => {
      const matches = notificationsMatchingRule(rule, notifications);
      const ids = matches.filter((n) => n.unread).map((n) => n.id);
      if (ids.length === 0) return;
      await markThreadsRead(ids);
    },
    [notifications, markThreadsRead]
  );

  // Treat a 401 from notifications the same as a 401 from the main fetch.
  useEffect(() => {
    if (notificationsAuthError) handleInvalidToken();
  }, [notificationsAuthError, handleInvalidToken]);

  const jumpToItem = useCallback(
    (item: DashboardItem) => {
      const idx = filtered.findIndex(
        (f) => f.kind === item.kind && f.id === item.id
      );
      if (idx !== -1) setCursorIndex(idx);
      closeModal();
    },
    [filtered, setCursorIndex, closeModal]
  );

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
    // Clear any stale username so user-scoped queries don't briefly run
    // with the previous identity until getAuthenticated() resolves.
    setUsername(null);
    saveToken(t);
    setTokenState(t);
    setTokenExpired(false);
  }, []);

  const unseenCount = useMemo(
    () => items.filter((pr) => isUnseen(pr)).length,
    [items, isUnseen]
  );

  const hiddenRepos = useMemo(
    () => config.repos.filter((r) => !r.enabled),
    [config.repos]
  );

  const toggleMilestoneGrouping = useCallback(() => {
    setMilestoneGrouping((prev) => !prev);
  }, []);

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
      toggleMilestoneGrouping,
    }),
    [viewMode, setViewMode, moveCursor, openSelected, previewSelected, cycleFilter, cycleSort, handleRefresh, cycleOwnership, cycleTheme, focusSearch, cycleItemType, toggleMilestoneGrouping]
  );

  useKeyboardShortcuts(shortcutActions);

  // Re-auth: token was cleared by a 401, send the user to a focused token
  // screen rather than back through the full wizard.
  if (tokenExpired && !token) {
    return <TokenSetup onSave={handleSaveToken} reason="expired" />;
  }

  if (wizardActive) {
    return (
      <OnboardingWizard
        token={token}
        username={username}
        repos={config.repos}
        onSaveToken={handleSaveToken}
        onAddRepo={addRepo}
        onFinish={() => setWizardActive(false)}
        onSignOut={handleSignOut}
      />
    );
  }

  // Defensive fallback: dashboard requires a token. If we somehow get here
  // without one (wizard dismissed before auth), funnel back to TokenSetup.
  if (!token) {
    return <TokenSetup onSave={handleSaveToken} reason={null} />;
  }

  return (
    <div className="app">
      <Header
        loading={loading}
        lastRefresh={lastRefresh}
        repoCount={enabledRepos.length}
        itemCount={filtered.length}
        unseenCount={unseenCount}
        notificationsUnreadCount={notificationsUnreadCount}
        onOpenRepos={openRepos}
        onOpenNotifications={() => openNotifications()}
        onSignOut={handleSignOut}
        onRefresh={handleRefresh}
        autoRefreshSecondsLeft={autoRefreshSecondsLeft}
        authMethod={getAuthMethod(token)}
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
        hideMyReplies={hideMyReplies}
        onToggleHideMyReplies={username ? toggleHideMyReplies : undefined}
        milestoneGrouping={milestoneGrouping}
        onToggleMilestoneGrouping={toggleMilestoneGrouping}
      />
      <PRTable
        items={filtered}
        cursorIndex={cursorIndex}
        sort={sort}
        sortDirection={sortDirection}
        onSort={handleSetSort}
        onPreview={previewPR}
        isUnseen={isUnseen}
        getUnreadNotificationCount={getUnreadNotificationCount}
        onOpen={markSeen}
        onOpenNotifications={openNotifications}
        onHideRepo={toggleRepoByName}
        staleDays={config.defaults.staleDays}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        onToggleColumn={toggleColumn}
        onReorderColumns={reorderColumns}
        onResetColumns={resetColumns}
        milestoneGrouping={milestoneGrouping}
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
      {viewMode === 'notifications' && (
        <NotificationsView
          notifications={notifications}
          loading={notificationsLoading}
          error={notificationsError}
          lastRefresh={notificationsLastRefresh}
          items={items}
          authUser={username}
          rules={rules}
          onApplyRule={applyRule}
          onOpenRules={openRules}
          onClose={closeModal}
          onRefresh={refreshNotifications}
          onMarkRead={markThreadRead}
          onMarkManyRead={markThreadsRead}
          onJumpToItem={jumpToItem}
          pinnedItem={notificationsPinnedItem}
        />
      )}
      {viewMode === 'notification-rules' && (
        <NotificationRulesEditor
          rules={rules}
          notifications={notifications}
          onClose={closeModal}
          onAdd={addRule}
          onUpdate={updateRule}
          onDelete={deleteRule}
          onToggle={toggleRule}
          onApplyRule={applyRule}
        />
      )}
    </div>
  );
}
