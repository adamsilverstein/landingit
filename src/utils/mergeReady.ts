import type { DashboardItem } from '../types.js';

/**
 * Determine whether a PR is "ready to merge":
 * - Must be a PR (not an issue)
 * - Not a draft
 * - State is open (not merged/closed)
 * - Has at least one approval
 * - No changes requested
 * - CI is passing (success) or has no checks (none)
 */
export function isMergeReady(item: DashboardItem): boolean {
  if (item.kind !== 'pr') return false;
  return (
    !item.draft &&
    item.state === 'open' &&
    item.reviewState.approvals > 0 &&
    item.reviewState.changesRequested === 0 &&
    (item.ciStatus === 'success' || item.ciStatus === 'none')
  );
}
