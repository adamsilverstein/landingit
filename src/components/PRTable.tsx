import React from 'react';
import type { PRItem, SortMode } from '../types.js';
import { PRRow } from './PRRow.js';
import { SortableHeader } from './SortableHeader.js';

interface PRTableProps {
  items: PRItem[];
  cursorIndex: number;
  sort: SortMode;
  onSort: (key: SortMode) => void;
}

export function PRTable({ items, cursorIndex, sort, onSort }: PRTableProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        No PRs found. Press <kbd>c</kbd> to configure repos, or <kbd>r</kbd> to
        refresh.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="pr-table">
        <thead>
          <tr>
            <SortableHeader
              label="CI"
              sortKey="status"
              activeSort={sort}
              onSort={onSort}
              className="col-ci"
            />
            <SortableHeader
              label="Repo"
              sortKey="repo"
              activeSort={sort}
              onSort={onSort}
              className="col-repo"
            />
            <th className="col-number">#</th>
            <th className="col-state">State</th>
            <th className="col-title">Title</th>
            <th className="col-author">Author</th>
            <SortableHeader
              label="Updated"
              sortKey="updated"
              activeSort={sort}
              onSort={onSort}
              className="col-updated"
            />
            <th className="col-reviews">Reviews</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <PRRow key={item.id} item={item} selected={i === cursorIndex} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
