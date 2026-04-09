import { useState, useCallback, useEffect } from 'react';
import type { DashboardItem } from '../types.js';
import type { StorageAdapter } from '../storage.js';
import { STORAGE_KEYS } from '../constants.js';

/** Item key used for tracking: "owner/repo#number" */
function itemKey(pr: DashboardItem): string {
  return `${pr.repo.owner}/${pr.repo.name}#${pr.number}`;
}

function parseLastSeen(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
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
 * Hook that manages "last seen" timestamps per PR using a StorageAdapter.
 */
export function useLastSeen(storage: StorageAdapter) {
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});

  // Load from storage on mount
  useEffect(() => {
    storage.getItem(STORAGE_KEYS.LAST_SEEN).then((raw) => {
      setLastSeenMap(parseLastSeen(raw));
    });
  }, [storage]);

  const markSeen = useCallback((pr: DashboardItem) => {
    setLastSeenMap((prev) => {
      const next = { ...prev, [itemKey(pr)]: new Date().toISOString() };
      storage.setItem(STORAGE_KEYS.LAST_SEEN, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [storage]);

  const isUnseen = useCallback(
    (pr: DashboardItem) => hasNewActivity(pr, lastSeenMap),
    [lastSeenMap]
  );

  return { lastSeenMap, markSeen, isUnseen };
}
