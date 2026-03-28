import { useMemo, useEffect, useState, useCallback } from 'react';
import type { DashboardItem, FilterMode, LabelInfo, SortMode, SortDirection, ItemTypeFilter, PRStateFilterKey } from '../types.js';
import { filterByPRState } from '../utils/prStateFilter.js';
import { isStale } from '../utils/staleness.js';
import { isMergeReady } from '../utils/mergeReady.js';
import { STORAGE_KEYS } from '../constants.js';

const FILTER_CYCLE: FilterMode[] = ['all', 'failing', 'needs-review', 'review-requested', 'new-activity', 'merge-ready', 'stale'];
const SORT_CYCLE: SortMode[] = ['updated', 'created', 'repo', 'status', 'number', 'state', 'title', 'author', 'assignees', 'reviews'];
const ITEM_TYPE_CYCLE: ItemTypeFilter[] = ['both', 'prs', 'issues'];

function loadLabelFilters(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LABEL_FILTERS);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed.filter((s) => typeof s === 'string'));
      }
    }
  } catch { /* ignore invalid stored data */ }
  return new Set<string>();
}

function loadPRStateFilters(): Set<PRStateFilterKey> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PR_STATE_FILTERS);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((k): k is PRStateFilterKey => k === 'draft' || k === 'open' || k === 'merged');
        if (valid.length > 0) {
          return new Set<PRStateFilterKey>(valid);
        }
      }
    }
  } catch { /* ignore invalid stored data */ }
  return new Set<PRStateFilterKey>(['draft', 'open']);
}

interface UseFilteredItemsOptions {
  items: DashboardItem[];
  defaultFilter: FilterMode;
  defaultSort: SortMode;
  isUnseen: (item: DashboardItem) => boolean;
  staleDays: number;
}

