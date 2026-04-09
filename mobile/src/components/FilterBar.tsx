import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { FilterMode, SortMode, SortDirection, OwnershipFilter, ItemTypeFilter, PRStateFilterKey, RepoConfig } from '../../../shared/types.js';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'failing', label: 'Failing' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'review-requested', label: 'Requested' },
  { key: 'new-activity', label: 'New' },
  { key: 'merge-ready', label: 'Ready' },
  { key: 'stale', label: 'Stale' },
];

const SORTS: { key: SortMode; label: string }[] = [
  { key: 'updated', label: 'Updated' },
  { key: 'created', label: 'Created' },
  { key: 'repo', label: 'Repo' },
  { key: 'status', label: 'Status' },
  { key: 'author', label: 'Author' },
  { key: 'reviews', label: 'Reviews' },
];

const OWNERSHIP: { key: OwnershipFilter; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'involved', label: 'Involved' },
  { key: 'everyone', label: 'Everyone' },
];

const ITEM_TYPES: { key: ItemTypeFilter; label: string }[] = [
  { key: 'both', label: 'Both' },
  { key: 'prs', label: 'PRs' },
  { key: 'issues', label: 'Issues' },
];

const PR_STATES: { key: PRStateFilterKey; label: string; color: string; activeColor: string }[] = [
  { key: 'draft', label: 'Draft', color: '#484f58', activeColor: '#d29922' },
  { key: 'open', label: 'Open', color: '#484f58', activeColor: '#3fb950' },
  { key: 'merged', label: 'Merged', color: '#484f58', activeColor: '#a371f7' },
];

interface FilterBarProps {
  activeFilter: FilterMode;
  activeSort: SortMode;
  sortDirection: SortDirection;
  onFilterChange: (filter: FilterMode) => void;
  onSortChange: (sort: SortMode) => void;
  // Ownership
  ownershipFilter: OwnershipFilter;
  onOwnershipChange: (ownership: OwnershipFilter) => void;
  username: string | null;
  // Item type
  itemTypeFilter: ItemTypeFilter;
  onItemTypeChange: (type: ItemTypeFilter) => void;
  // PR state
  prStateFilters: Set<PRStateFilterKey>;
  onTogglePRState: (key: PRStateFilterKey) => void;
  // Labels
  labelFilterCount: number;
  onLabelFilterPress: () => void;
  // Hidden repos
  hiddenRepos: RepoConfig[];
  onRestoreRepo: (owner: string, name: string) => void;
}

export function FilterBar({
  activeFilter, activeSort, sortDirection,
  onFilterChange, onSortChange,
  ownershipFilter, onOwnershipChange, username,
  itemTypeFilter, onItemTypeChange,
  prStateFilters, onTogglePRState,
  labelFilterCount, onLabelFilterPress,
  hiddenRepos, onRestoreRepo,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      {/* Ownership + Item type row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {OWNERSHIP.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.miniChip, o.key === ownershipFilter && styles.miniChipActive]}
            onPress={() => onOwnershipChange(o.key)}
          >
            <Text style={[styles.miniChipText, o.key === ownershipFilter && styles.miniChipTextActive]}>
              {o.label}{o.key !== 'everyone' && username ? ` @${username}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.separator} />
        {ITEM_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.miniChip, t.key === itemTypeFilter && styles.miniChipActive]}
            onPress={() => onItemTypeChange(t.key)}
          >
            <Text style={[styles.miniChipText, t.key === itemTypeFilter && styles.miniChipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* PR state pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {PR_STATES.map((s) => {
          const active = prStateFilters.has(s.key);
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.statePill, active && { borderColor: s.activeColor, backgroundColor: s.activeColor + '20' }]}
              onPress={() => onTogglePRState(s.key)}
            >
              <View style={[styles.stateDot, { backgroundColor: active ? s.activeColor : s.color }]} />
              <Text style={[styles.statePillText, active && { color: s.activeColor }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter chips + Labels button */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, f.key === activeFilter && styles.chipActive]}
            onPress={() => onFilterChange(f.key)}
          >
            <Text style={[styles.chipText, f.key === activeFilter && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, labelFilterCount > 0 && styles.chipActive]}
          onPress={onLabelFilterPress}
        >
          <Text style={[styles.chipText, labelFilterCount > 0 && styles.chipTextActive]}>
            Labels{labelFilterCount > 0 ? ` (${labelFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
        {hiddenRepos.length > 0 && hiddenRepos.map((repo) => (
          <TouchableOpacity
            key={`${repo.owner}/${repo.name}`}
            style={styles.hiddenChip}
            onPress={() => onRestoreRepo(repo.owner, repo.name)}
          >
            <Text style={styles.hiddenChipText}>
              +{repo.owner}/{repo.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {SORTS.map((s) => {
          const isActive = s.key === activeSort;
          const arrow = isActive ? (sortDirection === 'desc' ? ' \u2193' : ' \u2191') : '';
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, isActive && styles.sortChipActive]}
              onPress={() => onSortChange(s.key)}
            >
              <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                {s.label}{arrow}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    paddingVertical: 6,
  },
  row: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  separator: {
    width: 1,
    backgroundColor: '#30363d',
    marginHorizontal: 6,
    marginVertical: 4,
  },
  // Ownership / item type chips (smaller)
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderRadius: 4,
  },
  miniChipActive: {
    backgroundColor: '#30363d',
  },
  miniChipText: {
    fontSize: 12,
    color: '#484f58',
  },
  miniChipTextActive: {
    color: '#e6edf3',
  },
  // PR state pills
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statePillText: {
    fontSize: 12,
    color: '#7d8590',
    fontWeight: '500',
  },
  // Filter chips
  chip: {
    backgroundColor: '#21262d',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  chipActive: {
    backgroundColor: '#388bfd26',
    borderColor: '#58a6ff',
  },
  chipText: {
    fontSize: 13,
    color: '#7d8590',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#58a6ff',
  },
  // Hidden repo chips
  hiddenChip: {
    backgroundColor: '#d2992220',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#d29922',
  },
  hiddenChipText: {
    fontSize: 12,
    color: '#d29922',
    fontWeight: '500',
  },
  // Sort chips
  sortLabel: {
    fontSize: 12,
    color: '#484f58',
    alignSelf: 'center',
    marginRight: 6,
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderRadius: 4,
  },
  sortChipActive: {
    backgroundColor: '#30363d',
  },
  sortChipText: {
    fontSize: 12,
    color: '#484f58',
  },
  sortChipTextActive: {
    color: '#e6edf3',
  },
});
