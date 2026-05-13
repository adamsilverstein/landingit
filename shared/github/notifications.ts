import type { Octokit } from '@octokit/rest';
import type {
  NotificationItem,
  NotificationReason,
  NotificationSubjectType,
} from '../types.js';
import { parseNotificationSubject } from '../utils/parseNotificationSubject.js';

export interface FetchNotificationsOptions {
  /** Include already-read threads. Default false. */
  all?: boolean;
  /** If set, sent as `If-Modified-Since`. A 304 response is free against the rate limit. */
  ifModifiedSince?: string | null;
  /** Page size, max 50 per GitHub's limit. Default 50. */
  perPage?: number;
}

export interface FetchNotificationsResult {
  notifications: NotificationItem[];
  /** `Last-Modified` from the response, suitable for the next `If-Modified-Since`. */
  lastModified: string | null;
  /** True when the server returned 304 (nothing changed). `notifications` will be empty. */
  notModified: boolean;
}

/**
 * Map a raw GitHub notification thread to our internal `NotificationItem`.
 * Pulled out so it can be reused by tests and future endpoints.
 */
export function mapNotification(raw: unknown): NotificationItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const subject = r.subject as Record<string, unknown> | undefined;
  const repository = r.repository as Record<string, unknown> | undefined;
  const owner = repository?.owner as Record<string, unknown> | undefined;

  const id = typeof r.id === 'string' ? r.id : String(r.id ?? '');
  // Thread IDs must be numeric — Number(threadId) inside markThreadAsRead
  // would silently NaN out on a malformed value otherwise.
  if (!id || !/^\d+$/.test(id)) return null;

  const repoOwner = typeof owner?.login === 'string' ? owner.login : '';
  const repoName = typeof repository?.name === 'string' ? repository.name : '';
  if (!repoOwner || !repoName) return null;

  const subjectUrl = typeof subject?.url === 'string' ? subject.url : null;
  const parsed = parseNotificationSubject(subjectUrl);

  return {
    id,
    unread: r.unread === true,
    reason: (typeof r.reason === 'string' ? r.reason : 'subscribed') as NotificationReason,
    updatedAt: typeof r.updated_at === 'string' ? r.updated_at : new Date().toISOString(),
    lastReadAt: typeof r.last_read_at === 'string' ? r.last_read_at : null,
    repo: { owner: repoOwner, name: repoName },
    subject: {
      title: typeof subject?.title === 'string' ? subject.title : '',
      type: (typeof subject?.type === 'string' ? subject.type : 'Issue') as NotificationSubjectType,
      url: subjectUrl,
      latestCommentUrl:
        typeof subject?.latest_comment_url === 'string'
          ? subject.latest_comment_url
          : null,
    },
    subjectNumber: parsed ? parsed.number : null,
  };
}

/**
 * Fetch the authenticated user's notification threads across all repos.
 *
 * Sends `If-Modified-Since` when `ifModifiedSince` is provided so that
 * unchanged inboxes return 304 and do not consume the rate-limit budget.
 * Octokit surfaces 304 as a thrown error with `status === 304`; we catch
 * it and return `notModified: true`.
 */
export async function fetchNotifications(
  octokit: Octokit,
  options: FetchNotificationsOptions = {}
): Promise<FetchNotificationsResult> {
  const perPage = Math.max(1, Math.min(options.perPage ?? 50, 50));
  const headers: Record<string, string> = {};
  if (options.ifModifiedSince) {
    headers['If-Modified-Since'] = options.ifModifiedSince;
  }

  try {
    const response = await octokit.activity.listNotificationsForAuthenticatedUser({
      all: options.all ?? false,
      per_page: perPage,
      headers,
    });

    const raw = Array.isArray(response.data) ? response.data : [];
    const notifications = raw
      .map((n) => mapNotification(n))
      .filter((n): n is NotificationItem => n !== null);

    const lastModified =
      typeof response.headers?.['last-modified'] === 'string'
        ? response.headers['last-modified']
        : null;

    return { notifications, lastModified, notModified: false };
  } catch (e) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'status' in e &&
      (e as { status: unknown }).status === 304
    ) {
      return { notifications: [], lastModified: null, notModified: true };
    }
    throw e;
  }
}

/**
 * Mark a single notification thread as read.
 */
export async function markThreadAsRead(
  octokit: Octokit,
  threadId: string
): Promise<void> {
  await octokit.activity.markThreadAsRead({ thread_id: Number(threadId) });
}

export interface BulkMarkResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Mark many notification threads as read. Uses Promise.allSettled so a
 * single failure does not abort the bulk operation; partial-failure
 * counts are surfaced for the UI to display.
 */
export async function markThreadsAsRead(
  octokit: Octokit,
  threadIds: string[]
): Promise<BulkMarkResult> {
  const results = await Promise.allSettled(
    threadIds.map((id) => markThreadAsRead(octokit, id))
  );
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  results.forEach((r, i) => {
    const id = threadIds[i];
    if (r.status === 'fulfilled') {
      succeeded.push(id);
    } else {
      failed.push({
        id,
        error: r.reason instanceof Error ? r.reason.message : 'Unknown error',
      });
    }
  });
  return { succeeded, failed };
}

/**
 * Mark ALL the authenticated user's notifications as read.
 * `before` is an ISO timestamp; threads updated after it are left unread.
 */
export async function markAllAsRead(
  octokit: Octokit,
  before?: string
): Promise<void> {
  await octokit.activity.markNotificationsAsRead(
    before ? { last_read_at: before } : {}
  );
}
