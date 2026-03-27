import React from 'react';
import type { SortMode, SortDirection } from '../types.js';

interface SortableHeaderProps {
  label: string;
  sortKey: SortMode;
  activeSort: SortMode;
  sortDirection: SortDirection;
  onSort: (key: SortMode) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  activeSort,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = activeSort === sortKey;
  const arrow = isActive ? (sortDirection === 'desc' ? ' ▼' : ' ▲') : '';
  return (
    <th
      className={`sortable-header ${isActive ? 'sort-active' : ''} ${className ?? ''}`}
      scope="col"
      aria-sort={isActive ? (sortDirection === 'desc' ? 'descending' : 'ascending') : 'none'}
    >
      <button type="button" className="sortable-header-btn" onClick={() => onSort(sortKey)}>
        {label}
        {arrow && <span className="sort-arrow" aria-hidden="true">{arrow}</span>}
      </button>
    </th>
  );
}
