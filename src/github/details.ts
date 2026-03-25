import type { Octokit } from '@octokit/rest';
import type { PRDetail, PRItem } from '../types.js';

// Simple in-memory cache with TTL to avoid redundant API calls when
// re-previewing the same PR. Keyed by PR URL, expires after 2 minutes.
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_SIZE = 50;
const detailCache = new Map<string, { data: PRDetail; timestamp: number }>();

export async function getPRDetails(
  octokit: Octokit,
  item: PRItem
): Promise<PRDetail> {
  // Return cached data if still fresh
  const cached = detailCache.get(item.url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const { owner, name } = item.repo;

  const [prRes, checksRes, reviewsRes] = await Promise.allSettled([
    octokit.pulls.get({
      owner,
      repo: name,
      pull_number: item.number,
    }),
    // NOTE: per_page capped at 100. PRs with >100 check runs will show
    // only the first page. Pagination can be added if needed.
    octokit.checks.listForRef({
      owner,
      repo: name,
      ref: `pull/${item.number}/head`,
      per_page: 100,
    }),
    // NOTE: per_page capped at 100. PRs with >100 reviews will show
    // only the first page. Pagination can be added if needed.
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

  const detail: PRDetail = {
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

  detailCache.set(item.url, { data: detail, timestamp: Date.now() });

  // Evict expired entries and enforce size limit
  if (detailCache.size > MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [key, entry] of detailCache) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        detailCache.delete(key);
      }
    }
    // If still over limit, remove oldest entries
    while (detailCache.size > MAX_CACHE_SIZE) {
      const firstKey = detailCache.keys().next().value;
      if (firstKey !== undefined) detailCache.delete(firstKey);
      else break;
    }
  }

  return detail;
}
