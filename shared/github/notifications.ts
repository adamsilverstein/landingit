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
  /**
   * Optional conditional probe timestamp. When set, we send a single
   * `If-Modified-Since` request first; on 304 we short-circuit. On 200
   * we discard that probe and re-fetch the full list unconditionally,
   * because GitHub's /notifications endpoint returns *only the threads
   * updated since that timestamp* on a 200 — not the full inbox — and
   * pagination would stop short on the first partial page.
   */
  ifModifiedSince?: string | null;
  /** Page size, max 50 per GitHub's limit. Default 50. */
  perPage?: number;
  /**
   * Safety cap on pages walked. Default 20 → up to 1000 threads, which covers
   * any realistic inbox while bounding worst-case requests if GitHub keeps
   * returning full pages.
   */
  maxPages?: number;
}

export interface FetchNotificationsResult {
  notifications: NotificationItem[];
  /** `Last-Modified` from the response, suitable for the next conditional probe. */
  lastModified: string | null;
  /** True when the conditional probe returned 304 (nothing changed). `notifications` will be empty. */
  notModified: boolean;
}

/**
 * Thrown by fetchNotifications when GitHub returns 403/404 from the
 * notifications endpoint, which usually means the auth token lacks the
 * `notifications` OAuth scope. Surfaced separately from generic errors
 * so the UI can show a "your token is missing a scope" prompt rather
 * than a confusing "Not Found".
 */
export class NotificationsScopeError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(
      'GitHub denied access to the notifications endpoint. Your token is missing the "notifications" scope — re-authenticate to grant it.'
    );
    this.name = 'NotificationsScopeError';
    this.status = status;
  }
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
  const maxPages = Math.max(1, options.maxPages ?? 20);
  const all = options.all ?? false;

  // Conditional probe. GitHub's /notifications endpoint treats
  // If-Modified-Since as a *filter*, not just a cache validator —
  // a 200 response with this header set contains only threads updated
  // since the timestamp, not the full inbox. So we use the header
  // exclusively as a cheap "is the inbox dirty?" check: 304 ⇒ skip
  // the work entirely; anything else ⇒ fall through and re-fetch
  // unconditionally below.
  if (options.ifModifiedSince) {
    try {
      await octokit.activity.listNotificationsForAuthenticatedUser({
        all,
        per_page: 1,
        page: 1,
        headers: { 'If-Modified-Since': options.ifModifiedSince },
      });
      // 200 means something changed — discard this response and refetch
      // the full list below.
    } catch (e) {
      if (typeof e === 'object' && e !== null && 'status' in e) {
        const status = (e as { status: unknown }).status;
        if (status === 304) {
          return { notifications: [], lastModified: null, notModified: true };
        }
        if (status === 403 || status === 404) {
          throw new NotificationsScopeError(status as number);
        }
      }
      throw e;
    }
  }

  try {
    const collected: NotificationItem[] = [];
    let lastModified: string | null = null;

    for (let page = 1; page <= maxPages; page++) {
      const response = await octokit.activity.listNotificationsForAuthenticatedUser({
        all,
        per_page: perPage,
        page,
      });

      const raw = Array.isArray(response.data) ? response.data : [];
      for (const n of raw) {
        const mapped = mapNotification(n);
        if (mapped) collected.push(mapped);
      }

      if (page === 1) {
        lastModified =
          typeof response.headers?.['last-modified'] === 'string'
            ? response.headers['last-modified']
            : null;
      }

      // Short page → last page. GitHub stops sending the `next` Link too,
      // but length comparison is enough and doesn't require parsing Link.
      if (raw.length < perPage) break;
    }

    return { notifications: collected, lastModified, notModified: false };
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'status' in e) {
      const status = (e as { status: unknown }).status;
      // 403 (or sometimes 404) from this endpoint nearly always means the
      // token lacks the `notifications` scope. 401 is bubbled up so the
      // existing re-auth flow handles it; everything else propagates.
      if (status === 403 || status === 404) {
        throw new NotificationsScopeError(status as number);
      }
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
