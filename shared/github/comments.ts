import type { Octokit } from '@octokit/rest';

/**
 * Fetch the login of the user who most recently commented on an issue or PR.
 * Works for both issues and PRs — GitHub's issue-comments endpoint covers
 * conversation comments on both (PR review comments are a separate endpoint
 * and are intentionally excluded here).
 */
export async function getLastCommenter(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<string | null> {
  const { data } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 1,
    sort: 'created',
    direction: 'desc',
  });
  return data[0]?.user?.login ?? null;
}
