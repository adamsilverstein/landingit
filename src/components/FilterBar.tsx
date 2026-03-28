import React, { useState, useEffect, useRef, type RefObject } from 'react';
import type { FilterMode, ItemTypeFilter, RepoConfig, PRStateFilterKey, OwnershipFilter } from '../types.js';
import { FilterDropdown, type FilterDropdownOption } from './FilterDropdown.js';

const OWNERSHIP_OPTIONS: FilterDropdownOption<OwnershipFilter>[] = [
  { key: 'created', label: 'Created by me' },
  { key: 'assigned', label: 'Assigned to me' },
  { key: 'involved', label: 'Involved' },
  { key: 'everyone', label: 'Everyone' },
];

const ITEM_TYPE_OPTIONS: FilterDropdownOption<ItemTypeFilter>[] = [
  { key: 'both', label: 'Both' },
  { key: 'prs', label: 'PRs' },
  { key: 'issues', label: 'Issues' },
];

const FILTER_OPTIONS: FilterDropdownOption<FilterMode>[] = [
  { key: 'all', label: 'All' },
  { key: 'failing', label: 'Failing CI' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'review-requested', label: 'Review Requested' },
  { key: 'new-activity', label: 'New Activity' },
  { key: 'merge-ready', label: 'Ready to Merge' },
  { key: 'stale', label: 'Stale' },
];

const PR_STATE_OPTIONS: FilterDropdownOption<PRStateFilterKey>[] = [
  { key: 'draft', label: 'Draft', color: 'var(--text-muted)' },
  { key: 'open', label: 'Open', color: 'var(--green)' },
  { key: 'merged', label: 'Merged', color: 'var(--purple)' },
];

interface FilterBarProps {
  active: FilterMode;
  onFilter: (mode: FilterMode) => void;
  ownershipFilter: OwnershipFilter;
  onSetOwnership: (filter: OwnershipFilter) => void;
  username: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef: RefObject<HTMLInputElement>;
  itemTypeFilter: ItemTypeFilter;
  onSetItemType: (type: ItemTypeFilter) => void;
  hiddenRepos?: RepoConfig[];
  onRestoreRepo?: (owner: string, name: string) => void;
  prStateFilters: Set<PRStateFilterKey>;
  onTogglePRState: (key: PRStateFilterKey) => void;
}

export function FilterBar({ active, onFilter, ownershipFilter, onSetOwnership, username, searchQuery, onSearchChange, searchInputRef, itemTypeFilter, onSetItemType, hiddenRepos, onRestoreRepo, prStateFilters, onTogglePRState }: FilterBarProps) {
  const [showHiddenDropdown, setShowHiddenDropdown] = useState(false);
  const hiddenCount = hiddenRepos?.length ?? 0;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHiddenDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowHiddenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHiddenDropdown]);

  useEffect(() => {
    if (hiddenCount === 0) setShowHiddenDropdown(false);
  }, [hiddenCount]);

  return (
    <div className="filter-bar">
      <FilterDropdown
        categoryLabel="Owner"
        options={OWNERSHIP_OPTIONS}
        value={ownershipFilter}
        onSelect={onSetOwnership}
        renderTriggerLabel={() =>
          ownershipFilter !== 'everyone' && username
            ? `@${username}`
            : OWNERSHIP_OPTIONS.find((o) => o.key === ownershipFilter)!.label
        }
      />
      <FilterDropdown
        categoryLabel="Type"
        options={ITEM_TYPE_OPTIONS}
        value={itemTypeFilter}
        onSelect={onSetItemType}
      />
      <FilterDropdown
        categoryLabel="Filter"
        options={FILTER_OPTIONS}
        value={active}
        onSelect={onFilter}
      />
      {hiddenCount > 0 && (
        <div className="hidden-repos-wrapper" ref={dropdownRef}>
          <button
            className="filter-dropdown-trigger hidden-repos-trigger"
            onClick={() => setShowHiddenDropdown((prev) => !prev)}
            title="Show hidden repositories"
          >
            <span className="filter-dropdown-value hidden-repos-label">{hiddenCount} hidden</span>
          </button>
          {showHiddenDropdown && (
            <div className="filter-dropdown-panel hidden-repos-panel">
              <div className="hidden-repos-header">Hidden Repositories</div>
              {hiddenRepos?.map((repo) => (
                <button
                  key={`${repo.owner}/${repo.name}`}
                  className="hidden-repo-item"
                  onClick={() => {
                    onRestoreRepo?.(repo.owner, repo.name);
                  }}
                  title={`Restore ${repo.owner}/${repo.name}`}
                >
                  <span className="hidden-repo-name">{repo.owner}/{repo.name}</span>
                  <span className="hidden-repo-restore">restore</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <FilterDropdown
        categoryLabel="State"
        options={PR_STATE_OPTIONS}
        values={prStateFilters}
        onToggle={onTogglePRState}
      />
      <input
        ref={searchInputRef}
        type="text"
        className="search-input"
        placeholder="Search… ( / )"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onSearchChange('');
            searchInputRef.current?.blur();
          }
        }}
      />
    </div>
  );
}
