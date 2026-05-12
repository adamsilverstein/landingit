import { useCallback, useEffect, useRef, useState } from 'react';
import type { Octokit } from '@octokit/rest';
import type { NotificationItem } from '../types.js';
import type { StorageAdapter } from '../storage.js';
import { STORAGE_KEYS } from '../constants.js';
import {
  fetchNotifications,
  markThreadAsRead as apiMarkThreadAsRead,
  markThreadsAsRead as apiMarkThreadsAsRead,
  markAllAsRead as apiMarkAllAsRead,
  NotificationsScopeError,
} from '../github/notifications.js';
import { isAuthError } from '../github/errors.js';

interface UseNotificationsOptions {
  octokit: Octokit | null;
  /** When false, the hook is inert: no fetches, empty result. */
  enabled: boolean;
  /** Auto-refresh interval in seconds. 0 disables polling. */
  refreshIntervalSeconds: number;
  storage: StorageAdapter;
  /**
   * Called after each successful refresh with the freshly-fetched notifications.
   * Used by app.tsx to wire up rules `autoApply` — the hook stays unaware of
   * the rules engine, callers compose the two.
   */
  onAfterRefresh?: (notifications: NotificationItem[]) => void;
}

interface UseNotificationsResult {
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  authError: boolean;
  /** True when the token lacks the `notifications` scope. Distinct from authError so the UI can prompt for a re-auth with the right scope rather than a fresh sign-in. */
  scopeError: boolean;
  lastRefresh: Date | null;
  /** Manually trigger a refresh (also resets the auto-refresh countdown). */
  refresh: () => void;
  /** Optimistically mark a single thread read; rolls back on error. */
  markThreadRead: (threadId: string) => Promise<void>;
  /** Bulk-mark; rolls back any failures. Returns succeeded/failed split. */
  markThreadsRead: (
    threadIds: string[]
  ) => Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }>;
  /** Mark every thread read on the server and locally. */
  markAllRead: () => Promise<void>;
}

/**
 * Fetch and cache the authenticated user's GitHub notifications.
 *
 * Polls on `refreshIntervalSeconds`; sends `If-Modified-Since` so 304
 * responses are free against the rate-limit budget. Optimistic mutations
 * keep the UI responsive — failures roll back local state.
 */
export function useNotifications({
  octokit,
  enabled,
  refreshIntervalSeconds,
  storage,
  onAfterRefresh,
}: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [scopeError, setScopeError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const octokitRef = useRef(octokit);
  octokitRef.current = octokit;
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onAfterRefreshRef = useRef(onAfterRefresh);
  onAfterRefreshRef.current = onAfterRefresh;

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  // Main fetch effect — runs on mount, on octokit change, and on each refresh tick.
  useEffect(() => {
    const client = octokitRef.current;
    const enabledNow = enabledRef.current;
    const store = storageRef.current;

    if (!client || !enabledNow) {
      setNotifications([]);
      setError(null);
      setAuthError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuthError(false);
    setScopeError(false);

    (async () => {
      try {
        const ifModifiedSince = await store.getItem(
          STORAGE_KEYS.NOTIFICATIONS_LAST_MODIFIED
        );

        const result = await fetchNotifications(client, {
          ifModifiedSince: ifModifiedSince ?? undefined,
        });

        if (cancelled) return;

        if (!result.notModified) {
          setNotifications(result.notifications);
          if (result.lastModified) {
            await store
              .setItem(STORAGE_KEYS.NOTIFICATIONS_LAST_MODIFIED, result.lastModified)
              .catch(() => {});
          }
          // Notify the caller so auto-apply rules can run against fresh data.
          // Guarded so 304 ticks don't re-trigger rules against unchanged data.
          onAfterRefreshRef.current?.(result.notifications);
        }

        setLastRefresh(new Date());
      } catch (e) {
        if (cancelled) return;
        if (isAuthError(e)) {
          setAuthError(true);
        } else if (e instanceof NotificationsScopeError) {
          setScopeError(true);
        } else {
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [octokit, refreshCounter, enabled]);

  // Auto-refresh via setInterval. Lives inside this hook (rather than
  // composing useAutoRefresh) so we don't surface a separate
  // countdown UI for notifications.
  useEffect(() => {
    if (!enabled || refreshIntervalSeconds <= 0) return;
    const id = setInterval(() => {
      setRefreshCounter((c) => c + 1);
    }, refreshIntervalSeconds * 1000);
    return () => clearInterval(id);
  }, [enabled, refreshIntervalSeconds]);

  const markThreadRead = useCallback(
    async (threadId: string) => {
      const client = octokitRef.current;
      if (!client) return;

      let previousSnapshot: NotificationItem[] | null = null;
      setNotifications((prev) => {
        previousSnapshot = prev;
        return prev.map((n) =>
          n.id === threadId ? { ...n, unread: false } : n
        );
      });

      try {
        await apiMarkThreadAsRead(client, threadId);
      } catch (e) {
        if (previousSnapshot) setNotifications(previousSnapshot);
        if (isAuthError(e)) setAuthError(true);
        else setError(e instanceof Error ? e.message : 'Unknown error');
      }
    },
    []
  );

  const markThreadsRead = useCallback(
    async (threadIds: string[]) => {
      const client = octokitRef.current;
      if (!client || threadIds.length === 0) {
        return { succeeded: [], failed: [] };
      }

      const ids = new Set(threadIds);
      let previousSnapshot: NotificationItem[] | null = null;
      setNotifications((prev) => {
        previousSnapshot = prev;
        return prev.map((n) => (ids.has(n.id) ? { ...n, unread: false } : n));
      });

      try {
        const result = await apiMarkThreadsAsRead(client, threadIds);
        if (result.failed.length > 0) {
          const failedIds = new Set(result.failed.map((f) => f.id));
          // Roll back only the entries that actually failed.
          setNotifications((prev) =>
            prev.map((n) => {
              if (!failedIds.has(n.id)) return n;
              const original = previousSnapshot?.find((p) => p.id === n.id);
              return original ?? n;
            })
          );
        }
        return result;
      } catch (e) {
        if (previousSnapshot) setNotifications(previousSnapshot);
        if (isAuthError(e)) setAuthError(true);
        else setError(e instanceof Error ? e.message : 'Unknown error');
        return { succeeded: [], failed: threadIds.map((id) => ({ id, error: 'request-failed' })) };
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    const client = octokitRef.current;
    if (!client) return;

    let previousSnapshot: NotificationItem[] | null = null;
    setNotifications((prev) => {
      previousSnapshot = prev;
      return prev.map((n) => ({ ...n, unread: false }));
    });

    try {
      await apiMarkAllAsRead(client);
    } catch (e) {
      if (previousSnapshot) setNotifications(previousSnapshot);
      if (isAuthError(e)) setAuthError(true);
      else setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    authError,
    scopeError,
    lastRefresh,
    refresh,
    markThreadRead,
    markThreadsRead,
    markAllRead,
  };
}
