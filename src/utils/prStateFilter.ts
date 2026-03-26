import type { DashboardItem, PRStateFilterKey } from '../types.js';

/**
 * Filter items by state toggle pills (draft, open, merged).
 *
 * Issues always pass through (they don't have PR-specific states).
 * Closed (non-merged) PRs are intentionally excluded from the toggle pills.
 * The dashboard focuses on actionable PR states: draft (in progress),
 * open (ready for review), and merged (completed). Closed-without-merge PRs
 * are typically abandoned and not useful for day-to-day workflow tracking.
 */
export function filterByPRState(items: DashboardItem[], filters: Set<PRStateFilterKey>): DashboardItem[] {
  if (filters.size === 0) return items.filter((item) => item.kind === 'issue');
  return items.filter((item) => {
    if (item.kind === 'issue') return true;
    if (item.draft && filters.has('draft')) return true;
    if (!item.draft && item.state === 'open' && filters.has('open')) return true;
    if (item.state === 'merged' && filters.has('merged')) return true;
    return false;
  });
}
