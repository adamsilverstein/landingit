import React, { useRef, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DashboardItem, SortMode, SortDirection } from '../types.js';
import { DEFAULT_COLUMNS } from '../columns.js';
import { PRRow } from './PRRow.js';
import { SortableHeader } from './SortableHeader.js';
import { ColumnSettingsDropdown } from './ColumnSettingsDropdown.js';
import { MilestoneGroupHeader, useMilestoneCollapse } from './MilestoneGroup.js';
import { isStale } from '../utils/staleness.js';
import { groupByMilestone, type MilestoneGroup } from '../utils/milestoneGrouping.js';

const ROW_HEIGHT_ESTIMATE = 37;

type RowEntry =
  | { type: 'item'; item: DashboardItem; flatIndex: number }
  | { type: 'milestone-header'; group: MilestoneGroup; key: string };

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
  visibleColumns: string[];
  columnOrder: string[];
  onToggleColumn: (id: string) => void;
  onReorderColumns: (fromIndex: number, toIndex: number) => void;
  onResetColumns: () => void;
  milestoneGrouping?: boolean;
}

export function PRTable({ items, cursorIndex, sort, sortDirection, onSort, onPreview, isUnseen, onOpen, onHideRepo, staleDays, visibleColumns, columnOrder, onToggleColumn, onReorderColumns, onResetColumns, milestoneGrouping }: PRTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isCollapsed, toggle } = useMilestoneCollapse();

  const milestoneGroups = useMemo(
    () => (milestoneGrouping ? groupByMilestone(items) : []),
    [items, milestoneGrouping]
  );

  // Build a flat list of rows when milestone grouping is on
  const groupedRows: RowEntry[] = useMemo(() => {
    if (!milestoneGrouping) return [];
    const rows: RowEntry[] = [];
    let flatIdx = 0;
    for (const group of milestoneGroups) {
      const key = group.milestone?.title ?? '__none__';
      rows.push({ type: 'milestone-header', group, key });
      if (!isCollapsed(key)) {
        for (const item of group.items) {
          rows.push({ type: 'item', item, flatIndex: flatIdx });
          flatIdx++;
        }
      } else {
        flatIdx += group.items.length;
      }
    }
    return rows;
  }, [milestoneGrouping, milestoneGroups, isCollapsed]);

  const rowCount = milestoneGrouping ? groupedRows.length : items.length;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 10,
  });

  // Scroll to keep the selected row visible when cursor moves
  useEffect(() => {
    if (milestoneGrouping) return; // skip auto-scroll in grouped mode
    if (items.length > 0) {
      virtualizer.scrollToIndex(cursorIndex, { align: 'auto' });
    }
  }, [cursorIndex, virtualizer, items.length, milestoneGrouping]);

  const colMap = useMemo(() => new Map(DEFAULT_COLUMNS.map((c) => [c.id, c])), []);

  const orderedVisibleColumns = useMemo(
    () => columnOrder.filter((id) => visibleColumns.includes(id)).map((id) => colMap.get(id)!).filter(Boolean),
    [columnOrder, visibleColumns, colMap]
  );

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

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalHeight - virtualRows[virtualRows.length - 1].end : 0;

  // +1 for the settings column
  const colSpan = orderedVisibleColumns.length + 1;

  return (
    <div className="table-container" ref={scrollContainerRef}>
      <table className="pr-table" aria-label="Pull requests and issues">
        <thead>
          <tr>
            {orderedVisibleColumns.map((col) =>
              col.sortKey ? (
                <SortableHeader key={col.id} label={col.label} sortKey={col.sortKey} className={col.className} {...headerProps} />
              ) : (
                <th key={col.id} className={col.className} scope="col">{col.label}</th>
              )
            )}
            <th className="col-settings" scope="col">
              <ColumnSettingsDropdown
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onToggleColumn={onToggleColumn}
                onReorderColumns={onReorderColumns}
                onReset={onResetColumns}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr><td style={{ height: paddingTop, padding: 0, border: 'none' }} colSpan={colSpan} /></tr>
          )}
          {virtualRows.map((virtualRow) => {
            if (milestoneGrouping) {
              const entry = groupedRows[virtualRow.index];
              if (entry.type === 'milestone-header') {
                return (
                  <MilestoneGroupHeader
                    key={`ms-${entry.key}`}
                    milestone={entry.group.milestone}
                    itemCount={entry.group.items.length}
                    collapsed={isCollapsed(entry.key)}
                    onToggle={() => toggle(entry.key)}
                    colSpan={colSpan}
                  />
                );
              }
              return (
                <PRRow
                  key={`${entry.item.kind}-${entry.item.id}`}
                  item={entry.item}
                  selected={entry.flatIndex === cursorIndex}
                  unseen={isUnseen(entry.item)}
                  stale={isStale(entry.item, staleDays)}
                  onPreview={onPreview}
                  onOpen={onOpen}
                  onHideRepo={onHideRepo}
                  visibleColumns={orderedVisibleColumns.map((c) => c.id)}
                />
              );
            }

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
                visibleColumns={orderedVisibleColumns.map((c) => c.id)}
              />
            );
          })}
          {paddingBottom > 0 && (
            <tr><td style={{ height: paddingBottom, padding: 0, border: 'none' }} colSpan={colSpan} /></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
