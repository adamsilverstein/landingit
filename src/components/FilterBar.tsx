import React, { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import type { FilterMode, ItemTypeFilter, LabelInfo, RepoConfig, PRStateFilterKey, OwnershipFilter } from '../types.js';
import { FilterDropdown, type FilterDropdownOption } from './FilterDropdown.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { LabelBadge } from './LabelBadge.js';

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
  labelFilters: Set<string>;
  onToggleLabel: (label: string) => void;
  onClearLabels: () => void;
  availableLabels: LabelInfo[];
}

export function FilterBar({ active, onFilter, ownershipFilter, onSetOwnership, username, searchQuery, onSearchChange, searchInputRef, itemTypeFilter, onSetItemType, hiddenRepos, onRestoreRepo, prStateFilters, onTogglePRState, labelFilters, onToggleLabel, onClearLabels, availableLabels }: FilterBarProps) {
  const [showHiddenDropdown, setShowHiddenDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const hiddenCount = hiddenRepos?.length ?? 0;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  const closeHiddenDropdown = useCallback(() => setShowHiddenDropdown(false), []);
  const closeLabelDropdown = useCallback(() => setShowLabelDropdown(false), []);

  useClickOutside(dropdownRef, showHiddenDropdown, closeHiddenDropdown);
  useClickOutside(labelDropdownRef, showLabelDropdown, closeLabelDropdown);


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
      {availableLabels.length > 0 && (
        <div className="label-filter-wrapper" ref={labelDropdownRef}>
          <button
            className={`filter-dropdown-trigger ${labelFilters.size > 0 ? 'filter-active' : ''}`}
            onClick={() => setShowLabelDropdown((prev) => !prev)}
            title="Filter by labels"
          >
            <span className="filter-dropdown-category">Labels</span>
            <span className="filter-dropdown-value">
              {labelFilters.size > 0 ? `${labelFilters.size} selected` : 'All'}
            </span>
          </button>
          {showLabelDropdown && (
            <div className="label-filter-dropdown">
              <div className="label-filter-header">
                <span>Filter by Label</span>
                {labelFilters.size > 0 && (
                  <button className="label-filter-clear" onClick={onClearLabels}>
                    Clear
                  </button>
                )}
              </div>
              <div className="label-filter-list">
                {availableLabels.map(({ name, color }) => (
                  <button
                    key={name}
                    className={`label-filter-item ${labelFilters.has(name) ? 'label-filter-selected' : ''}`}
                    onClick={() => onToggleLabel(name)}
                  >
                    <LabelBadge label={{ name, color }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
