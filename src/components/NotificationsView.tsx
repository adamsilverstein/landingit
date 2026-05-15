import React, { useMemo, useState } from 'react';
import type {
  DashboardItem,
  NotificationItem,
  NotificationReason,
  NotificationRule,
} from '../../shared/types.js';
import { matchNotifications } from '../../shared/utils/notificationMatch.js';
import { notificationsMatchingRule } from '../../shared/hooks/useNotificationRules.js';
import { NotificationRow } from './NotificationRow.js';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  /** All fetched PRs/issues — used to cross-reference and to derive working-set membership. */
  items: DashboardItem[];
  authUser: string | null;
  rules: NotificationRule[];
  onApplyRule: (rule: NotificationRule) => Promise<unknown>;
  onOpenRules: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onMarkManyRead: (ids: string[]) => Promise<unknown>;
  onJumpToItem: ((item: DashboardItem) => void) | null;
  /** If set, the view opens pre-filtered to notifications attached to this PR/issue. */
  pinnedItem?: DashboardItem | null;
}

const REASON_FILTERS: ReadonlyArray<{ label: string; reason: NotificationReason | 'all' }> = [
  { label: 'All', reason: 'all' },
  { label: 'Mentions', reason: 'mention' },
  { label: 'Review', reason: 'review_requested' },
  { label: 'CI', reason: 'ci_activity' },
  { label: 'Authored', reason: 'author' },
  { label: 'Subscribed', reason: 'subscribed' },
];

