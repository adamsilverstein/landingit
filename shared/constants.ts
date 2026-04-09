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
} as const;
