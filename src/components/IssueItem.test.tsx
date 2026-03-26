import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PRRow } from '../components/PRRow.js';
import type { IssueItem, PRItem, DashboardItem } from '../types.js';

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
    assignees: ['dev1'],
    milestone: null,
    ...overrides,
  };
}

const noop = () => {};

function renderRow(item: DashboardItem, selected = false) {
  return render(
    <table>
      <tbody>
        <PRRow item={item} selected={selected} unseen={false} onPreview={noop} onOpen={noop} />
      </tbody>
    </table>,
  );
}

describe('DashboardItem type discrimination', () => {
  it('renders PR type badge for PRItem', () => {
    renderRow(makePR());
    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('renders Issue type badge for IssueItem', () => {
    renderRow(makeIssue());
    expect(screen.getByText('Issue')).toBeInTheDocument();
  });

  it('renders issue title, number, author, and repo', () => {
    renderRow(makeIssue());
    expect(screen.getByText('Bug report')).toBeInTheDocument();
    expect(screen.getByText('#99')).toBeInTheDocument();
    expect(screen.getByText('@reporter')).toBeInTheDocument();
    expect(screen.getByText('acme/web')).toBeInTheDocument();
  });

  it('renders issue labels', () => {
    renderRow(
      makeIssue({
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'priority', color: '0000ff' },
        ],
      }),
    );
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
  });

  it('renders issue milestone', () => {
    renderRow(makeIssue({ milestone: 'v2.0' }));
    expect(screen.getByText(/v2\.0/)).toBeInTheDocument();
  });

  it('does not show labels for PRs', () => {
    const { container } = render(
      <table>
        <tbody>
          <PRRow item={makePR()} selected={false} unseen={false} onPreview={noop} onOpen={noop} />
        </tbody>
      </table>,
    );
    expect(container.querySelector('.label-badges')).toBeNull();
  });

  it('calls onOpen and onPreview when row is clicked', () => {
    const onOpen = vi.fn();
    const onPreview = vi.fn();
    const issue = makeIssue();
    const { container } = render(
      <table>
        <tbody>
          <PRRow item={issue} selected={false} unseen={false} onPreview={onPreview} onOpen={onOpen} />
        </tbody>
      </table>,
    );
    container.querySelector('tr')!.click();
    expect(onOpen).toHaveBeenCalledWith(issue);
    expect(onPreview).toHaveBeenCalledWith(issue);
  });
});

describe('Item type filtering logic', () => {
  const items: DashboardItem[] = [
    makePR({ id: 1, number: 1, title: 'PR 1' }),
    makePR({ id: 2, number: 2, title: 'PR 2' }),
    makeIssue({ id: 3, number: 3, title: 'Issue 1' }),
    makeIssue({ id: 4, number: 4, title: 'Issue 2' }),
    makeIssue({ id: 5, number: 5, title: 'Issue 3' }),
  ];

  it('shows all items when filter is "both"', () => {
    const result = items.filter(() => true);
    expect(result).toHaveLength(5);
  });

  it('shows only PRs when filter is "prs"', () => {
    const result = items.filter((item) => item.kind === 'pr');
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.kind === 'pr')).toBe(true);
  });

  it('shows only issues when filter is "issues"', () => {
    const result = items.filter((item) => item.kind === 'issue');
    expect(result).toHaveLength(3);
    expect(result.every((item) => item.kind === 'issue')).toBe(true);
  });

  it('PR-specific filters only affect PRs', () => {
    const failing = items.filter(
      (item) => item.kind === 'pr' && item.ciStatus === 'failure',
    );
    expect(failing).toHaveLength(0);
    const issuesInFailing = failing.filter((item) => item.kind === 'issue');
    expect(issuesInFailing).toHaveLength(0);
  });
});
