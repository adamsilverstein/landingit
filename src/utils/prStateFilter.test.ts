import { describe, it, expect } from 'vitest';
import type { PRItem, IssueItem } from '../types.js';
import { filterByPRState } from './prStateFilter.js';

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
    ciStatus: 'none',
    reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
    draft: false,
    state: 'open',
    isRequestedReviewer: false,
    ...overrides,
  };
}

describe('PR state filtering', () => {
  const draftPR = makePR({ id: 1, title: 'Draft PR', draft: true, state: 'open' });
  const openPR = makePR({ id: 2, title: 'Open PR', draft: false, state: 'open' });
  const mergedPR = makePR({ id: 3, title: 'Merged PR', draft: false, state: 'merged' });
  const closedPR = makePR({ id: 4, title: 'Closed PR', draft: false, state: 'closed' });
  const allPRs = [draftPR, openPR, mergedPR, closedPR];

  it('shows draft and open PRs by default (draft + open filters)', () => {
    const result = filterByPRState(allPRs, new Set(['draft', 'open']));
    expect(result).toEqual([draftPR, openPR]);
  });

  it('shows only open (non-draft) PRs when only open filter is active', () => {
    const result = filterByPRState(allPRs, new Set(['open']));
    expect(result).toEqual([openPR]);
  });

  it('shows only draft PRs when only draft filter is active', () => {
    const result = filterByPRState(allPRs, new Set(['draft']));
    expect(result).toEqual([draftPR]);
  });

  it('shows only merged PRs when only merged filter is active', () => {
    const result = filterByPRState(allPRs, new Set(['merged']));
    expect(result).toEqual([mergedPR]);
  });

  it('shows all state-matching PRs when all filters are active', () => {
    const result = filterByPRState(allPRs, new Set(['draft', 'open', 'merged']));
    expect(result).toEqual([draftPR, openPR, mergedPR]);
  });

  it('returns empty array when no filters are active', () => {
    const result = filterByPRState(allPRs, new Set());
    expect(result).toEqual([]);
  });

  it('never includes closed PRs', () => {
    const result = filterByPRState(allPRs, new Set(['draft', 'open', 'merged']));
    expect(result).not.toContain(closedPR);
  });

  it('always passes through issues regardless of PR state filters', () => {
    const issue: IssueItem = {
      kind: 'issue',
      id: 100,
      number: 10,
      title: 'Test Issue',
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
    const mixed = [draftPR, openPR, issue];

    expect(filterByPRState(mixed, new Set(['draft']))).toContain(issue);
    expect(filterByPRState(mixed, new Set(['open']))).toContain(issue);
    expect(filterByPRState(mixed, new Set(['merged']))).toContain(issue);
    expect(filterByPRState(mixed, new Set())).toContain(issue);
  });
});
