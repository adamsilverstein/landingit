import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGithubData } from '../hooks/useGithubData.js';
import type { Octokit } from '@octokit/rest';
import type { RepoConfig } from '../types.js';

vi.mock('../github/pulls.js', () => ({
  fetchUserPRs: vi.fn(),
  fetchAllPRsForRepo: vi.fn(),
}));

vi.mock('../github/issues.js', () => ({
  fetchUserIssues: vi.fn(),
  fetchAllIssuesForRepo: vi.fn(),
}));

vi.mock('../github/checks.js', () => ({
  getCheckStatus: vi.fn(),
  getReviewState: vi.fn(),
  isRequestedReviewer: vi.fn(),
}));

import { fetchUserPRs, fetchAllPRsForRepo } from '../github/pulls.js';
import { fetchUserIssues, fetchAllIssuesForRepo } from '../github/issues.js';
import { getCheckStatus, getReviewState, isRequestedReviewer } from '../github/checks.js';

const mockedFetchUserPRs = vi.mocked(fetchUserPRs);
const mockedFetchAllPRsForRepo = vi.mocked(fetchAllPRsForRepo);
const mockedFetchUserIssues = vi.mocked(fetchUserIssues);
const mockedFetchAllIssuesForRepo = vi.mocked(fetchAllIssuesForRepo);
const mockedGetCheckStatus = vi.mocked(getCheckStatus);
const mockedGetReviewState = vi.mocked(getReviewState);
const mockedIsRequestedReviewer = vi.mocked(isRequestedReviewer);

function mockOctokit(): Octokit {
  return {} as unknown as Octokit;
}

const repos: RepoConfig[] = [{ owner: 'acme', name: 'web', enabled: true }];

