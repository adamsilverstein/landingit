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
    notificationsEnabled: boolean;
    notificationsRefreshInterval: number; // seconds, 0 = disabled. Polled independently of PRs.
    highlightWorkingSet: boolean; // emphasize notifications tied to PRs the user authored / is reviewing
  };
}

export type CIStatus = 'success' | 'failure' | 'pending' | 'none' | 'mixed';
export type SortMode = 'updated' | 'created' | 'repo' | 'status' | 'number' | 'state' | 'title' | 'author' | 'assignees' | 'reviews' | 'lastCommenter';
export type SortDirection = 'asc' | 'desc';
export type FilterMode = 'all' | 'failing' | 'needs-review' | 'review-requested' | 'new-activity' | 'merge-ready' | 'stale';
export type ItemTypeFilter = 'both' | 'prs' | 'issues';
export type OwnershipFilter = 'everyone' | 'created' | 'assigned' | 'involved';
export type ViewMode = 'list' | 'repos' | 'help' | 'detail' | 'notifications' | 'notification-rules';
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
  commentsCount?: number;
  lastCommenter?: string;
}

export interface MilestoneInfo {
  title: string;
  openIssues: number;
  closedIssues: number;
  dueOn: string | null;
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
  milestone: MilestoneInfo | null;
  commentsCount?: number;
  lastCommenter?: string;
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

// ──────────────────────────────────────────────────────────────────────────────
// Notifications

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Commit'
  | 'Release'
  | 'Discussion'
  | 'CheckSuite'
  | 'RepositoryVulnerabilityAlert'
  | 'RepositoryDependabotAlertsThread'
  | 'WorkflowRun';

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'ci_activity'
  | 'invitation'
  | 'manual'
  | 'mention'
  | 'review_requested'
  | 'security_alert'
  | 'state_change'
  | 'subscribed'
  | 'team_mention'
  | 'approval_requested'
  | 'member_feature_requested';

export interface NotificationItem {
  /** GitHub thread ID (string in the API). */
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updatedAt: string;
  lastReadAt: string | null;
  repo: { owner: string; name: string };
  subject: {
    title: string;
    type: NotificationSubjectType;
    /** API URL of the subject, or null for some subject types. */
    url: string | null;
    latestCommentUrl: string | null;
  };
  /** PR/issue number parsed from `subject.url`. Null when the URL isn't a PR/issue. */
  subjectNumber: number | null;
}

export type RuleField = 'title' | 'author' | 'repo' | 'reason' | 'subjectType';
export type RuleOp = 'startsWith' | 'equals' | 'contains' | 'regex';

export interface RuleCondition {
  field: RuleField;
  op: RuleOp;
  value: string;
}

export interface NotificationRule {
  /** UUID-like string; generated locally on rule creation. */
  id: string;
  /** User-facing label. */
  name: string;
  enabled: boolean;
  /** When true, the rule's matching threads are auto-marked-read after each refresh. */
  autoApply: boolean;
  /** All conditions must match (AND). An empty list matches nothing. */
  conditions: RuleCondition[];
  /** Action to apply to matching notifications. Only mark-read in v1. */
  action: 'mark-read';
  createdAt: string;
}
