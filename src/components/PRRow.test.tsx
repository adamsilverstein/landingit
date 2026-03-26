import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRRow } from '../components/PRRow.js';
import type { PRItem } from '../types.js';

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
          <PRRow item={item} selected={selected} unseen={false} onPreview={onPreview} onOpen={onOpen} />
        </tbody>
      </table>,
    ),
    onPreview,
    onOpen,
  };
}

describe('PRRow', () => {
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

  it('renders requested reviewer badge when isRequestedReviewer is true', () => {
    renderRow(makePR({ isRequestedReviewer: true }));
    expect(screen.getByTitle('Your review is requested')).toBeInTheDocument();
  });

  it('does not render requested reviewer badge when isRequestedReviewer is false', () => {
    renderRow(makePR({ isRequestedReviewer: false }));
    expect(screen.queryByTitle('Your review is requested')).not.toBeInTheDocument();
  });
});
