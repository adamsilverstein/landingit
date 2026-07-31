import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Standard iOS navigation bar height. Excludes the status-bar inset, which is
// added separately via the safe-area top inset so the nav bar sits below the
// notch/dynamic island.
export const NAV_BAR_HEIGHT = 44;

// Minimum pixel delta before we react. Small touches (tap, finger jitter) can
// fire scroll events with tiny deltas; ignoring them prevents the header from
// flickering when the user isn't actually intending to scroll.
const SCROLL_THRESHOLD = 6;

/**
 * Drives the auto-hiding nav bar: shows when the user scrolls up, hides when
 * scrolling down past a small threshold, and always shows when near the top.
 *
 * Returns the animated translateY that both the header overlay and the
 * scrolling content wrapper should bind to, along with the onScroll handler to
 * attach to the FlatList/ScrollView.
 */
export function useAutoHidingHeader() {
  const insets = useSafeAreaInsets();

  // Status-bar inset stays visible; only the nav bar slides offscreen.
  const navBarHeight = NAV_BAR_HEIGHT;
  const statusBarHeight = insets.top;

  const translateY = useRef(new Animated.Value(0)).current;
  const prevScrollY = useRef(0);
  const hidden = useRef(false);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const delta = y - prevScrollY.current;
      prevScrollY.current = y;

      if (y <= 0) {
        if (hidden.current) {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
          hidden.current = false;
        }
        return;
      }

      if (delta > SCROLL_THRESHOLD && !hidden.current) {
        Animated.timing(translateY, {
          toValue: -navBarHeight,
          duration: 200,
          useNativeDriver: true,
        }).start();
        hidden.current = true;
      } else if (delta < -SCROLL_THRESHOLD && hidden.current) {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
        hidden.current = false;
      }
    },
    [translateY, navBarHeight]
  );

  return {
    translateY,
    navBarHeight,
    statusBarHeight,
    totalHeaderHeight: statusBarHeight + navBarHeight,
    onScroll,
  };
}
