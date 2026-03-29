import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MilestoneGroupHeader } from './MilestoneGroup.js';
import type { MilestoneInfo } from '../types.js';

function renderHeader(props: Partial<React.ComponentProps<typeof MilestoneGroupHeader>> = {}) {
  const defaultProps: React.ComponentProps<typeof MilestoneGroupHeader> = {
    milestone: { title: 'v1.0', openIssues: 5, closedIssues: 3, dueOn: null },
    itemCount: 3,
    collapsed: false,
    onToggle: vi.fn(),
    ...props,
  };
  return render(
    <table>
      <tbody>
        <MilestoneGroupHeader {...defaultProps} />
      </tbody>
    </table>,
  );
}

describe('MilestoneGroupHeader', () => {
  it('renders milestone title', () => {
    renderHeader();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('renders item count', () => {
    renderHeader({ itemCount: 5 });
    expect(screen.getByText('5 items')).toBeInTheDocument();
  });

  it('renders singular "item" for count of 1', () => {
    renderHeader({ itemCount: 1 });
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('renders progress bar with percentage', () => {
    renderHeader({
      milestone: { title: 'v1.0', openIssues: 2, closedIssues: 8, dueOn: null },
    });
    expect(screen.getByText('8/10 (80%)')).toBeInTheDocument();
  });

  it('renders "No Milestone" when milestone is null', () => {
    renderHeader({ milestone: null });
    expect(screen.getByText('No Milestone')).toBeInTheDocument();
  });

  it('does not show progress for "No Milestone" group', () => {
    renderHeader({ milestone: null });
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('calls onToggle when button is clicked', () => {
    const onToggle = vi.fn();
    renderHeader({ onToggle });
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('button has aria-expanded matching collapsed state', () => {
    renderHeader({ collapsed: false });
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('button has aria-expanded=false when collapsed', () => {
    renderHeader({ collapsed: true });
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders collapsed chevron class when collapsed', () => {
    const { container } = renderHeader({ collapsed: true });
    const chevron = container.querySelector('.milestone-group-chevron');
    expect(chevron).toHaveClass('collapsed');
  });

  it('renders non-collapsed chevron class when expanded', () => {
    const { container } = renderHeader({ collapsed: false });
    const chevron = container.querySelector('.milestone-group-chevron');
    expect(chevron).not.toHaveClass('collapsed');
  });

  it('renders due date when provided', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    renderHeader({
      milestone: { title: 'v1.0', openIssues: 5, closedIssues: 3, dueOn: futureDate },
    });
    expect(screen.getByText(/📅/)).toBeInTheDocument();
  });

  it('shows overdue styling when due date is in the past', () => {
    const pastDate = '2020-01-01T00:00:00Z';
    const { container } = renderHeader({
      milestone: { title: 'v1.0', openIssues: 5, closedIssues: 3, dueOn: pastDate },
    });
    const dueEl = container.querySelector('.milestone-group-due');
    expect(dueEl).toHaveClass('overdue');
    expect(dueEl?.textContent).toContain('overdue');
  });
});
