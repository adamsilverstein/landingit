import React from 'react';
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
}

export function FilterBar({ active, onFilter, mineOnly, onToggleMine, username }: FilterBarProps) {
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
    </div>
  );
}
