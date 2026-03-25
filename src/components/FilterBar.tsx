import React, { type RefObject } from 'react';
import type { FilterMode } from '../types.js';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'failing', label: 'Failing CI' },
  { key: 'needs-review', label: 'Needs Review' },
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
}

export function FilterBar({ active, onFilter, mineOnly, onToggleMine, username, searchQuery, onSearchChange, searchInputRef }: FilterBarProps) {
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
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          className={`filter-pill ${active === key ? 'filter-active' : ''}`}
          onClick={() => onFilter(key)}
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
