import { describe, it, expect } from 'vitest';
import { isStale } from './staleness.js';
import type { PRItem, IssueItem } from '../types.js';

function makePR(updatedAt: string): PRItem {
  return {
    kind: 'pr',
    id: 1,
    number: 42,
    title: 'Fix the thing',
    author: 'developer',
    repo: { owner: 'acme', name: 'web' },
    url: 'https://github.com/acme/web/pull/42',
    updatedAt,
    createdAt: updatedAt,
    ciStatus: 'none',
    reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
    draft: false,
    state: 'open',
    isRequestedReviewer: false,
    assignees: [],
    labels: [],
  };
}

function makeIssue(updatedAt: string): IssueItem {
  return {
    kind: 'issue',
    id: 100,
    number: 99,
    title: 'Bug report',
    author: 'reporter',
    repo: { owner: 'acme', name: 'web' },
    url: 'https://github.com/acme/web/issues/99',
    updatedAt,
    createdAt: updatedAt,
    state: 'open',
    labels: [],
    assignees: [],
    milestone: null,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe('isStale', () => {
  const now = new Date('2026-03-26T12:00:00Z').getTime();

  it('returns true for a PR updated more than staleDays ago', () => {
    const updatedAt = new Date(now - 15 * DAY_MS).toISOString();
    expect(isStale(makePR(updatedAt), 14, now)).toBe(true);
  });

  it('returns false for a PR updated less than staleDays ago', () => {
    const updatedAt = new Date(now - 10 * DAY_MS).toISOString();
    expect(isStale(makePR(updatedAt), 14, now)).toBe(false);
  });

  it('returns true for a PR updated exactly staleDays ago', () => {
    const updatedAt = new Date(now - 14 * DAY_MS).toISOString();
    expect(isStale(makePR(updatedAt), 14, now)).toBe(true);
  });

  it('returns false when staleDays is 0 (disabled)', () => {
    const updatedAt = new Date(now - 100 * DAY_MS).toISOString();
    expect(isStale(makePR(updatedAt), 0, now)).toBe(false);
  });

  it('works for issues as well', () => {
    const updatedAt = new Date(now - 30 * DAY_MS).toISOString();
    expect(isStale(makeIssue(updatedAt), 14, now)).toBe(true);
  });

  it('returns false for a recently updated issue', () => {
    const updatedAt = new Date(now - 1 * DAY_MS).toISOString();
    expect(isStale(makeIssue(updatedAt), 14, now)).toBe(false);
  });

  it('works with a custom staleDays threshold', () => {
    const updatedAt = new Date(now - 31 * DAY_MS).toISOString();
    expect(isStale(makePR(updatedAt), 30, now)).toBe(true);

    const recent = new Date(now - 20 * DAY_MS).toISOString();
    expect(isStale(makePR(recent), 30, now)).toBe(false);
  });
});