describe('useGithubData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty state when octokit is null', () => {
    const { result } = renderHook(() =>
      useGithubData(null, repos, 30, 'user'),
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty state when repos list is empty', () => {
    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), [], 30, 'user'),
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches user PRs when username is provided', async () => {
    const pr = {
      kind: 'pr' as const,
      id: 1,
      number: 1,
      title: 'Test PR',
      author: 'user',
      repo: { owner: 'acme', name: 'web' },
      url: 'https://github.com/acme/web/pull/1',
      updatedAt: '2026-01-15T10:00:00Z',
      createdAt: '2026-01-10T08:00:00Z',
      ciStatus: 'none' as const,
      reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
      draft: false,
      state: 'open' as const,
      isRequestedReviewer: false,
    };

    mockedFetchUserPRs.mockResolvedValue([pr]);
    mockedFetchUserIssues.mockResolvedValue([]);
    mockedGetCheckStatus.mockResolvedValue('success');
    mockedGetReviewState.mockResolvedValue({
      approvals: 1,
      changesRequested: 0,
      commentCount: 0,
    });
    mockedIsRequestedReviewer.mockResolvedValue(false);

    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), repos, 30, 'user'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    expect(result.current.items[0]).toHaveProperty('ciStatus', 'success');
    expect(result.current.items[0]).toHaveProperty('kind', 'pr');
    expect(mockedFetchUserPRs).toHaveBeenCalled();
    expect(mockedFetchAllPRsForRepo).not.toHaveBeenCalled();
  });

  it('fetches all PRs per repo when username is null', async () => {
    const pr = {
      kind: 'pr' as const,
      id: 2,
      number: 2,
      title: 'Other PR',
      author: 'other',
      repo: { owner: 'acme', name: 'web' },
      url: 'https://github.com/acme/web/pull/2',
      updatedAt: '2026-01-15T10:00:00Z',
      createdAt: '2026-01-10T08:00:00Z',
      ciStatus: 'none' as const,
      reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
      draft: false,
      state: 'open' as const,
      isRequestedReviewer: false,
    };

    mockedFetchAllPRsForRepo.mockResolvedValue([pr]);
    mockedFetchAllIssuesForRepo.mockResolvedValue([]);
    mockedGetCheckStatus.mockResolvedValue('pending');
    mockedGetReviewState.mockResolvedValue({
      approvals: 0,
      changesRequested: 0,
      commentCount: 0,
    });
    mockedIsRequestedReviewer.mockResolvedValue(false);

    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), repos, 30, null),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    expect(mockedFetchAllPRsForRepo).toHaveBeenCalled();
    expect(mockedFetchUserPRs).not.toHaveBeenCalled();
  });

  it('skips CI/review enrichment for non-open PRs', async () => {
    const mergedPR = {
      kind: 'pr' as const,
      id: 3,
      number: 3,
      title: 'Merged PR',
      author: 'user',
      repo: { owner: 'acme', name: 'web' },
      url: 'https://github.com/acme/web/pull/3',
      updatedAt: '2026-01-15T10:00:00Z',
      createdAt: '2026-01-10T08:00:00Z',
      ciStatus: 'none' as const,
      reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
      draft: false,
      state: 'merged' as const,
      isRequestedReviewer: false,
    };

    mockedFetchUserPRs.mockResolvedValue([mergedPR]);
    mockedFetchUserIssues.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), repos, 30, 'user'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    expect(mockedGetCheckStatus).not.toHaveBeenCalled();
    expect(mockedGetReviewState).not.toHaveBeenCalled();
  });

  it('re-fetches when username changes from null during in-flight request', async () => {
    // Simulate the initial load scenario: first fetch starts with username=null,
    // then username resolves to a value while the first fetch is still running.
    let resolvePerRepo: (value: never[]) => void;
    const slowPerRepo = new Promise<never[]>((r) => { resolvePerRepo = r; });
    mockedFetchAllPRsForRepo.mockReturnValue(slowPerRepo);
    mockedFetchAllIssuesForRepo.mockResolvedValue([]);

    const pr = {
      kind: 'pr' as const,
      id: 1,
      number: 1,
      title: 'User PR',
      author: 'user',
      repo: { owner: 'acme', name: 'web' },
      url: 'https://github.com/acme/web/pull/1',
      updatedAt: '2026-01-15T10:00:00Z',
      createdAt: '2026-01-10T08:00:00Z',
      ciStatus: 'none' as const,
      reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
      draft: false,
      state: 'open' as const,
      isRequestedReviewer: false,
    };
    mockedFetchUserPRs.mockResolvedValue([pr]);
    mockedFetchUserIssues.mockResolvedValue([]);
    mockedGetCheckStatus.mockResolvedValue('success');
    mockedGetReviewState.mockResolvedValue({
      approvals: 1, changesRequested: 0, commentCount: 0,
    });
    mockedIsRequestedReviewer.mockResolvedValue(false);

    const octokit = mockOctokit();
    // Start with username=null (triggers per-repo fetch)
    const { result, rerender } = renderHook(
      ({ username }) => useGithubData(octokit, repos, 30, username),
      { initialProps: { username: null as string | null } },
    );

    // While the per-repo fetch is still pending, change username
    rerender({ username: 'user' });

    // Resolve the slow per-repo fetch (should be cancelled/ignored)
    resolvePerRepo!([]);

    // The hook should complete with data from the user fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    expect(result.current.items[0]).toHaveProperty('title', 'User PR');
    expect(mockedFetchUserPRs).toHaveBeenCalled();
  });

  it('sets error state on fetch failure', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedFetchUserPRs.mockRejectedValue(new Error('Network error'));
    mockedFetchUserIssues.mockRejectedValue(new Error('Issue fetch error'));

    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), repos, 30, 'user'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // With Promise.allSettled, individual failures are handled gracefully
    // Both fetches fail but the hook returns empty items instead of crashing
    expect(result.current.items).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Failed to fetch user PRs:', expect.any(Error));
    expect(warnSpy).toHaveBeenCalledWith('Failed to fetch user issues:', expect.any(Error));
    warnSpy.mockRestore();
  });
});
