export interface RepoConfig {
  owner: string;
  name: string;
  enabled: boolean;
}

export interface Config {
  repos: RepoConfig[];
  defaults: {
    sort: SortMode;
    filter: FilterMode;
    maxPrsPerRepo: number;
    autoRefreshInterval: number; // seconds, 0 = disabled
  };
}

export type CIStatus = 'success' | 'failure' | 'pending' | 'none' | 'mixed';
export type SortMode = 'updated' | 'created' | 'repo' | 'status' | 'number' | 'state' | 'title' | 'author' | 'reviews';
export type SortDirection = 'asc' | 'desc';
export type FilterMode = 'all' | 'failing' | 'needs-review';
export type ItemTypeFilter = 'both' | 'prs' | 'issues';
export type ViewMode = 'list' | 'repos' | 'help';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface RepoFetchError {
  repo: string;
  message: string;
}

export interface ReviewState {
  approvals: number;
  changesRequested: number;
  commentCount: number;
}

export type PRState = 'open' | 'closed' | 'merged';

export interface LabelInfo {
  name: string;
  color: string;
  description?: string;
}

export interface PRItem {
  kind: 'pr';
  id: number;
  number: number;
  title: string;
  author: string;
  repo: { owner: string; name: string };
  url: string;
  updatedAt: string;
  createdAt: string;
  ciStatus: CIStatus;
  reviewState: ReviewState;
  draft: boolean;
  state: PRState;
}

export interface IssueItem {
  kind: 'issue';
  id: number;
  number: number;
  title: string;
  author: string;
  repo: { owner: string; name: string };
  url: string;
  updatedAt: string;
  createdAt: string;
  state: 'open' | 'closed';
  labels: LabelInfo[];
  assignees: string[];
  milestone: string | null;
}

export type DashboardItem = PRItem | IssueItem;
