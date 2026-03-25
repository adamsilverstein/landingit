import React from 'react';
import type { SortMode } from '../types.js';

interface SortableHeaderProps {
  label: string;
  sortKey: SortMode;
  activeSort: SortMode;
  onSort: (key: SortMode) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = activeSort === sortKey;
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
      {isActive && <span className="sort-arrow"> ▼</span>}
    </th>
  );
}