export function useFilteredItems({ items, defaultFilter, defaultSort, isUnseen, staleDays }: UseFilteredItemsOptions) {
  const [filter, setFilter] = useState<FilterMode>(defaultFilter);
  const [sort, setSort] = useState<SortMode>(defaultSort);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('both');
  const [cursorIndex, setCursorIndex] = useState(0);
  const [prStateFilters, setPRStateFilters] = useState<Set<PRStateFilterKey>>(loadPRStateFilters);
  const [labelFilters, setLabelFilters] = useState<Set<string>>(loadLabelFilters);

  // Persist PR state filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PR_STATE_FILTERS, JSON.stringify([...prStateFilters]));
    } catch {
      // Ignore storage failures (e.g. quota exceeded, private browsing)
    }
  }, [prStateFilters]);

  // Persist label filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LABEL_FILTERS, JSON.stringify([...labelFilters]));
    } catch { /* ignore */ }
  }, [labelFilters]);

  const toggleLabelFilter = useCallback((label: string) => {
    setLabelFilters((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
    setCursorIndex(0);
  }, []);

  const clearLabelFilters = useCallback(() => {
    setLabelFilters(new Set());
    setCursorIndex(0);
  }, []);

  const togglePRStateFilter = useCallback((key: PRStateFilterKey) => {
    setPRStateFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setCursorIndex(0);
  }, []);

  const filtered = useMemo(() => {
    let result = [...items];

    if (itemTypeFilter === 'prs') {
      result = result.filter((item) => item.kind === 'pr');
    } else if (itemTypeFilter === 'issues') {
      result = result.filter((item) => item.kind === 'issue');
    }

    result = filterByPRState(result, prStateFilters);

    // Label filter: show items matching any selected label
    if (labelFilters.size > 0) {
      result = result.filter((item) =>
        item.labels.some((l) => labelFilters.has(l.name))
      );
    }

    if (filter === 'failing') {
      result = result.filter((item) => item.kind === 'pr' && item.ciStatus === 'failure');
    } else if (filter === 'needs-review') {
      result = result.filter(
        (item) =>
          item.kind === 'pr' &&
          (item.reviewState.changesRequested > 0 || item.reviewState.commentCount > 0)
      );
    } else if (filter === 'review-requested') {
      result = result.filter(
        (item) => item.kind === 'pr' && item.isRequestedReviewer
      );
    } else if (filter === 'new-activity') {
      result = result.filter((pr) => isUnseen(pr));
    } else if (filter === 'merge-ready') {
      result = result.filter((item) => isMergeReady(item));
    } else if (filter === 'stale') {
      result = result.filter((item) => isStale(item, staleDays));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((pr) => {
        const repoFullName = `${pr.repo.owner}/${pr.repo.name}`.toLowerCase();
        return (
          pr.title.toLowerCase().includes(q) ||
          pr.author.toLowerCase().includes(q) ||
          repoFullName.includes(q) ||
          `#${pr.number}`.includes(q)
        );
      });
    }

    const dir = sortDirection === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case 'updated':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'created':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'repo': {
          const repoA = `${a.repo.owner}/${a.repo.name}`;
          const repoB = `${b.repo.owner}/${b.repo.name}`;
          cmp = repoA.localeCompare(repoB);
          break;
        }
        case 'status': {
          const priority: Record<string, number> = {
            failure: 0, pending: 1, mixed: 2, none: 3, success: 4,
          };
          const aStatus = a.kind === 'pr' ? a.ciStatus : 'none';
          const bStatus = b.kind === 'pr' ? b.ciStatus : 'none';
          cmp = (priority[aStatus] ?? 3) - (priority[bStatus] ?? 3);
          break;
        }
        case 'number':
          cmp = a.number - b.number;
          break;
        case 'state':
          cmp = a.state.localeCompare(b.state);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'author':
          cmp = a.author.localeCompare(b.author);
          break;
        case 'assignees': {
          const assigneesA = 'assignees' in a ? a.assignees.join(',') : '';
          const assigneesB = 'assignees' in b ? b.assignees.join(',') : '';
          cmp = assigneesA.localeCompare(assigneesB);
          break;
        }
        case 'reviews': {
          const rsA = a.kind === 'pr' ? a.reviewState : { approvals: 0, changesRequested: 0, commentCount: 0 };
          const rsB = b.kind === 'pr' ? b.reviewState : { approvals: 0, changesRequested: 0, commentCount: 0 };
          const scoreA = rsA.approvals * 10 - rsA.changesRequested * 10 + rsA.commentCount;
          const scoreB = rsB.approvals * 10 - rsB.changesRequested * 10 + rsB.commentCount;
          cmp = scoreA - scoreB;
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * dir;
    });

    return result;
  }, [items, filter, sort, sortDirection, searchQuery, itemTypeFilter, prStateFilters, labelFilters, isUnseen, staleDays]);

  // Clamp cursor when filtered list shrinks
  useEffect(() => {
    setCursorIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const moveCursor = useCallback(
    (delta: number) => {
      setCursorIndex((prev) => {
        const next = prev + delta;
        if (next < 0) return 0;
        if (next >= filtered.length) return Math.max(0, filtered.length - 1);
        return next;
      });
    },
    [filtered.length]
  );

  const cycleFilter = useCallback(() => {
    setFilter((prev) => {
      const idx = FILTER_CYCLE.indexOf(prev);
      return FILTER_CYCLE[(idx + 1) % FILTER_CYCLE.length];
    });
    setCursorIndex(0);
  }, []);

  const cycleSort = useCallback(() => {
    setSort((prev) => {
      const idx = SORT_CYCLE.indexOf(prev);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  }, []);

  const handleSetFilter = useCallback((mode: FilterMode) => {
    setFilter(mode);
    setCursorIndex(0);
  }, []);

  const handleSetSort = useCallback((key: SortMode) => {
    setSort((prev) => {
      if (prev === key) {
        setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortDirection('desc');
      }
      return key;
    });
  }, []);

  const cycleItemType = useCallback(() => {
    setItemTypeFilter((prev) => {
      const idx = ITEM_TYPE_CYCLE.indexOf(prev);
      return ITEM_TYPE_CYCLE[(idx + 1) % ITEM_TYPE_CYCLE.length];
    });
    setCursorIndex(0);
  }, []);

  // Collect all unique labels from items for the filter UI
  const availableLabels = useMemo((): LabelInfo[] => {
    const labelMap = new Map<string, LabelInfo>();
    for (const item of items) {
      for (const label of item.labels) {
        if (!labelMap.has(label.name)) {
          labelMap.set(label.name, label);
        }
      }
    }
    return Array.from(labelMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return {
    filtered,
    filter,
    sort,
    sortDirection,
    searchQuery,
    setSearchQuery,
    itemTypeFilter,
    setItemTypeFilter,
    cursorIndex,
    setCursorIndex,
    prStateFilters,
    togglePRStateFilter,
    labelFilters,
    toggleLabelFilter,
    clearLabelFilters,
    availableLabels,
    moveCursor,
    cycleFilter,
    cycleSort,
    handleSetFilter,
    handleSetSort,
    cycleItemType,
  };
}
