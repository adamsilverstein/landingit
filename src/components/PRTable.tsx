import React from 'react';
import type { DashboardItem, SortMode, SortDirection } from '../types.js';
import { PRRow } from './PRRow.js';
import { SortableHeader } from './SortableHeader.js';

interface PRTableProps {
  items: DashboardItem[];
  cursorIndex: number;
  sort: SortMode;
  sortDirection: SortDirection;
  onSort: (key: SortMode) => void;
}

export function PRTable({ items, cursorIndex, sort, sortDirection, onSort }: PRTableProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        No items found. Press <kbd>c</kbd> to configure repos, or <kbd>r</kbd> to
        refresh.
      </div>
    );
  }

  const headerProps = {
    activeSort: sort,
    sortDirection,
    onSort,
  };

  return (
    <div className="table-container">
      <table className="pr-table">
        <thead>
          <tr>
            <th className="col-type">Type</th>
            <SortableHeader label="CI" sortKey="status" className="col-ci" {...headerProps} />
            <SortableHeader label="Repo" sortKey="repo" className="col-repo" {...headerProps} />
            <SortableHeader label="#" sortKey="number" className="col-number" {...headerProps} />
            <SortableHeader label="State" sortKey="state" className="col-state" {...headerProps} />
            <SortableHeader label="Title" sortKey="title" className="col-title" {...headerProps} />
            <SortableHeader label="Author" sortKey="author" className="col-author" {...headerProps} />
            <SortableHeader label="Updated" sortKey="updated" className="col-updated" {...headerProps} />
            <SortableHeader label="Reviews" sortKey="reviews" className="col-reviews" {...headerProps} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <PRRow key={`${item.kind}-${item.id}`} item={item} selected={i === cursorIndex} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
