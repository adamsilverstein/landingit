import type { Octokit } from '@octokit/rest';

/**
 * Logins to skip when determining the "last commenter" — GitHub Actions
 * workflows post automated comments on nearly every PR/issue, which drowns
 * out real human/review activity. Other bots (CodeRabbit, Codecov, etc.)
 * are intentionally kept since their comments reflect meaningful signal.
 */
const EXCLUDED_LOGINS: ReadonlySet<string> = new Set(['github-actions[bot]']);

/**
 * Maximum comments fetched in a single page when looking for the most recent
 * non-excluded commenter. 100 is GitHub's per-page cap and gives the
 * walk-back enough headroom to skip long runs of `github-actions[bot]`
 * comments on noisy CI repos.
 */
export const LAST_COMMENTER_PAGE_SIZE = 100;

/**
 * Fetch the login of the user who most recently commented on an issue or PR,
 * skipping automated `github-actions[bot]` comments. Works for both issues and
 * PRs — GitHub's issue-comments endpoint covers conversation comments on both
 * (PR review comments are a separate endpoint and are intentionally excluded
 * here).
 *
 * Returns `null` if there are no non-excluded commenters among the most recent
 * page of comments.
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
    per_page: LAST_COMMENTER_PAGE_SIZE,
    sort: 'created',
    direction: 'desc',
  });
  for (const comment of data) {
    const login = comment.user?.login;
    if (!login) continue;
    if (EXCLUDED_LOGINS.has(login)) continue;
    return login;
  }
  return null;
}
