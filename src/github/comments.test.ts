import { describe, it, expect, vi } from 'vitest';
import {
  getLastCommenter,
  LAST_COMMENTER_PAGE_SIZE,
} from '../../shared/github/comments.js';
import type { Octokit } from '@octokit/rest';

function mockOctokit(overrides: Record<string, unknown> = {}): Octokit {
  return overrides as unknown as Octokit;
}

function comment(login: string) {
  return { user: { login } };
}

describe('getLastCommenter', () => {
  it('returns the most recent non-excluded commenter', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [comment('alice'), comment('bob')],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
  });

  it('skips github-actions[bot] and returns the next commenter', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [
            comment('github-actions[bot]'),
            comment('github-actions[bot]'),
            comment('alice'),
          ],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
  });

  it('keeps non-github-actions bots (e.g. CodeRabbit, Codecov)', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [comment('coderabbitai[bot]'), comment('alice')],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe(
      'coderabbitai[bot]'
    );
  });

  it('returns null when all comments are github-actions[bot]', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [comment('github-actions[bot]'), comment('github-actions[bot]')],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBeNull();
  });

  it('returns null when there are no comments', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({ data: [] }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBeNull();
  });

  it('skips comments with no user and falls through to the next one', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [{ user: null }, comment('alice')],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
  });

  it('requests enough comments in descending order to skip noisy bots', async () => {
    const listComments = vi.fn().mockResolvedValue({ data: [] });
    const octokit = mockOctokit({ issues: { listComments } });

    await getLastCommenter(octokit, 'acme', 'web', 42);

    expect(listComments).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'acme',
        repo: 'web',
        issue_number: 42,
        direction: 'desc',
        per_page: LAST_COMMENTER_PAGE_SIZE,
      })
    );
  });
});
