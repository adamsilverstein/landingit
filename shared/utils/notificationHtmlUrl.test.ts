import { describe, it, expect } from 'vitest';
import type { NotificationItem } from '../types.js';
import { notificationHtmlUrl } from './notificationHtmlUrl.js';

function notification(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: '1',
    unread: true,
    reason: 'subscribed',
    updatedAt: '2026-05-12T10:00:00Z',
    lastReadAt: null,
    repo: { owner: 'acme', name: 'web' },
    subject: {
      title: 'PR',
      type: 'PullRequest',
      url: 'https://api.github.com/repos/acme/web/pulls/42',
      latestCommentUrl: null,
    },
    subjectNumber: 42,
    ...over,
  };
}

describe('notificationHtmlUrl', () => {
  it('translates a PR API URL to github.com/.../pull/N', () => {
    expect(notificationHtmlUrl(notification())).toBe(
      'https://github.com/acme/web/pull/42'
    );
  });

  it('keeps issues at /issues/', () => {
    expect(
      notificationHtmlUrl(
        notification({
          subject: {
            title: 'Issue',
            type: 'Issue',
            url: 'https://api.github.com/repos/acme/web/issues/99',
            latestCommentUrl: null,
          },
        })
      )
    ).toBe('https://github.com/acme/web/issues/99');
  });

  it('translates /commits/SHA to /commit/SHA (singular)', () => {
    expect(
      notificationHtmlUrl(
        notification({
          subject: {
            title: 'Commit',
            type: 'Commit',
            url: 'https://api.github.com/repos/acme/web/commits/abc123',
            latestCommentUrl: null,
          },
        })
      )
    ).toBe('https://github.com/acme/web/commit/abc123');
  });

  it('falls back to the repo page when subject.url is null', () => {
    expect(
      notificationHtmlUrl(notification({ subject: { ...notification().subject, url: null } }))
    ).toBe('https://github.com/acme/web');
  });

  it('falls back to the repo page on unknown subject URL shapes', () => {
    expect(
      notificationHtmlUrl(
        notification({
          subject: {
            title: 'Workflow',
            type: 'WorkflowRun',
            url: 'https://api.github.com/repos/acme/web/actions/runs/123',
            latestCommentUrl: null,
          },
        })
      )
    ).toBe('https://github.com/acme/web');
  });
});