export function NotificationsView({
  notifications,
  loading,
  error,
  lastRefresh,
  items,
  authUser,
  rules,
  onApplyRule,
  onOpenRules,
  onClose,
  onRefresh,
  onMarkRead,
  onMarkManyRead,
  onJumpToItem,
  pinnedItem,
}: NotificationsViewProps) {
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<NotificationReason | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const matches = useMemo(
    () => matchNotifications(notifications, items, authUser),
    [notifications, items, authUser]
  );

  const filtered = useMemo(() => {
    let result = matches;
    if (pinnedItem) {
      result = result.filter(
        (m) =>
          m.item != null &&
          m.item.id === pinnedItem.id &&
          m.item.kind === pinnedItem.kind
      );
    }
    if (unreadOnly) {
      result = result.filter((m) => m.notification.unread);
    }
    if (reasonFilter !== 'all') {
      result = result.filter((m) => m.notification.reason === reasonFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((m) => {
        const n = m.notification;
        return (
          n.subject.title.toLowerCase().includes(q) ||
          `${n.repo.owner}/${n.repo.name}`.toLowerCase().includes(q) ||
          (n.subjectNumber != null && `#${n.subjectNumber}`.includes(q))
        );
      });
    }
    // Working-set rows float to the top, then unread, then by recency.
    result = [...result].sort((a, b) => {
      if (a.isWorkingSet !== b.isWorkingSet) return a.isWorkingSet ? -1 : 1;
      if (a.notification.unread !== b.notification.unread) {
        return a.notification.unread ? -1 : 1;
      }
      return (
        new Date(b.notification.updatedAt).getTime() -
        new Date(a.notification.updatedAt).getTime()
      );
    });
    return result;
  }, [matches, search, reasonFilter, unreadOnly, pinnedItem]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllVisible = () => {
    const visibleIds = new Set(filtered.map((m) => m.notification.id));
    if (
      visibleIds.size > 0 &&
      [...visibleIds].every((id) => selectedIds.has(id))
    ) {
      // All visible already selected → clear.
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of visibleIds) next.add(id);
        return next;
      });
    }
  };

  const handleBulkMarkRead = async () => {
    const ids = [...selectedIds];
    clearSelection();
    await onMarkManyRead(ids);
  };

  const unreadCount = matches.filter((m) => m.notification.unread).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="notifications-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notifications"
      >
        <header className="notifications-header">
          <div className="notifications-title-block">
            <h2 className="notifications-title">Notifications</h2>
            <span className="notifications-count">
              {unreadCount} unread · {matches.length} total
            </span>
            {pinnedItem && (
              <span
                className="notifications-pinned-chip"
                title="Filtered to this PR — clear by closing and reopening from the header"
              >
                {pinnedItem.repo.owner}/{pinnedItem.repo.name}#{pinnedItem.number}
              </span>
            )}
          </div>
          <div className="notifications-header-actions">
            {lastRefresh && (
              <span className="notifications-last-refresh" title="Last refreshed">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              className="notifications-icon-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh"
              aria-label="Refresh"
            >
              {loading ? <span className="spinner" /> : '↻'}
            </button>
            <button
              className="notifications-icon-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="notifications-toolbar">
          <input
            type="text"
            className="notifications-search"
            placeholder="Search title, repo, #number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="notifications-reason-filters">
            {REASON_FILTERS.map(({ label, reason }) => (
              <button
                key={reason}
                className={
                  'notifications-chip' +
                  (reasonFilter === reason ? ' notifications-chip-active' : '')
                }
                onClick={() => setReasonFilter(reason)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <label className="notifications-toggle">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
          <button
            className="notifications-link-btn"
            onClick={selectAllVisible}
            type="button"
            disabled={filtered.length === 0}
          >
            {filtered.every((m) => selectedIds.has(m.notification.id)) &&
            filtered.length > 0
              ? 'Clear selection'
              : 'Select all visible'}
          </button>
        </div>

        {rules.length > 0 && (
          <div className="notifications-rules-bar">
            <span className="rules-presets-label">Rules:</span>
            {rules
              .filter((r) => r.enabled)
              .map((rule) => {
                const matchCount = notificationsMatchingRule(rule, notifications).length;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    className="notifications-chip"
                    onClick={() => onApplyRule(rule)}
                    disabled={matchCount === 0}
                    title={rule.conditions
                      .map((c) => `${c.field} ${c.op} "${c.value}"`)
                      .join(' AND ')}
                  >
                    {rule.name}{' '}
                    <span className="rule-chip-count">({matchCount})</span>
                  </button>
                );
              })}
            <button
              type="button"
              className="notifications-link-btn"
              onClick={onOpenRules}
            >
              Edit rules
            </button>
          </div>
        )}
        {rules.length === 0 && (
          <div className="notifications-rules-bar">
            <span className="rules-presets-label notifications-muted">
              No rules yet —
            </span>
            <button
              type="button"
              className="notifications-link-btn"
              onClick={onOpenRules}
            >
              Add a rule to bulk-mark common noise
            </button>
          </div>
        )}

        {error && (
          <div className="notifications-error" role="alert">
            {error}
          </div>
        )}

        <div className="notifications-list">
          {filtered.length === 0 ? (
            <div className="notifications-empty">
              {loading
                ? 'Loading…'
                : unreadCount === 0
                ? '🎉 Inbox zero — no unread notifications.'
                : 'No notifications match the current filters.'}
            </div>
          ) : (
            filtered.map((m) => (
              <NotificationRow
                key={m.notification.id}
                notification={m.notification}
                matchedItem={m.item}
                isWorkingSet={m.isWorkingSet}
                selected={selectedIds.has(m.notification.id)}
                onToggleSelected={toggleSelected}
                onMarkRead={onMarkRead}
                onJumpToItem={onJumpToItem}
              />
            ))
          )}
        </div>

        {selectedIds.size > 0 && (
          <footer className="notifications-bulk-bar" role="region" aria-label="Bulk actions">
            <span>
              {selectedIds.size} selected
            </span>
            <div className="notifications-bulk-actions">
              <button
                className="notifications-link-btn"
                onClick={clearSelection}
                type="button"
              >
                Clear
              </button>
              <button
                className="notifications-primary-btn"
                onClick={handleBulkMarkRead}
                type="button"
              >
                Mark {selectedIds.size} as read
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
