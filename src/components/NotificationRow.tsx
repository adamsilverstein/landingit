import React from 'react';
import type { NotificationItem, DashboardItem } from '../../shared/types.js';
import { timeAgo } from '../../shared/utils/timeAgo.js';
import { notificationHtmlUrl } from '../../shared/utils/notificationHtmlUrl.js';

interface NotificationRowProps {
  notification: NotificationItem;
  /** Matched PR/issue from items[], if any. */
  matchedItem: DashboardItem | null;
  /** Working-set highlight (authored / requested reviewer / assigned). */
  isWorkingSet: boolean;
  /** Multi-select state and toggle. */
  selected: boolean;
  onToggleSelected: (id: string) => void;
  /** Per-row actions. */
  onMarkRead: (id: string) => void;
  onJumpToItem: ((item: DashboardItem) => void) | null;
}

function subjectIcon(type: NotificationItem['subject']['type']): string {
  switch (type) {
    case 'PullRequest':              return '⇄';
    case 'Issue':                    return '●';
    case 'Commit':                   return '◆';
    case 'Release':                  return '◈';
    case 'Discussion':               return '✿';
    case 'CheckSuite':
    case 'WorkflowRun':              return '⚙';
    case 'RepositoryVulnerabilityAlert':
    case 'RepositoryDependabotAlertsThread': return '⚠';
    default:                         return '○';
  }
}

function reasonLabel(reason: NotificationItem['reason']): string {
  switch (reason) {
    case 'review_requested': return 'review requested';
    case 'ci_activity':      return 'CI';
    case 'state_change':     return 'state change';
    case 'team_mention':     return 'team mention';
    case 'security_alert':   return 'security';
    case 'approval_requested': return 'approval';
    case 'member_feature_requested': return 'requested';
    default:                 return reason;
  }
}

export function NotificationRow({
  notification: n,
  matchedItem,
  isWorkingSet,
  selected,
  onToggleSelected,
  onMarkRead,
  onJumpToItem,
}: NotificationRowProps) {
  const classes = [
    'notification-row',
    n.unread ? 'notification-unread' : 'notification-read',
    isWorkingSet ? 'notification-working-set' : '',
    selected ? 'notification-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleOpen = () => {
    window.open(notificationHtmlUrl(n), '_blank', 'noopener,noreferrer');
  };

  const handleJump = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (matchedItem && onJumpToItem) onJumpToItem(matchedItem);
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(n.id);
  };

  return (
    <div
      className={classes}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleOpen();
      }}
    >
      <input
        type="checkbox"
        className="notification-checkbox"
        checked={selected}
        onChange={() => onToggleSelected(n.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select notification"
      />
      <span
        className="notification-icon"
        title={n.subject.type}
        aria-hidden
      >
        {subjectIcon(n.subject.type)}
      </span>
      <div className="notification-main">
        <div className="notification-line">
          {n.unread && <span className="notification-dot" aria-label="unread" />}
          <span className="notification-title">{n.subject.title}</span>
        </div>
        <div className="notification-meta">
          <span className="notification-repo">
            {n.repo.owner}/{n.repo.name}
          </span>
          {n.subjectNumber != null && (
            <span className="notification-number">#{n.subjectNumber}</span>
          )}
          <span className="notification-reason">{reasonLabel(n.reason)}</span>
          {isWorkingSet && (
            <span className="notification-badge-mine" title="On a PR you're working on">
              yours
            </span>
          )}
          <span className="notification-time">{timeAgo(n.updatedAt)}</span>
        </div>
      </div>
      <div className="notification-actions">
        {matchedItem && onJumpToItem && (
          <button
            className="notification-action"
            onClick={handleJump}
            title="Jump to row in the PR table"
          >
            ↪
          </button>
        )}
        {n.unread && (
          <button
            className="notification-action"
            onClick={handleMarkRead}
            title="Mark as read"
          >
            ✓
          </button>
        )}
      </div>
    </div>
  );
}
