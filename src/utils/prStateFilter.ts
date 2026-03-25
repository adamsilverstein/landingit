import type { PRItem, PRStateFilterKey } from '../types.js';

/** Filter PRs by state toggle pills (draft, open, merged). */
export function filterByPRState(items: PRItem[], filters: Set<PRStateFilterKey>): PRItem[] {
  if (filters.size === 0) return [];
  return items.filter((pr) => {
    if (pr.draft && filters.has('draft')) return true;
    if (!pr.draft && pr.state === 'open' && filters.has('open')) return true;
    if (pr.state === 'merged' && filters.has('merged')) return true;
    return false;
  });
}
