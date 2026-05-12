import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useNotifications } from '../../../shared/hooks/useNotifications.js';
import {
  useNotificationRules,
  notificationsMatchingRule,
} from '../../../shared/hooks/useNotificationRules.js';
import type {
  NotificationItem,
  NotificationRule,
} from '../../../shared/types.js';
import { asyncStorageAdapter } from '../storage/asyncStorageAdapter';
import { useApp } from './AppContext';
import { useConfigContext } from './ConfigContext';

interface NotificationsContextValue {
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  unreadCount: number;
  refresh: () => void;
  markThreadRead: (id: string) => Promise<void>;
  markThreadsRead: (ids: string[]) => Promise<unknown>;
  markAllRead: () => Promise<void>;
  rules: NotificationRule[];
  addRule: ReturnType<typeof useNotificationRules>['addRule'];
  updateRule: ReturnType<typeof useNotificationRules>['updateRule'];
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  applyRule: (rule: NotificationRule) => Promise<unknown>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotificationsContext must be used within NotificationsProvider'
    );
  }
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { octokit } = useApp();
  const { config } = useConfigContext();

  const {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
  } = useNotificationRules({ storage: asyncStorageAdapter });

  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const markThreadsReadRef = useRef<((ids: string[]) => Promise<unknown>) | null>(
    null
  );

  const handleAfterRefresh = useCallback((fresh: NotificationItem[]) => {
    const ids = new Set<string>();
    for (const rule of rulesRef.current) {
      if (!rule.enabled || !rule.autoApply) continue;
      for (const n of notificationsMatchingRule(rule, fresh)) {
        if (n.unread) ids.add(n.id);
      }
    }
    if (ids.size > 0) {
      void markThreadsReadRef.current?.([...ids]);
    }
  }, []);

  const {
    notifications,
    loading,
    error,
    lastRefresh,
    refresh,
    markThreadRead,
    markThreadsRead,
    markAllRead,
  } = useNotifications({
    octokit,
    enabled: config.defaults.notificationsEnabled,
    refreshIntervalSeconds: config.defaults.notificationsRefreshInterval,
    storage: asyncStorageAdapter,
    onAfterRefresh: handleAfterRefresh,
  });

  markThreadsReadRef.current = markThreadsRead;

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const applyRule = useCallback(
    async (rule: NotificationRule) => {
      const ids = notificationsMatchingRule(rule, notifications)
        .filter((n) => n.unread)
        .map((n) => n.id);
      if (ids.length === 0) return;
      await markThreadsRead(ids);
    },
    [notifications, markThreadsRead]
  );

  const value = useMemo(
    () => ({
      notifications,
      loading,
      error,
      lastRefresh,
      unreadCount,
      refresh,
      markThreadRead,
      markThreadsRead,
      markAllRead,
      rules,
      addRule,
      updateRule,
      deleteRule,
      toggleRule,
      applyRule,
    }),
    [
      notifications,
      loading,
      error,
      lastRefresh,
      unreadCount,
      refresh,
      markThreadRead,
      markThreadsRead,
      markAllRead,
      rules,
      addRule,
      updateRule,
      deleteRule,
      toggleRule,
      applyRule,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
