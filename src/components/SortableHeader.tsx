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
      onClick={() => onSort(sortKey)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
    >
      {label}
      {arrow && <span className="sort-arrow">{arrow}</span>}
    </th>
  );
}
