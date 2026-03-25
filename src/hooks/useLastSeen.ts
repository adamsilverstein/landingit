import { useState, useCallback } from 'react';
import type { PRItem } from '../types.js';

const STORAGE_KEY = 'gh-dashboard-last-seen';

/** PR key used for tracking: "owner/repo#number" */
function prKey(pr: PRItem): string {
  return `${pr.repo.owner}/${pr.repo.name}#${pr.number}`;
}

function loadLastSeen(): Record<string, string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLastSeen(data: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Returns true if the PR has been updated since the user last viewed it.
 */
export function hasNewActivity(
  pr: PRItem,
  lastSeenMap: Record<string, string>
): boolean {
  const seen = lastSeenMap[prKey(pr)];
  if (!seen) return true; // never seen → new
  return new Date(pr.updatedAt).getTime() > new Date(seen).getTime();
}

/**
 * Hook that manages "last seen" timestamps per PR in localStorage.
 */
export function useLastSeen() {
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(loadLastSeen);

  const markSeen = useCallback((pr: PRItem) => {
    setLastSeenMap((prev) => {
      const next = { ...prev, [prKey(pr)]: new Date().toISOString() };
      saveLastSeen(next);
      return next;
    });
  }, []);

  const isUnseen = useCallback(
    (pr: PRItem) => hasNewActivity(pr, lastSeenMap),
    [lastSeenMap]
  );

  return { lastSeenMap, markSeen, isUnseen };
}
