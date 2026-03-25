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
  };
}

export type CIStatus = 'success' | 'failure' | 'pending' | 'none' | 'mixed';
export type SortMode = 'updated' | 'created' | 'repo' | 'status' | 'number' | 'state' | 'title' | 'author' | 'reviews';
export type SortDirection = 'asc' | 'desc';
export type FilterMode = 'all' | 'failing' | 'needs-review';
export type ViewMode = 'list' | 'repos' | 'help';

export interface ReviewState {
  approvals: number;
  changesRequested: number;
  commentCount: number;
}

export type PRState = 'open' | 'closed' | 'merged';

export interface PRItem {
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
