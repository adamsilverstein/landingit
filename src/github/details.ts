import type { Octokit } from '@octokit/rest';
import type { PRDetail, PRItem } from '../types.js';

export async function getPRDetails(
  octokit: Octokit,
  item: PRItem
): Promise<PRDetail> {
  const { owner, name } = item.repo;

  const [prRes, checksRes, reviewsRes] = await Promise.allSettled([
    octokit.pulls.get({
      owner,
      repo: name,
      pull_number: item.number,
    }),
    octokit.checks.listForRef({
      owner,
      repo: name,
      ref: `pull/${item.number}/head`,
      per_page: 100,
    }),
    octokit.pulls.listReviews({
      owner,
      repo: name,
      pull_number: item.number,
      per_page: 100,
    }),
  ]);

  const pr = prRes.status === 'fulfilled' ? prRes.value.data : null;
  const checks =
    checksRes.status === 'fulfilled'
      ? checksRes.value.data.check_runs
      : [];
  const reviews =
    reviewsRes.status === 'fulfilled' ? reviewsRes.value.data : [];

  // Deduplicate reviewers to their latest review state
  const reviewerMap = new Map<string, string>();
  for (const review of reviews) {
    if (review.user && review.state !== 'PENDING') {
      reviewerMap.set(review.user.login, review.state);
    }
  }

  return {
    body: pr?.body ?? '',
    labels: pr?.labels?.map((l) => (typeof l === 'string' ? l : l.name ?? '')) ?? [],
    checkRuns: checks.map((c) => ({
      name: c.name,
      status: c.status,
      conclusion: c.conclusion,
    })),
    reviewers: [...reviewerMap.entries()].map(([login, state]) => ({
      login,
      state,
    })),
    additions: pr?.additions ?? 0,
    deletions: pr?.deletions ?? 0,
    changedFiles: pr?.changed_files ?? 0,
    headBranch: pr?.head?.ref ?? '',
    baseBranch: pr?.base?.ref ?? '',
  };
}
