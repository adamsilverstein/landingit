import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LabelInfo } from '../../../shared/types.js';
import { contrastColor } from '../../../shared/utils/contrastColor.js';

interface LabelBadgeProps {
  label: LabelInfo;
}

export function LabelBadge({ label }: LabelBadgeProps) {
  const bg = `#${label.color}`;
  const fg = contrastColor(label.color);

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginTop: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
