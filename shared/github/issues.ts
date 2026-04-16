import type { Octokit } from '@octokit/rest';
import type { IssueItem, RepoConfig, OwnershipFilter } from '../types.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type UserScopedOwnership = Exclude<OwnershipFilter, 'everyone'>;

/**
 * Build the user-qualifier portion of a GitHub search query based on ownership filter.
 */
function userQualifier(username: string, ownership: UserScopedOwnership): string {
  switch (ownership) {
    case 'created': return `author:${username}`;
    case 'assigned': return `assignee:${username}`;
    case 'involved': return `involves:${username}`;
  }
}

/**
 * Fetch the user's issues across all given repos using the search API.
 */
export async function fetchUserIssues(
  octokit: Octokit,
  repos: RepoConfig[],
  username: string,
  ownership: UserScopedOwnership = 'involved'
): Promise<IssueItem[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString().split('T')[0];

  const repoFilters = repos.map((r) => `repo:${r.owner}/${r.name}`).join(' ');
  const query = `is:issue is:open ${userQualifier(username, ownership)} updated:>=${since} ${repoFilters}`;

  const allItems: IssueItem[] = [];
  let page = 1;
  let totalCount = 0;
  const MAX_PAGES = 5;

  while (true) {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 100,
      page,
    });

    if (page === 1) {
      totalCount = data.total_count;
    }

    for (const item of data.items) {
      // Skip pull requests returned by the search API
      if (item.pull_request) continue;

      const repoUrl = item.repository_url ?? '';
      const repoParts = repoUrl.split('/');
      const repoName = repoParts.pop() ?? '';
      const repoOwner = repoParts.pop() ?? '';

      // Skip items with invalid/missing repository URL
      if (!repoOwner || !repoName) continue;

      allItems.push({
        kind: 'issue',
        id: item.id,
        number: item.number,
        title: item.title,
        author: item.user?.login ?? 'unknown',
        repo: { owner: repoOwner, name: repoName },
        url: item.html_url,
        updatedAt: item.updated_at,
        createdAt: item.created_at,
        state: item.state === 'closed' ? 'closed' : 'open',
        labels: (item.labels ?? []).map((l) => {
          if (typeof l === 'string') {
            return { name: l, color: '888888' };
          }
          return {
            name: l.name ?? '',
            color: l.color ?? '888888',
            description: l.description ?? undefined,
          };
        }),
        assignees: (item.assignees ?? []).map((a) => a.login),
        milestone: item.milestone
          ? {
              title: item.milestone.title,
              openIssues: item.milestone.open_issues ?? 0,
              closedIssues: item.milestone.closed_issues ?? 0,
              dueOn: item.milestone.due_on ?? null,
            }
          : null,
        commentsCount: item.comments ?? 0,
      });
    }

    if (allItems.length >= totalCount || data.items.length < 100) {
      break;
    }
    page++;
    if (page > MAX_PAGES) {
      console.warn(
        `Issue search hit the ${MAX_PAGES}-page limit (${allItems.length} of ${totalCount} results). Some issues may not be shown.`
      );
      break;
    }
  }

  return allItems;
}

/**
 * Fetch all open issues (any author) for a single repo — used when "everyone" is selected.
 */
export async function fetchAllIssuesForRepo(
  octokit: Octokit,
  repo: RepoConfig,
  maxPerRepo: number
): Promise<IssueItem[]> {
  const perPage = Math.max(1, Math.min(maxPerRepo, 100));
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data } = await octokit.issues.listForRepo({
    owner: repo.owner,
    repo: repo.name,
    state: 'open',
    sort: 'updated',
    direction: 'desc',
    per_page: perPage,
    since: cutoff,
  });

  // The issues API also returns pull requests — filter them out
  const issues = data.filter((item) => !item.pull_request);

  return issues.map((item) => ({
    kind: 'issue',
    id: item.id,
    number: item.number,
    title: item.title,
    author: item.user?.login ?? 'unknown',
    repo: { owner: repo.owner, name: repo.name },
    url: item.html_url,
    updatedAt: item.updated_at,
    createdAt: item.created_at,
    state: item.state === 'closed' ? 'closed' : 'open',
    labels: (item.labels ?? []).map((l) => {
      if (typeof l === 'string') {
        return { name: l, color: '888888' };
      }
      return {
        name: l.name ?? '',
        color: l.color ?? '888888',
        description: l.description ?? undefined,
      };
    }),
    assignees: (item.assignees ?? []).map((a) => a.login),
    milestone: item.milestone
      ? {
          title: item.milestone.title,
          openIssues: item.milestone.open_issues ?? 0,
          closedIssues: item.milestone.closed_issues ?? 0,
          dueOn: item.milestone.due_on ?? null,
        }
      : null,
    commentsCount: item.comments ?? 0,
  }));
}
