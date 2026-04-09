import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { DashboardItem } from '../../../shared/types.js';
import { timeAgo } from '../../../shared/utils/timeAgo.js';
import { isMergeReady } from '../../../shared/utils/mergeReady.js';
import { LabelBadge } from './LabelBadge';

const CI_COLORS: Record<string, string> = {
  success: '#3fb950',
  failure: '#f85149',
  pending: '#d29922',
  mixed: '#d29922',
  none: '#484f58',
};

interface PRListItemProps {
  item: DashboardItem;
  isUnseen: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function PRListItem({ item, isUnseen, onPress, onLongPress }: PRListItemProps) {
  const ciStatus = item.kind === 'pr' ? item.ciStatus : 'none';
  const ciColor = CI_COLORS[ciStatus] ?? CI_COLORS.none;
  const isDraft = item.kind === 'pr' && item.draft;
  const mergeReady = isMergeReady(item);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* CI status bar */}
      <View style={[styles.ciBar, { backgroundColor: ciColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            {isUnseen && <View style={styles.unseenDot} />}
            <Text style={[styles.title, isDraft && styles.draftTitle]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          {mergeReady && (
            <View style={styles.mergeReadyBadge}>
              <Text style={styles.mergeReadyText}>Ready</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {item.repo.owner}/{item.repo.name}
          </Text>
          <Text style={styles.metaSep}> #{item.number}</Text>
          <Text style={styles.metaSep}> · {timeAgo(item.updatedAt)}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.badges}>
            {isDraft && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>Draft</Text>
              </View>
            )}
            {item.kind === 'pr' && item.state === 'merged' && (
              <View style={styles.mergedBadge}>
                <Text style={styles.mergedBadgeText}>Merged</Text>
              </View>
            )}
            {item.kind === 'issue' && (
              <View style={styles.issueBadge}>
                <Text style={styles.issueBadgeText}>Issue</Text>
              </View>
            )}
          </View>

          {item.kind === 'pr' && (
            <View style={styles.reviewInfo}>
              {item.reviewState.approvals > 0 && (
                <Text style={styles.approvals}>
                  +{item.reviewState.approvals}
                </Text>
              )}
              {item.reviewState.changesRequested > 0 && (
                <Text style={styles.changesRequested}>
                  -{item.reviewState.changesRequested}
                </Text>
              )}
              {item.reviewState.commentCount > 0 && (
                <Text style={styles.comments}>
                  {item.reviewState.commentCount}c
                </Text>
              )}
            </View>
          )}

          <Text style={styles.author}>{item.author}</Text>
        </View>

        {/* Label badges */}
        {item.labels.length > 0 && (
          <View style={styles.labelRow}>
            {item.labels.map((label) => (
              <LabelBadge key={label.name} label={label} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    minHeight: 72,
  },
  ciBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  unseenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#58a6ff',
    marginRight: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e6edf3',
    flex: 1,
  },
  draftTitle: {
    color: '#7d8590',
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  meta: {
    fontSize: 12,
    color: '#7d8590',
  },
  metaSep: {
    fontSize: 12,
    color: '#484f58',
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  draftBadge: {
    backgroundColor: '#30363d',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  draftBadgeText: {
    fontSize: 11,
    color: '#7d8590',
    fontWeight: '500',
  },
  mergedBadge: {
    backgroundColor: '#8957e530',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mergedBadgeText: {
    fontSize: 11,
    color: '#a371f7',
    fontWeight: '500',
  },
  issueBadge: {
    backgroundColor: '#238636',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  issueBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  mergeReadyBadge: {
    backgroundColor: '#238636',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mergeReadyText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  reviewInfo: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  approvals: {
    fontSize: 12,
    color: '#3fb950',
    fontWeight: '600',
  },
  changesRequested: {
    fontSize: 12,
    color: '#f85149',
    fontWeight: '600',
  },
  comments: {
    fontSize: 12,
    color: '#d29922',
  },
  author: {
    fontSize: 12,
    color: '#484f58',
    marginLeft: 'auto',
  },
});
