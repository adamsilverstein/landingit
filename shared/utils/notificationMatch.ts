import type { DashboardItem, NotificationItem, PRItem } from '../types.js';

export interface NotificationMatch {
  notification: NotificationItem;
  /** The PR/issue from items[] that the notification points to, when present. */
  item: DashboardItem | null;
  /**
   * True when `item` is a PR the authenticated user is actively working on:
   *   - authored it
   *   - is a requested reviewer
   *   - is assigned
   * Issues and unmatched notifications are always `false`.
   */
  isWorkingSet: boolean;
}

function buildItemKey(owner: string, repo: string, number: number): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}#${number}`;
}

function isWorkingSetPR(pr: PRItem, authUser: string): boolean {
  return (
    pr.author === authUser ||
    pr.isRequestedReviewer ||
    pr.assignees.includes(authUser)
  );
}

/**
 * Cross-reference each notification against the currently-fetched
 * `items[]`. The lookup is O(1) per notification: items are keyed by
 * `${owner}/${repo}#${number}` once up front.
 *
 * Matching is case-insensitive on the repo segment because GitHub
 * routes are case-insensitive there, and the notifications API
 * sometimes returns canonical casing that differs from what the user
 * typed when adding the repo to LandinGit.
 */
export function matchNotifications(
  notifications: NotificationItem[],
  items: DashboardItem[],
  authUser: string | null
): NotificationMatch[] {
  const itemIndex = new Map<string, DashboardItem>();
  for (const item of items) {
    itemIndex.set(
      buildItemKey(item.repo.owner, item.repo.name, item.number),
      item
    );
  }

  return notifications.map((notification) => {
    const number = notification.subjectNumber;
    if (number == null) {
      return { notification, item: null, isWorkingSet: false };
    }
    const key = buildItemKey(
      notification.repo.owner,
      notification.repo.name,
      number
    );
    const item = itemIndex.get(key) ?? null;
    const isWorkingSet =
      authUser != null &&
      item != null &&
      item.kind === 'pr' &&
      isWorkingSetPR(item, authUser);
    return { notification, item, isWorkingSet };
  });
}

/**
 * Group notifications by their matching PR/issue id, for cross-linking
 * back into the PR table. Returns a Map keyed by `${owner}/${repo}#${number}`
 * to a list of notifications.
 */
export function notificationsByItemKey(
  notifications: NotificationItem[]
): Map<string, NotificationItem[]> {
  const map = new Map<string, NotificationItem[]>();
  for (const n of notifications) {
    if (n.subjectNumber == null) continue;
    const key = buildItemKey(n.repo.owner, n.repo.name, n.subjectNumber);
    const list = map.get(key);
    if (list) {
      list.push(n);
    } else {
      map.set(key, [n]);
    }
  }
  return map;
}

/**
 * Build the key for an existing DashboardItem so callers can look it up
 * in the map returned by `notificationsByItemKey`.
 */
export function itemKey(item: DashboardItem): string {
  return buildItemKey(item.repo.owner, item.repo.name, item.number);
}
