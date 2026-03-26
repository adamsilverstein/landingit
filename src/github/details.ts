import type { Octokit } from '@octokit/rest';
import type { PRDetail, PRItem } from '../types.js';
import { STORAGE_KEYS } from '../constants.js';

// Cache with TTL to avoid redundant API calls when re-previewing the same PR.
// Keyed by PR URL, expires after 2 minutes. Backed by localStorage for persistence
// across page reloads.
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  data: PRDetail;
  timestamp: number;
}

const detailCache = new Map<string, CacheEntry>();

// Hydrate in-memory cache from localStorage on module load
function hydrateFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DETAIL_CACHE);
    if (!raw) return;
    const entries = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(entries)) {
      if (now - entry.timestamp < CACHE_TTL_MS) {
        detailCache.set(key, entry);
      }
    }
    evictExpired();
    persistToStorage();
  } catch {
    // Ignore corrupt stored data
  }
}
hydrateFromStorage();

function persistToStorage(): void {
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [key, entry] of detailCache) {
      obj[key] = entry;
    }
    localStorage.setItem(STORAGE_KEYS.DETAIL_CACHE, JSON.stringify(obj));
  } catch {
    // Silently ignore storage failures (e.g. quota exceeded)
  }
}

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of detailCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      detailCache.delete(key);
    }
  }
  while (detailCache.size > MAX_CACHE_SIZE) {
    const firstKey = detailCache.keys().next().value;
    if (firstKey !== undefined) detailCache.delete(firstKey);
    else break;
  }
}

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
    octokit.paginate(octokit.checks.listForRef, {
      owner,
      repo: name,
      ref: `pull/${item.number}/head`,
      per_page: 100,
    }),
    octokit.paginate(octokit.pulls.listReviews, {
      owner,
      repo: name,
      pull_number: item.number,
      per_page: 100,
    }),
  ]);

  const pr = prRes.status === 'fulfilled' ? prRes.value.data : null;
  const checks =
    checksRes.status === 'fulfilled'
      ? checksRes.value
      : [];
  const reviews =
    reviewsRes.status === 'fulfilled' ? reviewsRes.value : [];

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
  evictExpired();
  persistToStorage();

  return detail;
}
