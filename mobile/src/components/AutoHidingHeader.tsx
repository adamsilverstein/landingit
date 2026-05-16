import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { NAV_BAR_HEIGHT } from '../hooks/useAutoHidingHeader';

interface Props {
  title: string;
  translateY: Animated.Value;
  statusBarHeight: number;
}

/**
 * Overlay header that mimics the React Navigation native-stack header but can
 * animate offscreen on scroll. The status-bar inset is always rendered so the
 * battery/clock area has an opaque background even while the title slides
 * away.
 */
export function AutoHidingHeader({ title, translateY, statusBarHeight }: Props) {
  return (
    <View
      style={[styles.container, { height: statusBarHeight + NAV_BAR_HEIGHT }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.navBar,
          {
            top: statusBarHeight,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text
          style={styles.title}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </Animated.View>
      {/* Render the status-bar inset last so it sits above the navBar and
          hides the title when the navBar slides up behind it. */}
      <View style={[styles.statusBar, { height: statusBarHeight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161b22',
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: NAV_BAR_HEIGHT,
    backgroundColor: '#161b22',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262d',
  },
  title: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '600',
  },
});
