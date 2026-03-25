import type { Octokit } from '@octokit/rest';
import type { PRItem, PRState, RepoConfig } from '../types.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetch the authenticated user's PRs across all given repos using the search API.
 * This is far more efficient than listing all PRs per repo and filtering client-side,
 * especially in busy repos like WordPress/Gutenberg.
 */
export async function fetchUserPRs(
  octokit: Octokit,
  repos: RepoConfig[],
  username: string
): Promise<PRItem[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString().split('T')[0];

  // Build search query: author's PRs in the given repos, updated in last 30 days
  const repoFilters = repos.map((r) => `repo:${r.owner}/${r.name}`).join(' ');
  const query = `is:pr author:${username} updated:>=${since} ${repoFilters}`;

  const allItems: PRItem[] = [];
  let page = 1;

  // Paginate through results (search API returns max 100 per page)
  while (true) {
    const { data } = await octokit.search.issuesAndPullRequests({
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 100,
      page,
    });

    for (const item of data.items) {
      // Extract owner/repo from repository_url (e.g. "https://api.github.com/repos/WordPress/gutenberg")
      const repoUrl = item.repository_url ?? '';
      const repoParts = repoUrl.split('/');
      const repoName = repoParts.pop() ?? '';
      const repoOwner = repoParts.pop() ?? '';

      let state: PRState = 'open';
      if (item.pull_request?.merged_at) {
        state = 'merged';
      } else if (item.state === 'closed') {
        state = 'closed';
      }

      allItems.push({
        id: item.id,
        number: item.number,
        title: item.title,
        author: item.user?.login ?? 'unknown',
        repo: { owner: repoOwner, name: repoName },
        url: item.html_url,
        updatedAt: item.updated_at,
        createdAt: item.created_at,
        ciStatus: 'none',
        reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
        draft: item.draft ?? false,
        state,
      });
    }

    // Stop if we've got all results or hit a reasonable limit
    if (allItems.length >= data.total_count || data.items.length < 100) {
      break;
    }
    page++;
    // Safety cap at 5 pages (500 PRs)
    if (page > 5) break;
  }

  return allItems;
}

/**
 * Fetch all PRs (any author) for a single repo — used when "mine only" is off.
 */
export async function fetchAllPRsForRepo(
  octokit: Octokit,
  repo: RepoConfig,
  maxPerRepo: number
): Promise<PRItem[]> {
  const perPage = Math.max(1, Math.min(maxPerRepo, 100));
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data } = await octokit.pulls.list({
    owner: repo.owner,
    repo: repo.name,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: perPage,
  });

  const recent = data.filter((pr) => pr.updated_at >= cutoff);

  return recent.map((pr) => {
    let state: PRState = 'open';
    if (pr.merged_at) {
      state = 'merged';
    } else if (pr.state === 'closed') {
      state = 'closed';
    }

    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? 'unknown',
      repo: { owner: repo.owner, name: repo.name },
      url: pr.html_url,
      updatedAt: pr.updated_at,
      createdAt: pr.created_at,
      ciStatus: 'none',
      reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
      draft: pr.draft ?? false,
      state,
    };
  });
}
