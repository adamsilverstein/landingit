// Web wrapper — injects webStorage into the shared hook.
// Preserves the original API (without storage param) so existing callers don't change.
import { useFilteredItems as useFilteredItemsShared } from '../../shared/hooks/useFilteredItems.js';
import { webStorage } from '../storage/webStorage.js';
import type { DashboardItem, FilterMode, SortMode } from '../../shared/types.js';

interface UseFilteredItemsOptions {
  items: DashboardItem[];
  defaultFilter: FilterMode;
  defaultSort: SortMode;
  isUnseen: (item: DashboardItem) => boolean;
  staleDays: number;
}

export function useFilteredItems(options: UseFilteredItemsOptions) {
  return useFilteredItemsShared({ ...options, storage: webStorage });
}
