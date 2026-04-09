import type { SortMode } from './types.js';

export interface ColumnDef {
  id: string;
  label: string;
  className: string;
  sortKey?: SortMode;
  defaultVisible: boolean;
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'type', label: 'Type', className: 'col-type', defaultVisible: true },
  { id: 'ci', label: 'CI', className: 'col-ci', sortKey: 'status', defaultVisible: true },
  { id: 'repo', label: 'Repo', className: 'col-repo', sortKey: 'repo', defaultVisible: true },
  { id: 'number', label: '#', className: 'col-number', sortKey: 'number', defaultVisible: true },
  { id: 'state', label: 'State', className: 'col-state', sortKey: 'state', defaultVisible: true },
  { id: 'title', label: 'Title', className: 'col-title', sortKey: 'title', defaultVisible: true },
  { id: 'author', label: 'Author', className: 'col-author', sortKey: 'author', defaultVisible: true },
  { id: 'assignees', label: 'Assignees', className: 'col-assignees', sortKey: 'assignees', defaultVisible: true },
  { id: 'updated', label: 'Updated', className: 'col-updated', sortKey: 'updated', defaultVisible: true },
  { id: 'reviews', label: 'Reviews', className: 'col-reviews', sortKey: 'reviews', defaultVisible: true },
  { id: 'link', label: 'Link', className: 'col-link', defaultVisible: true },
];

export const DEFAULT_COLUMN_ORDER = DEFAULT_COLUMNS.map((c) => c.id);
export const DEFAULT_VISIBLE = DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);
