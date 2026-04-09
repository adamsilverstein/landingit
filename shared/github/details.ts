import type { Octokit } from '@octokit/rest';
import type { PRDetail, PRItem, TimelineEvent, TimelineEventType } from '../types.js';
import type { StorageAdapter } from '../storage.js';
import { STORAGE_KEYS } from '../constants.js';

// Cache with TTL to avoid redundant API calls when re-previewing the same PR.
// Keyed by PR URL, expires after 2 minutes. Backed by storage for persistence
// across page reloads.
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  data: PRDetail;
  timestamp: number;
}

const detailCache = new Map<string, CacheEntry>();

let _storage: StorageAdapter | null = null;

/** Call once at startup to enable persistent caching. */
export async function initDetailCache(storage: StorageAdapter): Promise<void> {
  _storage = storage;
  try {
    const raw = await storage.getItem(STORAGE_KEYS.DETAIL_CACHE);
    if (!raw) return;
    const entries = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(entries)) {
      if (now - entry.timestamp < CACHE_TTL_MS) {
        detailCache.set(key, entry);
      }
    }
    evictExpired();
    await persistToStorage();
  } catch {
    // Ignore corrupt stored data
  }
}

async function persistToStorage(): Promise<void> {
  if (!_storage) return;
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [key, entry] of detailCache) {
      obj[key] = entry;
    }
    await _storage.setItem(STORAGE_KEYS.DETAIL_CACHE, JSON.stringify(obj));
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

// Map GitHub timeline event types to our simplified types
function mapEventType(event: string): TimelineEventType {
  const mapping: Record<string, TimelineEventType> = {
    commented: 'commented',
    reviewed: 'reviewed',
    committed: 'committed',
    head_ref_force_pushed: 'force-pushed',
    merged: 'merged',
    closed: 'closed',
    reopened: 'reopened',
    renamed: 'renamed',
    labeled: 'labeled',
    unlabeled: 'unlabeled',
    assigned: 'assigned',
    unassigned: 'unassigned',
    review_requested: 'review_requested',
    ready_for_review: 'ready_for_review',
    convert_to_draft: 'convert_to_draft',
    head_ref_deleted: 'head_ref_deleted',
  };
  return mapping[event] ?? 'unknown';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseTimelineEvents(events: any[]): TimelineEvent[] {
  const parsed: TimelineEvent[] = [];

  for (const ev of events) {
    const type = mapEventType(ev.event ?? ev.type ?? '');

    // Skip unknown or noisy events
    if (type === 'unknown') continue;

    const base: TimelineEvent = {
      id: String(ev.id ?? ev.node_id ?? `${type}-${ev.created_at ?? ev.committer?.date ?? ''}`),
      type,
      actor: ev.actor?.login ?? ev.user?.login ?? ev.author?.login ?? ev.committer?.login ?? '',
      createdAt: ev.created_at ?? ev.submitted_at ?? ev.committer?.date ?? '',
    };

    switch (type) {
      case 'commented':
        base.body = ev.body ?? '';
        break;
      case 'reviewed':
        base.body = ev.body ?? '';
        base.reviewState = typeof ev.state === 'string' ? ev.state.toUpperCase() : '';
        break;
      case 'committed':
        base.commitSha = (ev.sha ?? '').slice(0, 7);
        base.commitMessage = ev.message ?? '';
        break;
      case 'force-pushed':
        base.commitSha = (ev.commit_id ?? '').slice(0, 7);
        break;
      case 'labeled':
      case 'unlabeled':
        base.label = ev.label?.name ?? '';
        break;
      case 'renamed':
        base.rename = { from: ev.rename?.from ?? '', to: ev.rename?.to ?? '' };
        break;
      case 'assigned':
      case 'unassigned':
        base.assignee = ev.assignee?.login ?? '';
        break;
      case 'review_requested':
        base.requestedReviewer = ev.requested_reviewer?.login ?? '';
        break;
    }

    parsed.push(base);
  }

  // Sort chronologically (newest last)
  parsed.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return parsed;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Keep only the latest run per app+name (reruns create duplicate entries;
// different apps can emit checks with the same name)
function deduplicateCheckRuns<T extends { name: string; started_at?: string | null; app?: { id?: number | null } | null }>(
  runs: T[]
): T[] {
  const latestByKey = new Map<string, T>();
  for (const run of runs) {
    const key = `${run.app?.id ?? 'unknown'}:${run.name}`;
    const existing = latestByKey.get(key);
    if (!existing || new Date(run.started_at ?? 0) > new Date(existing.started_at ?? 0)) {
      latestByKey.set(key, run);
    }
  }
  return [...latestByKey.values()];
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

  const [prRes, checksRes, reviewsRes, timelineRes] = await Promise.allSettled([
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
    octokit.paginate(octokit.issues.listEventsForTimeline as any, {
      owner,
      repo: name,
      issue_number: item.number,
      per_page: 100,
      headers: { accept: 'application/vnd.github.mockingbird-preview+json' },
    }),
  ]);

  const pr = prRes.status === 'fulfilled' ? prRes.value.data : null;
  const checks =
    checksRes.status === 'fulfilled'
      ? checksRes.value
      : [];
  const reviews =
    reviewsRes.status === 'fulfilled' ? reviewsRes.value : [];
  const timelineRaw =
    timelineRes.status === 'fulfilled' ? (timelineRes.value as any[]) : [];

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
    checkRuns: deduplicateCheckRuns(checks).map((c) => ({
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
    timeline: parseTimelineEvents(timelineRaw),
  };

  detailCache.set(item.url, { data: detail, timestamp: Date.now() });
  evictExpired();
  persistToStorage();

  return detail;
}
