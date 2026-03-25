import type { PRItem, PRStateFilterKey } from '../types.js';

/**
 * Filter PRs by state toggle pills (draft, open, merged).
 *
 * Closed (non-merged) PRs are intentionally excluded from the toggle pills.
 * The dashboard focuses on actionable PR states: draft (in progress),
 * open (ready for review), and merged (completed). Closed-without-merge PRs
 * are typically abandoned and not useful for day-to-day workflow tracking.
 */
export function filterByPRState(items: PRItem[], filters: Set<PRStateFilterKey>): PRItem[] {
  if (filters.size === 0) return [];
  return items.filter((pr) => {
    if (pr.draft && filters.has('draft')) return true;
    if (!pr.draft && pr.state === 'open' && filters.has('open')) return true;
    if (pr.state === 'merged' && filters.has('merged')) return true;
    return false;
  });
}
