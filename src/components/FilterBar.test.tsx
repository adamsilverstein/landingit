import { describe, it, expect, vi } from 'vitest';
import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../components/FilterBar.js';

const defaultProps = {
  active: 'all' as const,
  onFilter: () => {},
  mineOnly: false,
  onToggleMine: () => {},
  username: null as string | null,
  searchQuery: '',
  onSearchChange: () => {},
  searchInputRef: createRef<HTMLInputElement>(),
  itemTypeFilter: 'both' as const,
  onSetItemType: () => {},
};

describe('FilterBar', () => {
  it('renders all filter pills', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Failing CI')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('highlights the active filter', () => {
    render(<FilterBar {...defaultProps} active="failing" />);
    expect(screen.getByText('Failing CI')).toHaveClass('filter-active');
    expect(screen.getByText('All')).not.toHaveClass('filter-active');
  });

  it('calls onFilter when a filter pill is clicked', async () => {
    const onFilter = vi.fn();
    render(<FilterBar {...defaultProps} onFilter={onFilter} />);
    await userEvent.click(screen.getByText('Needs Review'));
    expect(onFilter).toHaveBeenCalledWith('needs-review');
  });

  it('shows username when mineOnly is true', () => {
    render(<FilterBar {...defaultProps} mineOnly={true} username="octocat" />);
    expect(screen.getByText('@octocat')).toBeInTheDocument();
  });

  it('shows "Everyone" when mineOnly is false', () => {
    render(<FilterBar {...defaultProps} mineOnly={false} username="octocat" />);
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });

  it('highlights the mine pill when mineOnly is true', () => {
    render(<FilterBar {...defaultProps} mineOnly={true} username="octocat" />);
    expect(screen.getByText('@octocat')).toHaveClass('filter-active');
  });

  it('calls onToggleMine when the mine pill is clicked', async () => {
    const onToggleMine = vi.fn();
    render(<FilterBar {...defaultProps} onToggleMine={onToggleMine} />);
    await userEvent.click(screen.getByText('Everyone'));
    expect(onToggleMine).toHaveBeenCalled();
  });
});
