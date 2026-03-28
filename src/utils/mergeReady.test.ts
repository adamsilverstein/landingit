import { describe, it, expect } from 'vitest';
import { isMergeReady } from '../utils/mergeReady.js';
import type { PRItem, IssueItem } from '../types.js';

function makePR(overrides: Partial<PRItem> = {}): PRItem {
  return {
    kind: 'pr',
    id: 1,
    number: 1,
    title: 'Test PR',
    author: 'user',
    repo: { owner: 'org', name: 'repo' },
    url: 'https://github.com/org/repo/pull/1',
    updatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    ciStatus: 'success',
    reviewState: { approvals: 1, changesRequested: 0, commentCount: 0 },
    draft: false,
    state: 'open',
    isRequestedReviewer: false,
    assignees: [],
    labels: [],
    ...overrides,
  };
}

function makeIssue(): IssueItem {
  return {
    kind: 'issue',
    id: 2,
    number: 10,
    title: 'Bug report',
    author: 'user',
    repo: { owner: 'org', name: 'repo' },
    url: 'https://github.com/org/repo/issues/10',
    updatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    state: 'open',
    labels: [],
    assignees: [],
    milestone: null,
  };
}

describe('isMergeReady', () => {
  it('returns true for an approved open PR with passing CI', () => {
    expect(isMergeReady(makePR())).toBe(true);
  });

  it('returns false for an approved open PR with no CI checks', () => {
    // 'none' can indicate either "no checks configured" or "error fetching checks"
    // To avoid false positives, we require explicit success
    expect(isMergeReady(makePR({ ciStatus: 'none' }))).toBe(false);
  });

  it('returns false for a draft PR', () => {
    expect(isMergeReady(makePR({ draft: true }))).toBe(false);
  });

  it('returns false for a merged PR', () => {
    expect(isMergeReady(makePR({ state: 'merged' }))).toBe(false);
  });

  it('returns false for a closed PR', () => {
    expect(isMergeReady(makePR({ state: 'closed' }))).toBe(false);
  });

  it('returns false when there are no approvals', () => {
    expect(isMergeReady(makePR({ reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 } }))).toBe(false);
  });

  it('returns false when changes are requested', () => {
    expect(isMergeReady(makePR({ reviewState: { approvals: 1, changesRequested: 1, commentCount: 0 } }))).toBe(false);
  });

  it('returns false for failing CI', () => {
    expect(isMergeReady(makePR({ ciStatus: 'failure' }))).toBe(false);
  });

  it('returns false for pending CI', () => {
    expect(isMergeReady(makePR({ ciStatus: 'pending' }))).toBe(false);
  });

  it('returns false for mixed CI', () => {
    expect(isMergeReady(makePR({ ciStatus: 'mixed' }))).toBe(false);
  });

  it('returns false for issues (not PRs)', () => {
    expect(isMergeReady(makeIssue())).toBe(false);
  });

  it('returns true with multiple approvals and no blockers', () => {
    expect(
      isMergeReady(makePR({
        reviewState: { approvals: 3, changesRequested: 0, commentCount: 5 },
      }))
    ).toBe(true);
  });
});