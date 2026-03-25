import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../components/FilterBar.js';

describe('FilterBar', () => {
  it('renders all filter pills', () => {
    render(
      <FilterBar
        active="all"
        onFilter={() => {}}
        mineOnly={false}
        onToggleMine={() => {}}
        username={null}
      />,
    );
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Failing CI')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('highlights the active filter', () => {
    render(
      <FilterBar
        active="failing"
        onFilter={() => {}}
        mineOnly={false}
        onToggleMine={() => {}}
        username={null}
      />,
    );
    expect(screen.getByText('Failing CI')).toHaveClass('filter-active');
    expect(screen.getByText('All')).not.toHaveClass('filter-active');
  });

  it('calls onFilter when a filter pill is clicked', async () => {
    const onFilter = vi.fn();
    render(
      <FilterBar
        active="all"
        onFilter={onFilter}
        mineOnly={false}
        onToggleMine={() => {}}
        username={null}
      />,
    );
    await userEvent.click(screen.getByText('Needs Review'));
    expect(onFilter).toHaveBeenCalledWith('needs-review');
  });

  it('shows username when mineOnly is true', () => {
    render(
      <FilterBar
        active="all"
        onFilter={() => {}}
        mineOnly={true}
        onToggleMine={() => {}}
        username="octocat"
      />,
    );
    expect(screen.getByText('@octocat')).toBeInTheDocument();
  });

  it('shows "Everyone" when mineOnly is false', () => {
    render(
      <FilterBar
        active="all"
        onFilter={() => {}}
        mineOnly={false}
        onToggleMine={() => {}}
        username="octocat"
      />,
    );
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });

  it('highlights the mine pill when mineOnly is true', () => {
    render(
      <FilterBar
        active="all"
        onFilter={() => {}}
        mineOnly={true}
        onToggleMine={() => {}}
        username="octocat"
      />,
    );
    expect(screen.getByText('@octocat')).toHaveClass('filter-active');
  });

  it('calls onToggleMine when the mine pill is clicked', async () => {
    const onToggleMine = vi.fn();
    render(
      <FilterBar
        active="all"
        onFilter={() => {}}
        mineOnly={false}
        onToggleMine={onToggleMine}
        username={null}
      />,
    );
    await userEvent.click(screen.getByText('Everyone'));
    expect(onToggleMine).toHaveBeenCalled();
  });
});
