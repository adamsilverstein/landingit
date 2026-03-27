import type { DashboardItem } from '../types.js';

/**
 * Returns true if the item has had no update in at least `staleDays` days.
 * A value of 0 or negative disables staleness detection (always returns false).
 */
export function isStale(item: DashboardItem, staleDays: number, now: number = Date.now()): boolean {
  if (staleDays <= 0) return false;
  const updatedAt = new Date(item.updatedAt).getTime();
  const thresholdMs = staleDays * 24 * 60 * 60 * 1000;
  return now - updatedAt >= thresholdMs;
}
