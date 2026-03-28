import React, { useState } from 'react';
import type { MilestoneInfo } from '../types.js';

interface MilestoneGroupHeaderProps {
  milestone: MilestoneInfo | null;
  itemCount: number;
  collapsed: boolean;
  onToggle: () => void;
  colSpan?: number;
}

function formatDueDate(dueOn: string): string {
  const date = new Date(dueOn);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  if (diffDays < 0) {
    return `${formatted} (overdue)`;
  } else if (diffDays === 0) {
    return `${formatted} (due today)`;
  } else if (diffDays <= 7) {
    return `${formatted} (${diffDays}d left)`;
  }
  return formatted;
}

export function MilestoneGroupHeader({ milestone, itemCount, collapsed, onToggle, colSpan = 11 }: MilestoneGroupHeaderProps) {
  const title = milestone ? milestone.title : 'No Milestone';
  const total = milestone ? milestone.openIssues + milestone.closedIssues : 0;
  const closed = milestone ? milestone.closedIssues : 0;
  const progressPct = total > 0 ? Math.round((closed / total) * 100) : 0;

  return (
    <tr className="milestone-group-header" onClick={onToggle}>
      <td colSpan={colSpan}>
        <div className="milestone-group-header-content">
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
              {milestone.dueOn && (
                <span className={`milestone-group-due ${new Date(milestone.dueOn) < new Date() ? 'overdue' : ''}`}>
                  📅 {formatDueDate(milestone.dueOn)}
                </span>
              )}
            </>
          )}
        </div>
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
