import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar.js';
import type { PRStateFilterKey, OwnershipFilter } from '../types.js';

afterEach(cleanup);

function renderFilterBar(overrides: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
  const defaults: React.ComponentProps<typeof FilterBar> = {
    active: 'all',
    onFilter: vi.fn(),
    ownershipFilter: 'created' as OwnershipFilter,
    onSetOwnership: vi.fn(),
    username: 'testuser',
    searchQuery: '',
    onSearchChange: vi.fn(),
    searchInputRef: createRef<HTMLInputElement>(),
    itemTypeFilter: 'both',
    onSetItemType: vi.fn(),
    prStateFilters: new Set<PRStateFilterKey>(['draft', 'open']),
    onTogglePRState: vi.fn(),
    labelFilters: new Set<string>(),
    onToggleLabel: vi.fn(),
    onClearLabels: vi.fn(),
    availableLabels: [],
    ...overrides,
  };
  return { ...render(<FilterBar {...defaults} />), props: defaults };
}

describe('FilterBar dropdowns', () => {
  it('renders all dropdown triggers', () => {
    renderFilterBar();
    expect(screen.getByText('Owner:')).toBeInTheDocument();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Filter:')).toBeInTheDocument();
    expect(screen.getByText('State:')).toBeInTheDocument();
  });

  it('shows username in ownership trigger when user-specific filter is active', () => {
    renderFilterBar({ ownershipFilter: 'created', username: 'octocat' });
    expect(screen.getByText('@octocat')).toBeInTheDocument();
  });

  it('shows "Everyone" in ownership trigger when everyone filter is active', () => {
    renderFilterBar({ ownershipFilter: 'everyone', username: 'octocat' });
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });

  it('shows filter options when trigger is clicked', async () => {
    renderFilterBar();
    await userEvent.click(screen.getByText('Filter:'));
    expect(screen.getByText('Failing CI')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
    expect(screen.getByText('Review Requested')).toBeInTheDocument();
  });

  it('calls onFilter when a filter option is selected', async () => {
    const onFilter = vi.fn();
    renderFilterBar({ onFilter });
    await userEvent.click(screen.getByText('Filter:'));
    await userEvent.click(screen.getByText('Needs Review'));
    expect(onFilter).toHaveBeenCalledWith('needs-review');
  });

  it('calls onSetOwnership when an ownership option is selected', async () => {
    const onSetOwnership = vi.fn();
    renderFilterBar({ onSetOwnership });
    await userEvent.click(screen.getByText('Owner:'));
    await userEvent.click(screen.getByText('Everyone'));
    expect(onSetOwnership).toHaveBeenCalledWith('everyone');
  });

  it('shows all ownership options in dropdown', async () => {
    renderFilterBar({ ownershipFilter: 'everyone' });
    await userEvent.click(screen.getByText('Owner:'));
    expect(screen.getByText('Created by me')).toBeInTheDocument();
    expect(screen.getByText('Assigned to me')).toBeInTheDocument();
    expect(screen.getByText('Involved')).toBeInTheDocument();
  });
});

describe('FilterBar PR state dropdown', () => {
  it('shows active states in trigger label', () => {
    renderFilterBar({ prStateFilters: new Set<PRStateFilterKey>(['draft', 'open']) });
    expect(screen.getByText('Draft, Open')).toBeInTheDocument();
  });

  it('calls onTogglePRState when a state option is toggled', async () => {
    const user = userEvent.setup();
    const { props } = renderFilterBar();
    await user.click(screen.getByText('State:'));
    await user.click(screen.getByText('Merged'));
    expect(props.onTogglePRState).toHaveBeenCalledWith('merged');
  });

  it('keeps dropdown open after toggling (multi-select)', async () => {
    const user = userEvent.setup();
    renderFilterBar();
    await user.click(screen.getByText('State:'));
    await user.click(screen.getByText('Merged'));
    // Dropdown should still be open — Draft and Open should still be visible
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});

describe('FilterBar search', () => {
  it('renders search input', () => {
    renderFilterBar();
    expect(screen.getByPlaceholderText('Search… ( / )')).toBeInTheDocument();
  });
});
