import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar.js';
import type { PRStateFilterKey } from '../types.js';

afterEach(cleanup);

function renderFilterBar(overrides: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
  const defaults: React.ComponentProps<typeof FilterBar> = {
    active: 'all',
    onFilter: vi.fn(),
    mineOnly: true,
    onToggleMine: vi.fn(),
    username: 'testuser',
    searchQuery: '',
    onSearchChange: vi.fn(),
    searchInputRef: createRef<HTMLInputElement>(),
    itemTypeFilter: 'both',
    onSetItemType: vi.fn(),
    prStateFilters: new Set<PRStateFilterKey>(['draft', 'open']),
    onTogglePRState: vi.fn(),
    ...overrides,
  };
  return { ...render(<FilterBar {...defaults} />), props: defaults };
}

describe('FilterBar', () => {
  it('renders all filter pills', () => {
    renderFilterBar();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Failing CI')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('highlights the active filter', () => {
    renderFilterBar({ active: 'failing' });
    expect(screen.getByText('Failing CI')).toHaveClass('filter-active');
    expect(screen.getByText('All')).not.toHaveClass('filter-active');
  });

  it('calls onFilter when a filter pill is clicked', async () => {
    const onFilter = vi.fn();
    renderFilterBar({ onFilter });
    await userEvent.click(screen.getByText('Needs Review'));
    expect(onFilter).toHaveBeenCalledWith('needs-review');
  });

  it('shows username when mineOnly is true', () => {
    renderFilterBar({ mineOnly: true, username: 'octocat' });
    expect(screen.getByText('@octocat')).toBeInTheDocument();
  });

  it('shows "Everyone" when mineOnly is false', () => {
    renderFilterBar({ mineOnly: false, username: 'octocat' });
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });

  it('highlights the mine pill when mineOnly is true', () => {
    renderFilterBar({ mineOnly: true, username: 'octocat' });
    expect(screen.getByText('@octocat')).toHaveClass('filter-active');
  });

  it('calls onToggleMine when the mine pill is clicked', async () => {
    const onToggleMine = vi.fn();
    renderFilterBar({ mineOnly: false, onToggleMine });
    await userEvent.click(screen.getByText('Everyone'));
    expect(onToggleMine).toHaveBeenCalled();
  });
});

describe('FilterBar PR state pills', () => {
  it('renders Draft, Open, and Merged pills', () => {
    renderFilterBar();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Merged')).toBeInTheDocument();
  });

  it('marks Draft and Open as active by default', () => {
    renderFilterBar();
    const draft = screen.getByText('Draft');
    const open = screen.getByText('Open');
    const merged = screen.getByText('Merged');

    expect(draft.className).toContain('pr-state-active');
    expect(open.className).toContain('pr-state-active');
    expect(merged.className).not.toContain('pr-state-active');
  });

  it('marks Merged as active when included in prStateFilters', () => {
    renderFilterBar({ prStateFilters: new Set<PRStateFilterKey>(['draft', 'open', 'merged']) });
    expect(screen.getByText('Merged').className).toContain('pr-state-active');
  });

  it('calls onTogglePRState when a state pill is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterBar();

    await user.click(screen.getByText('Merged'));
    expect(props.onTogglePRState).toHaveBeenCalledWith('merged');

    await user.click(screen.getByText('Draft'));
    expect(props.onTogglePRState).toHaveBeenCalledWith('draft');
  });

  it('shows no active state pills when prStateFilters is empty', () => {
    renderFilterBar({ prStateFilters: new Set<PRStateFilterKey>() });
    const draft = screen.getByText('Draft');
    const open = screen.getByText('Open');
    const merged = screen.getByText('Merged');

    expect(draft.className).not.toContain('pr-state-active');
    expect(open.className).not.toContain('pr-state-active');
    expect(merged.className).not.toContain('pr-state-active');
  });
});
