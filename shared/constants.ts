/** Storage keys — single source of truth to prevent key collisions. */
export const STORAGE_KEYS = {
  CONFIG: 'gh-dashboard-config',
  TOKEN: 'gh-dashboard-token',
  THEME: 'gh-dashboard-theme',
  LAST_SEEN: 'gh-dashboard-last-seen',
  PR_STATE_FILTERS: 'gh-dashboard-pr-state-filters',
  DETAIL_CACHE: 'gh-dashboard-detail-cache',
  COLUMN_SETTINGS: 'gh-dashboard-column-settings',
  LABEL_FILTERS: 'gh-dashboard-label-filters',
  HIDE_MY_REPLIES: 'gh-dashboard-hide-my-replies',
  NOTIFICATION_RULES: 'gh-dashboard-notification-rules',
  // v2 bump: pre-v2 fetches sent If-Modified-Since on the paginated requests
  // themselves, which GitHub treats as a *filter* on /notifications — so the
  // stored Last-Modified came from a partial response and could not be reused
  // safely. v2 sends If-Modified-Since only as a probe; ignoring the old key
  // forces one unconditional refetch after upgrade to recover the full inbox.
  NOTIFICATIONS_LAST_MODIFIED: 'gh-dashboard-notifications-last-modified-v2',
} as const;
