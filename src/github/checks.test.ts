import { describe, it, expect, vi } from 'vitest';
import { getCheckStatus, getReviewState, isRequestedReviewer } from '../github/checks.js';
import type { Octokit } from '@octokit/rest';

function mockOctokit(overrides: Record<string, unknown> = {}): Octokit {
  return overrides as unknown as Octokit;
}

describe('getCheckStatus', () => {
  it('returns "none" when there are no check runs', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({ data: { check_runs: [] } }),
      },
    });
    expect(await getCheckStatus(octokit, 'owner', 'repo', 'ref')).toBe('none');
  });

  it('returns "success" when all runs succeed', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'success' },
              { status: 'completed', conclusion: 'success' },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('success');
  });

  it('returns "success" when all runs are success, skipped, or neutral', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'success' },
              { status: 'completed', conclusion: 'skipped' },
              { status: 'completed', conclusion: 'neutral' },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('success');
  });

  it('returns "failure" when any run has a failure conclusion', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'success' },
              { status: 'completed', conclusion: 'failure' },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('failure');
  });

  it('returns "failure" for timed_out conclusion', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [{ status: 'completed', conclusion: 'timed_out' }],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('failure');
  });

  it('returns "failure" for cancelled conclusion', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [{ status: 'completed', conclusion: 'cancelled' }],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('failure');
  });

  it('returns "failure" for action_required conclusion', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [{ status: 'completed', conclusion: 'action_required' }],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('failure');
  });

  it('returns "pending" when any run is in_progress', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'success' },
              { status: 'in_progress', conclusion: null },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('pending');
  });

  it('returns "pending" when any run is queued', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'success' },
              { status: 'queued', conclusion: null },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('pending');
  });

  it('returns "failure" over "pending" when both exist (failure checked first)', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'failure' },
              { status: 'in_progress', conclusion: null },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('failure');
  });

  it('returns "mixed" when conclusions don\'t match success/skipped/neutral and no failure', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockResolvedValue({
          data: {
            check_runs: [
              { status: 'completed', conclusion: 'success' },
              { status: 'completed', conclusion: 'stale' },
            ],
          },
        }),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('mixed');
  });

  it('returns "none" when the API call throws', async () => {
    const octokit = mockOctokit({
      checks: {
        listForRef: vi.fn().mockRejectedValue(new Error('API error')),
      },
    });
    expect(await getCheckStatus(octokit, 'o', 'r', 'ref')).toBe('none');
  });
});

describe('getReviewState', () => {
  it('returns zeros when there are no reviews', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({ data: [] }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result).toEqual({ approvals: 0, changesRequested: 0, commentCount: 0 });
  });

  it('counts approvals correctly', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: 'alice' }, state: 'APPROVED' },
            { user: { login: 'bob' }, state: 'APPROVED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result.approvals).toBe(2);
    expect(result.changesRequested).toBe(0);
  });

  it('counts changes requested correctly', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: 'alice' }, state: 'CHANGES_REQUESTED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result.changesRequested).toBe(1);
    expect(result.approvals).toBe(0);
  });

  it('counts comment reviews separately', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: 'alice' }, state: 'COMMENTED' },
            { user: { login: 'bob' }, state: 'COMMENTED' },
            { user: { login: 'charlie' }, state: 'APPROVED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result.commentCount).toBe(2);
    expect(result.approvals).toBe(1);
  });

  it('deduplicates reviewers, keeping latest non-comment state', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: 'alice' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'alice' }, state: 'APPROVED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result.approvals).toBe(1);
    expect(result.changesRequested).toBe(0);
  });

  it('handles mixed reviewers with deduplication', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: 'alice' }, state: 'APPROVED' },
            { user: { login: 'bob' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'alice' }, state: 'CHANGES_REQUESTED' },
            { user: { login: 'bob' }, state: 'APPROVED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    // alice: APPROVED -> CHANGES_REQUESTED (latest)
    // bob: CHANGES_REQUESTED -> APPROVED (latest)
    expect(result.approvals).toBe(1);
    expect(result.changesRequested).toBe(1);
  });

  it('ignores COMMENTED state for deduplication', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: { login: 'alice' }, state: 'APPROVED' },
            { user: { login: 'alice' }, state: 'COMMENTED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    // COMMENTED should not overwrite APPROVED
    expect(result.approvals).toBe(1);
    expect(result.commentCount).toBe(1);
  });

  it('skips reviews with no user', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockResolvedValue({
          data: [
            { user: null, state: 'APPROVED' },
            { user: { login: 'bob' }, state: 'APPROVED' },
          ],
        }),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result.approvals).toBe(1);
  });

  it('returns zeros when the API call throws', async () => {
    const octokit = mockOctokit({
      pulls: {
        listReviews: vi.fn().mockRejectedValue(new Error('API error')),
      },
    });
    const result = await getReviewState(octokit, 'o', 'r', 1);
    expect(result).toEqual({ approvals: 0, changesRequested: 0, commentCount: 0 });
  });
});

describe('isRequestedReviewer', () => {
  it('returns true when the user is a requested reviewer', async () => {
    const octokit = mockOctokit({
      pulls: {
        listRequestedReviewers: vi.fn().mockResolvedValue({
          data: {
            users: [{ login: 'alice' }, { login: 'bob' }],
          },
        }),
      },
    });
    expect(await isRequestedReviewer(octokit, 'o', 'r', 1, 'alice')).toBe(true);
  });

  it('returns false when the user is not a requested reviewer', async () => {
    const octokit = mockOctokit({
      pulls: {
        listRequestedReviewers: vi.fn().mockResolvedValue({
          data: {
            users: [{ login: 'alice' }],
          },
        }),
      },
    });
    expect(await isRequestedReviewer(octokit, 'o', 'r', 1, 'bob')).toBe(false);
  });

  it('returns false when there are no requested reviewers', async () => {
    const octokit = mockOctokit({
      pulls: {
        listRequestedReviewers: vi.fn().mockResolvedValue({
          data: { users: [] },
        }),
      },
    });
    expect(await isRequestedReviewer(octokit, 'o', 'r', 1, 'alice')).toBe(false);
  });

  it('performs case-insensitive comparison', async () => {
    const octokit = mockOctokit({
      pulls: {
        listRequestedReviewers: vi.fn().mockResolvedValue({
          data: {
            users: [{ login: 'Alice' }],
          },
        }),
      },
    });
    expect(await isRequestedReviewer(octokit, 'o', 'r', 1, 'alice')).toBe(true);
  });

  it('returns false when the API call throws', async () => {
    const octokit = mockOctokit({
      pulls: {
        listRequestedReviewers: vi.fn().mockRejectedValue(new Error('API error')),
      },
    });
    expect(await isRequestedReviewer(octokit, 'o', 'r', 1, 'alice')).toBe(false);
  });
});
