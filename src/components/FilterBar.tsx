import React, { useState, useEffect, useRef, type RefObject } from 'react';
import type { FilterMode, ItemTypeFilter, RepoConfig, PRStateFilterKey } from '../types.js';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'failing', label: 'Failing CI' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'review-requested', label: 'Review Requested' },
  { key: 'new-activity', label: 'New Activity' },
];

const ITEM_TYPES: { key: ItemTypeFilter; label: string }[] = [
  { key: 'both', label: 'Both' },
  { key: 'prs', label: 'PRs' },
  { key: 'issues', label: 'Issues' },
];

const PR_STATE_FILTERS: { key: PRStateFilterKey; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'open', label: 'Open' },
  { key: 'merged', label: 'Merged' },
];

interface FilterBarProps {
  active: FilterMode;
  onFilter: (mode: FilterMode) => void;
  mineOnly: boolean;
  onToggleMine: () => void;
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

export function FilterBar({ active, onFilter, mineOnly, onToggleMine, username, searchQuery, onSearchChange, searchInputRef, itemTypeFilter, onSetItemType, hiddenRepos, onRestoreRepo, prStateFilters, onTogglePRState }: FilterBarProps) {
  const [showHiddenDropdown, setShowHiddenDropdown] = useState(false);
  const hiddenCount = hiddenRepos?.length ?? 0;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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

  // Reset dropdown when all repos are restored
  useEffect(() => {
    if (hiddenCount === 0) setShowHiddenDropdown(false);
  }, [hiddenCount]);

  return (
    <div className="filter-bar">
      <button
        className={`filter-pill ${mineOnly ? 'filter-active' : ''}`}
        onClick={onToggleMine}
        title={`Show ${mineOnly ? 'all' : 'only mine'} (m)`}
      >
        {mineOnly ? `@${username ?? '...'}` : 'Everyone'}
      </button>
      <span className="filter-divider" />
      {ITEM_TYPES.map(({ key, label }) => (
        <button
          key={key}
          className={`filter-pill ${itemTypeFilter === key ? 'filter-active' : ''}`}
          onClick={() => onSetItemType(key)}
          title={`Show ${label} (t)`}
        >
          {label}
        </button>
      ))}
      <span className="filter-divider" />
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          className={`filter-pill ${active === key ? 'filter-active' : ''}`}
          onClick={() => onFilter(key)}
        >
          {label}
        </button>
      ))}
      {hiddenCount > 0 && (
        <>
          <span className="filter-divider" />
          <div className="hidden-repos-wrapper" ref={dropdownRef}>
            <button
              className="filter-pill hidden-repos-pill"
              onClick={() => setShowHiddenDropdown((prev) => !prev)}
              title="Show hidden repositories"
            >
              {hiddenCount} hidden
            </button>
            {showHiddenDropdown && (
              <div className="hidden-repos-dropdown">
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
        </>
      )}
      <span className="filter-divider" />
      {PR_STATE_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          className={`filter-pill pr-state-pill pr-state-${key} ${prStateFilters.has(key) ? 'pr-state-active' : ''}`}
          onClick={() => onTogglePRState(key)}
        >
          {label}
        </button>
      ))}
      <span className="filter-divider" />
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
