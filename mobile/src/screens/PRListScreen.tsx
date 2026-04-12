import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, Text, TextInput, StyleSheet, RefreshControl, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DashboardItem, OwnershipFilter } from '../../../shared/types.js';
import { useGithubData } from '../../../shared/hooks/useGithubData.js';
import { useFilteredItems } from '../../../shared/hooks/useFilteredItems.js';
import { useLastSeen } from '../../../shared/hooks/useLastSeen.js';
import { useAutoRefresh } from '../../../shared/hooks/useAutoRefresh.js';
import { asyncStorageAdapter } from '../storage/asyncStorageAdapter';
import { useApp } from '../context/AppContext';
import { useConfigContext } from '../context/ConfigContext';
import { useBadge } from '../context/BadgeContext';
import { PRListItem } from '../components/PRListItem';
import { FilterBar } from '../components/FilterBar';
import { LabelFilterModal } from '../components/LabelFilterModal';
import type { DashboardStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DashboardStackParamList, 'PRList'>;

export function PRListScreen({ navigation }: Props) {
  const { octokit, username } = useApp();
  const { config, enabledRepos, toggleRepoByName } = useConfigContext();
  const { setUnseenCount } = useBadge();
  const { markSeen, isUnseen } = useLastSeen(asyncStorageAdapter);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('created');
  const [labelModalVisible, setLabelModalVisible] = useState(false);

  const { items, loading, error, failedRepos, lastRefresh, refresh } = useGithubData(
    octokit,
    enabledRepos,
    config.defaults.maxPrsPerRepo,
    ownershipFilter !== 'everyone' ? username : null,
    username,
    ownershipFilter
  );

  const {
    filtered, filter, sort, sortDirection,
    handleSetFilter, handleSetSort,
    searchQuery, setSearchQuery,
    itemTypeFilter, setItemTypeFilter,
    prStateFilters, togglePRStateFilter,
    labelFilters, toggleLabelFilter, clearLabelFilters, availableLabels,
  } = useFilteredItems({
    items,
    defaultFilter: config.defaults.filter,
    defaultSort: config.defaults.sort,
    isUnseen,
    staleDays: config.defaults.staleDays,
    storage: asyncStorageAdapter,
  });

  const { secondsLeft, reset: resetAutoRefresh } = useAutoRefresh({
    intervalSeconds: config.defaults.autoRefreshInterval,
    paused: false,
    onRefresh: refresh,
  });

  // Update tab bar badge with unseen count
  const unseenCount = useMemo(() => items.filter((item) => isUnseen(item)).length, [items, isUnseen]);
  useEffect(() => { setUnseenCount(unseenCount); }, [unseenCount, setUnseenCount]);

  // Hidden repos for quick-restore
  const hiddenRepos = useMemo(() => config.repos.filter((r) => !r.enabled), [config.repos]);

  const handleRefresh = useCallback(() => {
    refresh();
    resetAutoRefresh();
  }, [refresh, resetAutoRefresh]);

  const handlePress = useCallback((item: DashboardItem) => {
    markSeen(item);
    if (item.kind === 'pr') {
      navigation.navigate('PRDetail', { item });
    } else {
      Linking.openURL(item.url);
    }
  }, [markSeen, navigation]);

  const handleLongPress = useCallback((item: DashboardItem) => {
    markSeen(item);
    Linking.openURL(item.url);
  }, [markSeen]);

  const renderItem = useCallback(({ item }: { item: DashboardItem }) => (
    <PRListItem
      item={item}
      isUnseen={isUnseen(item)}
      onPress={() => handlePress(item)}
      onLongPress={() => handleLongPress(item)}
    />
  ), [isUnseen, handlePress, handleLongPress]);

  const keyExtractor = useCallback((item: DashboardItem) => `${item.kind}-${item.id}`, []);

  const headerInfo = useMemo(() => {
    const parts: string[] = [];
    if (enabledRepos.length > 0) parts.push(`${enabledRepos.length} repos`);
    parts.push(`${filtered.length} items`);
    if (filter !== 'all') parts.push(filter);
    if (lastRefresh) {
      const ago = Math.round((Date.now() - lastRefresh.getTime()) / 60000);
      parts.push(ago < 1 ? 'just now' : `${ago}m ago`);
    }
    if (secondsLeft != null) {
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      parts.push(`next ${m}:${s.toString().padStart(2, '0')}`);
    }
    return parts.join(' \u00b7 ');
  }, [enabledRepos.length, filtered.length, filter, lastRefresh, secondsLeft]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search PRs..."
          placeholderTextColor="#484f58"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter & sort chips */}
      <FilterBar
        activeFilter={filter}
        activeSort={sort}
        sortDirection={sortDirection}
        onFilterChange={handleSetFilter}
        onSortChange={handleSetSort}
        ownershipFilter={ownershipFilter}
        onOwnershipChange={setOwnershipFilter}
        username={username}
        itemTypeFilter={itemTypeFilter}
        onItemTypeChange={setItemTypeFilter}
        prStateFilters={prStateFilters}
        onTogglePRState={togglePRStateFilter}
        labelFilterCount={labelFilters.size}
        onLabelFilterPress={() => setLabelModalVisible(true)}
        hiddenRepos={hiddenRepos}
        onRestoreRepo={toggleRepoByName}
      />

      <Text style={styles.headerInfo}>{headerInfo}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {failedRepos.length > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Failed to fetch: {failedRepos.map((r) => r.repo).join(', ')}
          </Text>
        </View>
      )}

      {enabledRepos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No repositories configured</Text>
          <Text style={styles.emptySubtitle}>
            Go to Settings to add repositories to monitor.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor="#58a6ff"
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptySubtitle}>
                  Pull to refresh or adjust your filters.
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <LabelFilterModal
        visible={labelModalVisible}
        onClose={() => setLabelModalVisible(false)}
        labels={availableLabels}
        selectedLabels={labelFilters}
        onToggle={toggleLabelFilter}
        onClear={clearLabelFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  searchRow: {
    backgroundColor: '#161b22',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#e6edf3',
  },
  headerInfo: {
    fontSize: 12,
    color: '#7d8590',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  error: {
    color: '#f85149',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8514920',
  },
  warningBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#d2992220',
  },
  warningText: {
    color: '#d29922',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e6edf3',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7d8590',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
