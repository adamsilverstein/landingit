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
  onPreview: (item: DashboardItem) => void;
  isUnseen: (item: DashboardItem) => boolean;
  onOpen: (item: DashboardItem) => void;
  onHideRepo?: (owner: string, name: string) => void;
}

export function PRTable({ items, cursorIndex, sort, sortDirection, onSort, onPreview, isUnseen, onOpen, onHideRepo }: PRTableProps) {
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
      <table className="pr-table" aria-label="Pull requests and issues">
        <thead>
          <tr>
            <th className="col-type" scope="col">Type</th>
            <SortableHeader label="CI" sortKey="status" className="col-ci" {...headerProps} />
            <SortableHeader label="Repo" sortKey="repo" className="col-repo" {...headerProps} />
            <SortableHeader label="#" sortKey="number" className="col-number" {...headerProps} />
            <SortableHeader label="State" sortKey="state" className="col-state" {...headerProps} />
            <SortableHeader label="Title" sortKey="title" className="col-title" {...headerProps} />
            <SortableHeader label="Author" sortKey="author" className="col-author" {...headerProps} />
            <SortableHeader label="Updated" sortKey="updated" className="col-updated" {...headerProps} />
            <SortableHeader label="Reviews" sortKey="reviews" className="col-reviews" {...headerProps} />
            <th className="col-link" scope="col">Link</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <PRRow key={`${item.kind}-${item.id}`} item={item} selected={i === cursorIndex} unseen={isUnseen(item)} onPreview={onPreview} onOpen={onOpen} onHideRepo={onHideRepo} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
