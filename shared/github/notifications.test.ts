import { describe, it, expect, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import {
  fetchNotifications,
  markThreadAsRead,
  markThreadsAsRead,
  markAllAsRead,
  mapNotification,
} from './notifications.js';

function mockOctokit(overrides: Record<string, unknown> = {}): Octokit {
  return overrides as unknown as Octokit;
}

function rawNotification(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: '12345',
    unread: true,
    reason: 'mention',
    updated_at: '2026-05-12T10:00:00Z',
    last_read_at: null,
    subject: {
      title: 'Bump @octokit/rest from 21.0.0 to 21.1.1',
      type: 'PullRequest',
      url: 'https://api.github.com/repos/acme/web/pulls/42',
      latest_comment_url: 'https://api.github.com/repos/acme/web/issues/comments/9',
    },
    repository: {
      name: 'web',
      owner: { login: 'acme' },
    },
    ...over,
  };
}

describe('mapNotification', () => {
  it('maps a well-formed PR notification including parsed subjectNumber', () => {
    const item = mapNotification(rawNotification());
    expect(item).toMatchObject({
      id: '12345',
      unread: true,
      reason: 'mention',
      repo: { owner: 'acme', name: 'web' },
      subject: {
        title: 'Bump @octokit/rest from 21.0.0 to 21.1.1',
        type: 'PullRequest',
      },
      subjectNumber: 42,
    });
  });

  it('returns subjectNumber=null for non-PR/issue subjects', () => {
    const raw = rawNotification({
      subject: {
        title: 'Release 1.0.0',
        type: 'Release',
        url: 'https://api.github.com/repos/acme/web/releases/1',
        latest_comment_url: null,
      },
    });
    const item = mapNotification(raw);
    expect(item?.subjectNumber).toBeNull();
  });

  it('coerces a numeric id to string', () => {
    const item = mapNotification(rawNotification({ id: 999 }));
    expect(item?.id).toBe('999');
  });

  it('returns null when repository owner/name is missing', () => {
    expect(mapNotification(rawNotification({ repository: undefined }))).toBeNull();
    expect(
      mapNotification(rawNotification({ repository: { name: 'web' } }))
    ).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(mapNotification(null)).toBeNull();
    expect(mapNotification('string')).toBeNull();
    expect(mapNotification(undefined)).toBeNull();
  });

  it('defaults reason to "subscribed" when missing', () => {
    const raw = rawNotification();
    delete (raw as Record<string, unknown>).reason;
    expect(mapNotification(raw)?.reason).toBe('subscribed');
  });
});

describe('fetchNotifications', () => {
  it('maps the response to NotificationItem objects', async () => {
    const octokit = mockOctokit({
      activity: {
        listNotificationsForAuthenticatedUser: vi.fn().mockResolvedValue({
          data: [rawNotification(), rawNotification({ id: '2' })],
          headers: { 'last-modified': 'Tue, 12 May 2026 10:00:00 GMT' },
        }),
      },
    });

    const result = await fetchNotifications(octokit);
    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0].id).toBe('12345');
    expect(result.lastModified).toBe('Tue, 12 May 2026 10:00:00 GMT');
    expect(result.notModified).toBe(false);
  });

  it('sends If-Modified-Since when ifModifiedSince is provided', async () => {
    const fn = vi.fn().mockResolvedValue({ data: [], headers: {} });
    const octokit = mockOctokit({
      activity: { listNotificationsForAuthenticatedUser: fn },
    });

    await fetchNotifications(octokit, {
      ifModifiedSince: 'Mon, 11 May 2026 09:00:00 GMT',
    });

    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'If-Modified-Since': 'Mon, 11 May 2026 09:00:00 GMT' },
      })
    );
  });

  it('returns notModified:true when the server responds 304', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 304 });
    const octokit = mockOctokit({
      activity: { listNotificationsForAuthenticatedUser: fn },
    });

    const result = await fetchNotifications(octokit, {
      ifModifiedSince: 'Mon, 11 May 2026 09:00:00 GMT',
    });

    expect(result).toEqual({
      notifications: [],
      lastModified: null,
      notModified: true,
    });
  });

  it('propagates non-304 errors (e.g. 401)', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401, message: 'Bad credentials' });
    const octokit = mockOctokit({
      activity: { listNotificationsForAuthenticatedUser: fn },
    });

    await expect(fetchNotifications(octokit)).rejects.toMatchObject({ status: 401 });
  });

  it('clamps perPage to 50', async () => {
    const fn = vi.fn().mockResolvedValue({ data: [], headers: {} });
    const octokit = mockOctokit({
      activity: { listNotificationsForAuthenticatedUser: fn },
    });

    await fetchNotifications(octokit, { perPage: 200 });
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 50 })
    );
  });

  it('filters out unmappable entries instead of throwing', async () => {
    const octokit = mockOctokit({
      activity: {
        listNotificationsForAuthenticatedUser: vi.fn().mockResolvedValue({
          data: [
            rawNotification(),
            null,
            rawNotification({ repository: undefined }),
            'malformed',
          ],
          headers: {},
        }),
      },
    });

    const result = await fetchNotifications(octokit);
    expect(result.notifications).toHaveLength(1);
  });
});

describe('markThreadAsRead', () => {
  it('calls the API with the thread id coerced to number', async () => {
    const fn = vi.fn().mockResolvedValue({ data: {} });
    const octokit = mockOctokit({ activity: { markThreadAsRead: fn } });

    await markThreadAsRead(octokit, '42');
    expect(fn).toHaveBeenCalledWith({ thread_id: 42 });
  });
});

describe('markThreadsAsRead', () => {
  it('returns succeeded/failed split when some calls reject', async () => {
    const fn = vi.fn().mockImplementation(({ thread_id }: { thread_id: number }) => {
      if (thread_id === 2) return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: {} });
    });
    const octokit = mockOctokit({ activity: { markThreadAsRead: fn } });

    const result = await markThreadsAsRead(octokit, ['1', '2', '3']);
    expect(result.succeeded).toEqual(['1', '3']);
    expect(result.failed).toEqual([{ id: '2', error: 'boom' }]);
  });

  it('handles an empty list', async () => {
    const fn = vi.fn();
    const octokit = mockOctokit({ activity: { markThreadAsRead: fn } });
    const result = await markThreadsAsRead(octokit, []);
    expect(result.succeeded).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('markAllAsRead', () => {
  it('passes last_read_at when before is provided', async () => {
    const fn = vi.fn().mockResolvedValue({ data: {} });
    const octokit = mockOctokit({
      activity: { markNotificationsAsRead: fn },
    });

    await markAllAsRead(octokit, '2026-05-12T10:00:00Z');
    expect(fn).toHaveBeenCalledWith({ last_read_at: '2026-05-12T10:00:00Z' });
  });

  it('omits last_read_at when before is undefined', async () => {
    const fn = vi.fn().mockResolvedValue({ data: {} });
    const octokit = mockOctokit({
      activity: { markNotificationsAsRead: fn },
    });

    await markAllAsRead(octokit);
    expect(fn).toHaveBeenCalledWith({});
  });
});
