import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGithubData } from '../hooks/useGithubData.js';
import type { Octokit } from '@octokit/rest';
import type { RepoConfig } from '../types.js';

vi.mock('../github/pulls.js', () => ({
  fetchUserPRs: vi.fn(),
  fetchAllPRsForRepo: vi.fn(),
}));

vi.mock('../github/checks.js', () => ({
  getCheckStatus: vi.fn(),
  getReviewState: vi.fn(),
}));

import { fetchUserPRs, fetchAllPRsForRepo } from '../github/pulls.js';
import { getCheckStatus, getReviewState } from '../github/checks.js';

const mockedFetchUserPRs = vi.mocked(fetchUserPRs);
const mockedFetchAllPRsForRepo = vi.mocked(fetchAllPRsForRepo);
const mockedGetCheckStatus = vi.mocked(getCheckStatus);
const mockedGetReviewState = vi.mocked(getReviewState);

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
    };

    mockedFetchUserPRs.mockResolvedValue([pr]);
    mockedGetCheckStatus.mockResolvedValue('success');
    mockedGetReviewState.mockResolvedValue({
      approvals: 1,
      changesRequested: 0,
      commentCount: 0,
    });

    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), repos, 30, 'user'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    expect(result.current.items[0].ciStatus).toBe('success');
    expect(result.current.items[0].reviewState.approvals).toBe(1);
    expect(mockedFetchUserPRs).toHaveBeenCalled();
    expect(mockedFetchAllPRsForRepo).not.toHaveBeenCalled();
  });

  it('fetches all PRs per repo when username is null', async () => {
    const pr = {
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
    };

    mockedFetchAllPRsForRepo.mockResolvedValue([pr]);
    mockedGetCheckStatus.mockResolvedValue('pending');
    mockedGetReviewState.mockResolvedValue({
      approvals: 0,
      changesRequested: 0,
      commentCount: 0,
    });

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
    };

    mockedFetchUserPRs.mockResolvedValue([mergedPR]);

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

  it('sets error state on fetch failure', async () => {
    mockedFetchUserPRs.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useGithubData(mockOctokit(), repos, 30, 'user'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });
});
