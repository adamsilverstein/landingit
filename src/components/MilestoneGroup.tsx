import React, { useState } from 'react';
import type { MilestoneInfo } from '../types.js';

interface MilestoneGroupHeaderProps {
  milestone: MilestoneInfo | null;
  itemCount: number;
  collapsed: boolean;
  onToggle: () => void;
  colSpan?: number;
}

/** Compute calendar-day difference (negative = overdue, 0 = today, positive = days left). */
function getDayStatus(dueOn: string): number {
  const due = new Date(dueOn);
  const now = new Date();
  // Normalize both to local midnight for calendar-day comparison
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueDate(dueOn: string): { label: string; isOverdue: boolean } {
  const diffDays = getDayStatus(dueOn);
  const date = new Date(dueOn);
  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  if (diffDays < 0) {
    return { label: `${formatted} (overdue)`, isOverdue: true };
  } else if (diffDays === 0) {
    return { label: `${formatted} (due today)`, isOverdue: false };
  } else if (diffDays <= 7) {
    return { label: `${formatted} (${diffDays}d left)`, isOverdue: false };
  }
  return { label: formatted, isOverdue: false };
}

export function MilestoneGroupHeader({ milestone, itemCount, collapsed, onToggle, colSpan = 11 }: MilestoneGroupHeaderProps) {
  const title = milestone ? milestone.title : 'No Milestone';
  const total = milestone ? milestone.openIssues + milestone.closedIssues : 0;
  const closed = milestone ? milestone.closedIssues : 0;
  const progressPct = total > 0 ? Math.round((closed / total) * 100) : 0;

  const dueInfo = milestone?.dueOn ? formatDueDate(milestone.dueOn) : null;

  return (
    <tr className="milestone-group-header">
      <td colSpan={colSpan}>
        <button
          type="button"
          className="milestone-group-header-content milestone-group-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
        >
          <span className={`milestone-group-chevron ${collapsed ? 'collapsed' : ''}`}>▸</span>
          <span className="milestone-group-icon" role="img" aria-label="Milestone">🏁</span>
          <span className="milestone-group-title">{title}</span>
          <span className="milestone-group-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          {milestone && (
            <>
              <span className="milestone-group-progress">
                <span className="milestone-progress-bar">
                  <span
                    className="milestone-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </span>
                <span className="milestone-progress-text">
                  {milestone.closedIssues}/{total} ({progressPct}%)
                </span>
              </span>
              {dueInfo && (
                <span className={`milestone-group-due ${dueInfo.isOverdue ? 'overdue' : ''}`}>
                  📅 {dueInfo.label}
                </span>
              )}
            </>
          )}
        </button>
      </td>
    </tr>
  );
}

interface UseMilestoneCollapseReturn {
  isCollapsed: (key: string) => boolean;
  toggle: (key: string) => void;
}

export function useMilestoneCollapse(): UseMilestoneCollapseReturn {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isCollapsed = (key: string) => collapsed.has(key);
  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return { isCollapsed, toggle };
}
