import { describe, it, expect } from 'vitest';
import type {
  DashboardItem,
  NotificationItem,
  PRItem,
  IssueItem,
} from '../types.js';
import {
  matchNotifications,
  notificationsByItemKey,
  itemKey,
} from './notificationMatch.js';

function pr(over: Partial<PRItem> = {}): PRItem {
  return {
    kind: 'pr',
    id: 1,
    number: 42,
    title: 'PR',
    author: 'someone-else',
    repo: { owner: 'acme', name: 'web' },
    url: 'https://github.com/acme/web/pull/42',
    updatedAt: '2026-05-12T10:00:00Z',
    createdAt: '2026-05-11T10:00:00Z',
    ciStatus: 'none',
    reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
    draft: false,
    state: 'open',
    isRequestedReviewer: false,
    assignees: [],
    labels: [],
    ...over,
  };
}

function issue(over: Partial<IssueItem> = {}): IssueItem {
  return {
    kind: 'issue',
    id: 100,
    number: 99,
    title: 'Issue',
    author: 'someone-else',
    repo: { owner: 'acme', name: 'web' },
    url: 'https://github.com/acme/web/issues/99',
    updatedAt: '2026-05-12T10:00:00Z',
    createdAt: '2026-05-11T10:00:00Z',
    state: 'open',
    labels: [],
    assignees: [],
    milestone: null,
    ...over,
  };
}

function notification(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: '1',
    unread: true,
    reason: 'subscribed',
    updatedAt: '2026-05-12T10:00:00Z',
    lastReadAt: null,
    repo: { owner: 'acme', name: 'web' },
    subject: {
      title: 'Bump foo',
      type: 'PullRequest',
      url: 'https://api.github.com/repos/acme/web/pulls/42',
      latestCommentUrl: null,
    },
    subjectNumber: 42,
    ...over,
  };
}

describe('matchNotifications', () => {
  it('returns item:null and isWorkingSet:false when subjectNumber is null', () => {
    const result = matchNotifications(
      [notification({ subjectNumber: null })],
      [pr()],
      'me'
    );
    expect(result[0].item).toBeNull();
    expect(result[0].isWorkingSet).toBe(false);
  });

  it('matches by owner/repo/number case-insensitively on repo', () => {
    const items: DashboardItem[] = [pr({ repo: { owner: 'Acme', name: 'Web' } })];
    const result = matchNotifications([notification()], items, null);
    expect(result[0].item).toBe(items[0]);
  });

  it('returns isWorkingSet=true when authUser authored the PR', () => {
    const result = matchNotifications(
      [notification()],
      [pr({ author: 'me' })],
      'me'
    );
    expect(result[0].isWorkingSet).toBe(true);
  });

  it('returns isWorkingSet=true when authUser is a requested reviewer', () => {
    const result = matchNotifications(
      [notification()],
      [pr({ isRequestedReviewer: true })],
      'me'
    );
    expect(result[0].isWorkingSet).toBe(true);
  });

  it('returns isWorkingSet=true when authUser is assigned', () => {
    const result = matchNotifications(
      [notification()],
      [pr({ assignees: ['me'] })],
      'me'
    );
    expect(result[0].isWorkingSet).toBe(true);
  });

  it('returns isWorkingSet=false when authUser is null even if the PR matches', () => {
    const result = matchNotifications(
      [notification()],
      [pr({ author: 'me' })],
      null
    );
    expect(result[0].isWorkingSet).toBe(false);
  });

  it('does not treat issue matches as working-set (PRs only)', () => {
    const result = matchNotifications(
      [
        notification({
          subject: {
            title: 'Issue mention',
            type: 'Issue',
            url: 'https://api.github.com/repos/acme/web/issues/99',
            latestCommentUrl: null,
          },
          subjectNumber: 99,
        }),
      ],
      [issue({ author: 'me' })],
      'me'
    );
    expect(result[0].item).toBeDefined();
    expect(result[0].isWorkingSet).toBe(false);
  });

  it('returns item:null when nothing matches', () => {
    const result = matchNotifications(
      [notification()],
      [pr({ number: 999 })],
      'me'
    );
    expect(result[0].item).toBeNull();
  });
});

describe('notificationsByItemKey', () => {
  it('groups notifications by their PR/issue key', () => {
    const a = notification({ id: 'a' });
    const b = notification({ id: 'b' });
    const c = notification({ id: 'c', subjectNumber: 100 });
    const map = notificationsByItemKey([a, b, c]);
    expect(map.get('acme/web#42')).toHaveLength(2);
    expect(map.get('acme/web#100')).toHaveLength(1);
  });

  it('omits notifications without a subjectNumber', () => {
    const map = notificationsByItemKey([notification({ subjectNumber: null })]);
    expect(map.size).toBe(0);
  });
});

describe('itemKey', () => {
  it('lowercases the repo segment', () => {
    expect(itemKey(pr({ repo: { owner: 'Acme', name: 'Web' }, number: 42 }))).toBe(
      'acme/web#42'
    );
  });
});
