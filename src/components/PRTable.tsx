import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DashboardItem, SortMode, SortDirection } from '../types.js';
import { PRRow } from './PRRow.js';
import { SortableHeader } from './SortableHeader.js';
import { isStale } from '../utils/staleness.js';

const ROW_HEIGHT_ESTIMATE = 37;

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
  staleDays: number;
}

export function PRTable({ items, cursorIndex, sort, sortDirection, onSort, onPreview, isUnseen, onOpen, onHideRepo, staleDays }: PRTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 10,
  });

  // Scroll to keep the selected row visible when cursor moves
  useEffect(() => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(cursorIndex, { align: 'auto' });
    }
  }, [cursorIndex, virtualizer, items.length]);

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

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  // Spacer heights for rows above and below the visible window
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div className="table-container" ref={scrollContainerRef}>
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
            <SortableHeader label="Assignees" sortKey="assignees" className="col-assignees" {...headerProps} />
            <SortableHeader label="Updated" sortKey="updated" className="col-updated" {...headerProps} />
            <SortableHeader label="Reviews" sortKey="reviews" className="col-reviews" {...headerProps} />
            <th className="col-link" scope="col">Link</th>
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr><td style={{ height: paddingTop, padding: 0, border: 'none' }} colSpan={10} /></tr>
          )}
          {virtualRows.map((virtualRow) => {
            const item = items[virtualRow.index];
            return (
              <PRRow
                key={`${item.kind}-${item.id}`}
                item={item}
                selected={virtualRow.index === cursorIndex}
                unseen={isUnseen(item)}
                stale={isStale(item, staleDays)}
                onPreview={onPreview}
                onOpen={onOpen}
                onHideRepo={onHideRepo}
              />
            );
          })}
          {paddingBottom > 0 && (
            <tr><td style={{ height: paddingBottom, padding: 0, border: 'none' }} colSpan={10} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
