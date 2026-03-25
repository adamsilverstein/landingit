import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoRefreshOptions {
  /** Refresh interval in seconds. 0 means disabled. */
  intervalSeconds: number;
  /** When true, the countdown is paused (e.g. modal open). */
  paused: boolean;
  /** Called when the countdown reaches zero. */
  onRefresh: () => void;
}

interface UseAutoRefreshResult {
  /** Seconds remaining until next refresh, or null if disabled. */
  secondsLeft: number | null;
  /** Reset the countdown (e.g. after a manual refresh). */
  reset: () => void;
}

export function useAutoRefresh({
  intervalSeconds,
  paused,
  onRefresh,
}: UseAutoRefreshOptions): UseAutoRefreshResult {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    intervalSeconds > 0 ? intervalSeconds : null
  );

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Reset countdown when interval changes
  useEffect(() => {
    setSecondsLeft(intervalSeconds > 0 ? intervalSeconds : null);
  }, [intervalSeconds]);

  // Tick every second when not paused and not disabled
  useEffect(() => {
    if (paused || intervalSeconds <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          onRefreshRef.current();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [paused, intervalSeconds]);

  const reset = useCallback(() => {
    setSecondsLeft(intervalSeconds > 0 ? intervalSeconds : null);
  }, [intervalSeconds]);

  return { secondsLeft, reset };
}
