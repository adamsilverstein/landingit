import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRRow } from '../components/PRRow.js';
import type { PRItem } from '../types.js';
import { DEFAULT_COLUMN_ORDER } from '../columns.js';

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

function renderRow(item: PRItem, selected = false) {
  const onPreview = vi.fn();
  const onOpen = vi.fn();
  return {
    ...render(
      <table>
        <tbody>
          <PRRow item={item} selected={selected} unseen={false} stale={false} onPreview={onPreview} onOpen={onOpen} visibleColumns={DEFAULT_COLUMN_ORDER} />
        </tbody>
      </table>,
    ),
    onPreview,
    onOpen,
  };
}

describe('PRRow', () => {
  it('renders labels for PRs when present', () => {
    renderRow(
      makePR({
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'priority', color: '0000ff' },
        ],
      }),
    );
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
  });

  it('renders PR title, number, author, and repo', () => {
    renderRow(makePR());
    expect(screen.getByText('Fix the thing')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('@developer')).toBeInTheDocument();
    expect(screen.getByText('acme/web')).toBeInTheDocument();
  });

  it('shows "open" state for an open non-draft PR', () => {
    renderRow(makePR({ state: 'open', draft: false }));
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('shows "draft" state for a draft PR', () => {
    renderRow(makePR({ state: 'open', draft: true }));
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('shows "merged" state for a merged PR', () => {
    renderRow(makePR({ state: 'merged' }));
    expect(screen.getByText('merged')).toBeInTheDocument();
  });

  it('shows "closed" state for a closed PR', () => {
    renderRow(makePR({ state: 'closed' }));
    expect(screen.getByText('closed')).toBeInTheDocument();
  });

  it('applies selected class when selected', () => {
    const { container } = renderRow(makePR(), true);
    const row = container.querySelector('tr');
    expect(row).toHaveClass('pr-row-selected');
  });

  it('does not apply selected class when not selected', () => {
    const { container } = renderRow(makePR(), false);
    const row = container.querySelector('tr');
    expect(row).not.toHaveClass('pr-row-selected');
  });

  it('renders CI badge', () => {
    const { container } = renderRow(makePR({ ciStatus: 'success' }));
    const badge = container.querySelector('.ci-badge');
    expect(badge).toHaveClass('ci-success');
  });

  it('renders review badges when reviews exist', () => {
    renderRow(
      makePR({
        reviewState: { approvals: 2, changesRequested: 0, commentCount: 1 },
      }),
    );
    expect(screen.getByText('✓2')).toBeInTheDocument();
    expect(screen.getByText('💬1')).toBeInTheDocument();
  });

  it('calls onPreview when row is clicked', () => {
    const { container, onPreview } = renderRow(makePR());
    container.querySelector('tr')!.click();
    expect(onPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://github.com/acme/web/pull/42',
      }),
    );
  });

  it('renders a direct link to the PR on GitHub that opens in a new tab', () => {
    const { onPreview, onOpen } = renderRow(makePR());
    const link = screen.getByRole('link', { name: 'Open on GitHub' });
    expect(link).toHaveAttribute('href', 'https://github.com/acme/web/pull/42');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(link);
    expect(onPreview).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('shows merge-ready badge and class for approved PR with passing CI', () => {
    const { container } = renderRow(
      makePR({
        ciStatus: 'success',
        reviewState: { approvals: 1, changesRequested: 0, commentCount: 0 },
        draft: false,
        state: 'open',
      }),
    );
    const row = container.querySelector('tr');
    expect(row).toHaveClass('pr-row-merge-ready');
    expect(screen.getByRole('img', { name: 'Ready to merge' })).toBeInTheDocument();
  });

  it('does not show merge-ready badge for draft PR', () => {
    const { container } = renderRow(
      makePR({
        ciStatus: 'success',
        reviewState: { approvals: 1, changesRequested: 0, commentCount: 0 },
        draft: true,
        state: 'open',
      }),
    );
    const row = container.querySelector('tr');
    expect(row).not.toHaveClass('pr-row-merge-ready');
    expect(screen.queryByRole('img', { name: 'Ready to merge' })).toBeNull();
  });

  it('does not show merge-ready badge for PR with failing CI', () => {
    const { container } = renderRow(
      makePR({
        ciStatus: 'failure',
        reviewState: { approvals: 1, changesRequested: 0, commentCount: 0 },
        draft: false,
        state: 'open',
      }),
    );
    const row = container.querySelector('tr');
    expect(row).not.toHaveClass('pr-row-merge-ready');
  });

  it('does not show merge-ready badge for PR with no approvals', () => {
    const { container } = renderRow(
      makePR({
        ciStatus: 'success',
        reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
        draft: false,
        state: 'open',
      }),
    );
    const row = container.querySelector('tr');
    expect(row).not.toHaveClass('pr-row-merge-ready');
  });

  it('renders requested reviewer badge when isRequestedReviewer is true', () => {
    renderRow(makePR({ isRequestedReviewer: true }));
    expect(screen.getByTitle('Your review is requested')).toBeInTheDocument();
  });

  it('does not render requested reviewer badge when isRequestedReviewer is false', () => {
    renderRow(makePR({ isRequestedReviewer: false }));
    expect(screen.queryByTitle('Your review is requested')).not.toBeInTheDocument();
  });

  it('renders the last commenter in the lastCommenter column when present', () => {
    const onPreview = vi.fn();
    const onOpen = vi.fn();
    render(
      <table>
        <tbody>
          <PRRow
            item={makePR({ lastCommenter: 'alice' })}
            selected={false}
            unseen={false}
            stale={false}
            onPreview={onPreview}
            onOpen={onOpen}
            visibleColumns={DEFAULT_COLUMN_ORDER}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('renders a dash in the lastCommenter column when no commenter', () => {
    const onPreview = vi.fn();
    const onOpen = vi.fn();
    const { container } = render(
      <table>
        <tbody>
          <PRRow
            item={makePR()}
            selected={false}
            unseen={false}
            stale={false}
            onPreview={onPreview}
            onOpen={onOpen}
            visibleColumns={['lastCommenter']}
          />
        </tbody>
      </table>,
    );
    const cell = container.querySelector('.col-last-commenter');
    expect(cell).not.toBeNull();
    expect(cell!.textContent).toBe('—');
  });
});
