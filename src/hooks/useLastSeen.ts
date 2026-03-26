import { useState, useCallback } from 'react';
import type { DashboardItem } from '../types.js';
import { STORAGE_KEYS } from '../constants.js';

/** Item key used for tracking: "owner/repo#number" */
function itemKey(pr: DashboardItem): string {
  return `${pr.repo.owner}/${pr.repo.name}#${pr.number}`;
}

function loadLastSeen(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SEEN);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function saveLastSeen(data: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN, JSON.stringify(data));
  } catch {
    // Silently ignore storage failures (e.g. quota exceeded, private browsing)
  }
}

/**
 * Returns true if the PR has been updated since the user last viewed it.
 */
export function hasNewActivity(
  pr: DashboardItem,
  lastSeenMap: Record<string, string>
): boolean {
  const seen = lastSeenMap[itemKey(pr)];
  if (!seen) return true; // never seen → new
  const seenDate = new Date(seen);
  if (isNaN(seenDate.getTime())) return true; // invalid timestamp → treat as unseen
  return new Date(pr.updatedAt).getTime() > seenDate.getTime();
}

/**
 * Hook that manages "last seen" timestamps per PR in localStorage.
 */
export function useLastSeen() {
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(loadLastSeen);

  const markSeen = useCallback((pr: DashboardItem) => {
    setLastSeenMap((prev) => {
      const next = { ...prev, [itemKey(pr)]: new Date().toISOString() };
      saveLastSeen(next);
      return next;
    });
  }, []);

  const isUnseen = useCallback(
    (pr: DashboardItem) => hasNewActivity(pr, lastSeenMap),
    [lastSeenMap]
  );

  return { lastSeenMap, markSeen, isUnseen };
}
