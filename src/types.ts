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
    staleDays: number; // days of inactivity before an item is considered stale
  };
}

export type CIStatus = 'success' | 'failure' | 'pending' | 'none' | 'mixed';
export type SortMode = 'updated' | 'created' | 'repo' | 'status' | 'number' | 'state' | 'title' | 'author' | 'assignees' | 'reviews';
export type SortDirection = 'asc' | 'desc';
export type FilterMode = 'all' | 'failing' | 'needs-review' | 'review-requested' | 'new-activity' | 'merge-ready' | 'stale';
export type ItemTypeFilter = 'both' | 'prs' | 'issues';
export type OwnershipFilter = 'everyone' | 'created' | 'assigned' | 'involved';
export type ViewMode = 'list' | 'repos' | 'help' | 'detail';
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
export type PRStateFilterKey = 'draft' | 'open' | 'merged';

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
  isRequestedReviewer: boolean;
  assignees: string[];
  labels: LabelInfo[];
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

export interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface Reviewer {
  login: string;
  state: string;
}

export type TimelineEventType =
  | 'commented'
  | 'reviewed'
  | 'committed'
  | 'force-pushed'
  | 'merged'
  | 'closed'
  | 'reopened'
  | 'renamed'
  | 'labeled'
  | 'unlabeled'
  | 'assigned'
  | 'unassigned'
  | 'review_requested'
  | 'ready_for_review'
  | 'convert_to_draft'
  | 'head_ref_deleted'
  | 'unknown';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor: string;
  createdAt: string;
  /** Comment or review body (markdown) */
  body?: string;
  /** Review state: APPROVED, CHANGES_REQUESTED, COMMENTED */
  reviewState?: string;
  /** Commit SHA (short) */
  commitSha?: string;
  /** Commit message */
  commitMessage?: string;
  /** Label name for labeled/unlabeled events */
  label?: string;
  /** Old/new title for renamed events */
  rename?: { from: string; to: string };
  /** Assignee login for assigned/unassigned events */
  assignee?: string;
  /** Reviewer login for review_requested events */
  requestedReviewer?: string;
}

export interface PRDetail {
  body: string;
  labels: string[];
  checkRuns: CheckRun[];
  reviewers: Reviewer[];
  additions: number;
  deletions: number;
  changedFiles: number;
  headBranch: string;
  baseBranch: string;
  timeline: TimelineEvent[];
}
