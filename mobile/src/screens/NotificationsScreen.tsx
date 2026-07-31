import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ScrollView,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  NotificationItem,
  NotificationRule,
} from '../../../shared/types.js';
import { matchNotifications } from '../../../shared/utils/notificationMatch.js';
import { notificationHtmlUrl } from '../../../shared/utils/notificationHtmlUrl.js';
import { notificationsMatchingRule } from '../../../shared/hooks/useNotificationRules.js';
import { timeAgo } from '../../../shared/utils/timeAgo.js';
import { useApp } from '../context/AppContext';
import { useNotificationsContext } from '../context/NotificationsContext';
import { AutoHidingHeader } from '../components/AutoHidingHeader';
import { useAutoHidingHeader } from '../hooks/useAutoHidingHeader';
import type { NotificationsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<NotificationsStackParamList, 'Notifications'>;

function reasonLabel(reason: NotificationItem['reason']): string {
  switch (reason) {
    case 'review_requested': return 'review';
    case 'ci_activity':      return 'CI';
    case 'state_change':     return 'state';
    case 'team_mention':     return 'team';
    case 'security_alert':   return 'security';
    default:                 return reason;
  }
}

export function NotificationsScreen({ navigation }: Props) {
  const { username } = useApp();
  const {
    notifications,
    loading,
    error,
    refresh,
    markThreadRead,
    markThreadsRead,
    rules,
    applyRule,
  } = useNotificationsContext();
  // Items live in the dashboard context and aren't shared here — mobile
  // notifications view doesn't cross-reference with the PR table list
  // since they're on different tabs. We just compute working-set against
  // the notifications' own metadata: authored / requested-reviewer signals
  // aren't on the notification, so this is a no-op fallback for mobile.
  const matches = useMemo(
    () => matchNotifications(notifications, [], username),
    [notifications, username]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unreadOnly, setUnreadOnly] = useState(true);
  const {
    translateY,
    statusBarHeight,
    navBarHeight,
    totalHeaderHeight,
    onScroll,
  } = useAutoHidingHeader();

  const visible = useMemo(() => {
    let result = matches;
    if (unreadOnly) result = result.filter((m) => m.notification.unread);
    result = [...result].sort(
      (a, b) =>
        new Date(b.notification.updatedAt).getTime() -
        new Date(a.notification.updatedAt).getTime()
    );
    return result;
  }, [matches, unreadOnly]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handlePress = useCallback(
    async (n: NotificationItem) => {
      // Tap = open + mark read (mirrors GitHub mobile behavior).
      Linking.openURL(notificationHtmlUrl(n)).catch(() => {});
      if (n.unread) await markThreadRead(n.id);
    },
    [markThreadRead]
  );

  const bulkMarkRead = async () => {
    const ids = [...selectedIds];
    clearSelection();
    await markThreadsRead(ids);
  };

  const renderItem = useCallback(
    ({
      item: m,
    }: {
      item: ReturnType<typeof matchNotifications>[number];
    }) => {
      const selected = selectedIds.has(m.notification.id);
      return (
        <TouchableOpacity
          onPress={() =>
            selectedIds.size > 0
              ? toggleSelected(m.notification.id)
              : handlePress(m.notification)
          }
          onLongPress={() => toggleSelected(m.notification.id)}
          style={[
            styles.row,
            selected && styles.rowSelected,
            !m.notification.unread && styles.rowRead,
          ]}
        >
          <View style={styles.rowHeader}>
            {m.notification.unread && <View style={styles.unreadDot} />}
            <Text
              style={[styles.title, !m.notification.unread && styles.titleRead]}
              numberOfLines={2}
            >
              {m.notification.subject.title}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.repo}>
              {m.notification.repo.owner}/{m.notification.repo.name}
            </Text>
            {m.notification.subjectNumber != null && (
              <Text style={styles.number}>#{m.notification.subjectNumber}</Text>
            )}
            <Text style={styles.reason}>{reasonLabel(m.notification.reason)}</Text>
            <Text style={styles.time}>{timeAgo(m.notification.updatedAt)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, handlePress]
  );

  return (
    <View style={styles.container}>
      <AutoHidingHeader
        title="Notifications"
        translateY={translateY}
        statusBarHeight={statusBarHeight}
      />

      <Animated.View
        style={[
          styles.scrollWrapper,
          {
            paddingTop: totalHeaderHeight,
            bottom: -navBarHeight,
            transform: [{ translateY }],
          },
        ]}
      >
        <ScrollView
          horizontal
          style={styles.rulesBar}
          contentContainerStyle={styles.rulesBarContent}
          showsHorizontalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => setUnreadOnly((p) => !p)}
            style={[styles.chip, unreadOnly && styles.chipActive]}
          >
            <Text style={styles.chipText}>{unreadOnly ? 'Unread' : 'All'}</Text>
          </TouchableOpacity>
          {rules
            .filter((r) => r.enabled)
            .map((rule: NotificationRule) => {
              const count = notificationsMatchingRule(rule, notifications).filter(
                (n) => n.unread
              ).length;
              return (
                <TouchableOpacity
                  key={rule.id}
                  onPress={() => applyRule(rule)}
                  disabled={count === 0}
                  style={[styles.chip, count === 0 && styles.chipDisabled]}
                >
                  <Text style={styles.chipText}>
                    {rule.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationRules')}
            style={styles.chip}
          >
            <Text style={styles.chipText}>⚙ Rules</Text>
          </TouchableOpacity>
        </ScrollView>

        {error && <Text style={styles.error}>{error}</Text>}

        <FlatList
          data={visible}
          renderItem={renderItem}
          keyExtractor={(m) => m.notification.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: navBarHeight }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor="#58a6ff"
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {unreadOnly ? '🎉 Inbox zero' : 'No notifications'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {unreadOnly
                    ? 'No unread notifications. Pull to refresh.'
                    : 'Pull to refresh.'}
                </Text>
              </View>
            ) : null
          }
        />
      </Animated.View>

      {selectedIds.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selectedIds.size} selected</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity onPress={clearSelection}>
              <Text style={styles.linkBtn}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={bulkMarkRead} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>
                Mark {selectedIds.size} read
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', overflow: 'hidden' },
  scrollWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  rulesBar: { backgroundColor: '#161b22', maxHeight: 44, flexGrow: 0 },
  rulesBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  chip: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  chipActive: { backgroundColor: '#1f2937', borderColor: '#58a6ff' },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: '#e6edf3', fontSize: 12 },
  error: {
    color: '#f85149',
    fontSize: 13,
    padding: 8,
    backgroundColor: '#f8514920',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    backgroundColor: '#0d1117',
  },
  rowSelected: { backgroundColor: '#1f2937' },
  rowRead: { opacity: 0.6 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#58a6ff',
  },
  title: { fontSize: 14, color: '#e6edf3', flex: 1 },
  titleRead: { color: '#7d8590' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  repo: {
    fontSize: 11,
    color: '#7d8590',
    fontFamily: 'Menlo',
  },
  number: { fontSize: 11, color: '#6e7681' },
  reason: {
    fontSize: 10,
    color: '#7d8590',
    backgroundColor: '#21262d',
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  time: { fontSize: 11, color: '#6e7681', marginLeft: 'auto' },
  emptyState: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 18, color: '#e6edf3', fontWeight: '600' },
  emptySubtitle: {
    fontSize: 14,
    color: '#7d8590',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#161b22',
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  bulkCount: { color: '#e6edf3', fontSize: 13 },
  bulkActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkBtn: { color: '#58a6ff', fontSize: 13 },
  primaryBtn: {
    backgroundColor: '#58a6ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
