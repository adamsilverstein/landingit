import { describe, it, expect } from 'vitest';
import type { IssueItem, PRItem, MilestoneInfo } from '../types.js';
import { groupByMilestone } from './milestoneGrouping.js';

function makeMilestone(overrides: Partial<MilestoneInfo> = {}): MilestoneInfo {
  return {
    title: 'v1.0',
    openIssues: 3,
    closedIssues: 2,
    dueOn: null,
    ...overrides,
  };
}

function makeIssue(overrides: Partial<IssueItem> = {}): IssueItem {
  return {
    kind: 'issue',
    id: 100,
    number: 99,
    title: 'Bug report',
    author: 'reporter',
    repo: { owner: 'acme', name: 'web' },
    url: 'https://github.com/acme/web/issues/99',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    state: 'open',
    labels: [],
    assignees: [],
    milestone: null,
    ...overrides,
  };
}

function makePR(overrides: Partial<PRItem> = {}): PRItem {
  return {
    kind: 'pr',
    id: 1,
    number: 42,
    title: 'Fix the thing',
    author: 'developer',
    repo: { owner: 'acme', name: 'web' },
    url: 'https://github.com/acme/web/pull/42',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ciStatus: 'none',
    reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
    draft: false,
    state: 'open',
    isRequestedReviewer: false,
    assignees: [],
    labels: [],
    ...overrides,
  };
}

describe('groupByMilestone', () => {
  it('returns empty array for empty input', () => {
    expect(groupByMilestone([])).toEqual([]);
  });

  it('groups issues by milestone', () => {
    const ms1 = makeMilestone({ title: 'v1.0' });
    const ms2 = makeMilestone({ title: 'v2.0' });
    const items = [
      makeIssue({ id: 1, milestone: ms1 }),
      makeIssue({ id: 2, milestone: ms2 }),
      makeIssue({ id: 3, milestone: ms1 }),
    ];

    const groups = groupByMilestone(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].milestone?.title).toBe('v1.0');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].milestone?.title).toBe('v2.0');
    expect(groups[1].items).toHaveLength(1);
  });

  it('puts items without milestone into "No Milestone" group at the end', () => {
    const ms = makeMilestone({ title: 'v1.0' });
    const items = [
      makeIssue({ id: 1, milestone: ms }),
      makeIssue({ id: 2, milestone: null }),
      makePR({ id: 3 }),
    ];

    const groups = groupByMilestone(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].milestone?.title).toBe('v1.0');
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].milestone).toBeNull();
    expect(groups[1].items).toHaveLength(2);
  });

  it('PRs are always in the "No Milestone" group', () => {
    const items = [
      makePR({ id: 1 }),
      makePR({ id: 2 }),
    ];

    const groups = groupByMilestone(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].milestone).toBeNull();
    expect(groups[0].items).toHaveLength(2);
  });

  it('sorts milestone groups by due date (earliest first)', () => {
    const ms1 = makeMilestone({ title: 'v1.0', dueOn: '2025-03-01T00:00:00Z' });
    const ms2 = makeMilestone({ title: 'v2.0', dueOn: '2025-01-01T00:00:00Z' });
    const ms3 = makeMilestone({ title: 'v3.0', dueOn: null });

    const items = [
      makeIssue({ id: 1, milestone: ms1 }),
      makeIssue({ id: 2, milestone: ms2 }),
      makeIssue({ id: 3, milestone: ms3 }),
    ];

    const groups = groupByMilestone(items);
    expect(groups).toHaveLength(3);
    expect(groups[0].milestone?.title).toBe('v2.0');
    expect(groups[1].milestone?.title).toBe('v1.0');
    expect(groups[2].milestone?.title).toBe('v3.0');
  });

  it('sorts milestones without due date alphabetically', () => {
    const msB = makeMilestone({ title: 'Beta', dueOn: null });
    const msA = makeMilestone({ title: 'Alpha', dueOn: null });

    const items = [
      makeIssue({ id: 1, milestone: msB }),
      makeIssue({ id: 2, milestone: msA }),
    ];

    const groups = groupByMilestone(items);
    expect(groups[0].milestone?.title).toBe('Alpha');
    expect(groups[1].milestone?.title).toBe('Beta');
  });

  it('sorts milestones with same due date alphabetically by title', () => {
    const msB = makeMilestone({ title: 'Beta', dueOn: '2025-06-01T00:00:00Z' });
    const msA = makeMilestone({ title: 'Alpha', dueOn: '2025-06-01T00:00:00Z' });

    const items = [
      makeIssue({ id: 1, milestone: msB }),
      makeIssue({ id: 2, milestone: msA }),
    ];

    const groups = groupByMilestone(items);
    expect(groups[0].milestone?.title).toBe('Alpha');
    expect(groups[1].milestone?.title).toBe('Beta');
  });

  it('aggregates milestone stats across repos', () => {
    const ms1 = makeMilestone({ title: 'v1.0', openIssues: 3, closedIssues: 2, dueOn: '2025-06-01T00:00:00Z' });
    const ms2 = makeMilestone({ title: 'v1.0', openIssues: 5, closedIssues: 1, dueOn: '2025-05-01T00:00:00Z' });

    const items = [
      makeIssue({ id: 1, milestone: ms1, repo: { owner: 'acme', name: 'web' } }),
      makeIssue({ id: 2, milestone: ms2, repo: { owner: 'acme', name: 'api' } }),
    ];

    const groups = groupByMilestone(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
    // Stats should be aggregated
    expect(groups[0].milestone?.openIssues).toBe(8);
    expect(groups[0].milestone?.closedIssues).toBe(3);
    // Should use earliest due date
    expect(groups[0].milestone?.dueOn).toBe('2025-05-01T00:00:00Z');
  });

  it('handles all items having no milestone', () => {
    const items = [
      makeIssue({ id: 1, milestone: null }),
      makeIssue({ id: 2, milestone: null }),
    ];

    const groups = groupByMilestone(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].milestone).toBeNull();
    expect(groups[0].items).toHaveLength(2);
  });
});
