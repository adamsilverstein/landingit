import type { DashboardItem, PRStateFilterKey } from '../types.js';

/**
 * Filter items by state toggle pills (draft, open, merged).
 *
 * Closed issues and closed (non-merged) PRs are always excluded — the
 * dashboard focuses on actionable states: draft (in progress), open
 * (ready for review), and merged (completed).
 */
export function filterByPRState(items: DashboardItem[], filters: Set<PRStateFilterKey>): DashboardItem[] {
  if (filters.size === 0) return items.filter((item) => item.kind === 'issue' && item.state !== 'closed');
  return items.filter((item) => {
    // Exclude all closed items (issues and non-merged PRs)
    if (item.state === 'closed') return false;
    if (item.kind === 'issue') return true;
    if (item.draft && filters.has('draft')) return true;
    if (!item.draft && item.state === 'open' && filters.has('open')) return true;
    if (item.state === 'merged' && filters.has('merged')) return true;
    return false;
  });
}
