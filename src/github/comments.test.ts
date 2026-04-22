import { describe, it, expect, vi } from 'vitest';
import {
  getLastCommenter,
  parseLastPage,
  LAST_COMMENTER_PAGE_SIZE,
} from '../../shared/github/comments.js';
import type { Octokit } from '@octokit/rest';

function mockOctokit(overrides: Record<string, unknown> = {}): Octokit {
  return overrides as unknown as Octokit;
}

function comment(login: string) {
  return { user: { login } };
}

// The GitHub per-issue comments endpoint returns comments in ascending
// chronological order (oldest first). Fixtures use that same order so
// they mirror real API responses.
describe('getLastCommenter', () => {
  it('returns the most recent non-excluded commenter (last element)', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [comment('bob'), comment('alice')],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
  });

  it('skips trailing github-actions[bot] comments and returns the next-newest commenter', async () => {
    const octokit = mockOctokit({
      issues: {
        listComments: vi.fn().mockResolvedValue({
          data: [
            comment('alice'),
            comment('github-actions[bot]'),
            comment('github-actions[bot]'),
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
          data: [comment('alice'), comment('coderabbitai[bot]')],
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
          data: [comment('alice'), { user: null }],
        }),
      },
    });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
  });

  it('requests LAST_COMMENTER_PAGE_SIZE comments without relying on sort/direction', async () => {
    const listComments = vi.fn().mockResolvedValue({ data: [] });
    const octokit = mockOctokit({ issues: { listComments } });

    await getLastCommenter(octokit, 'acme', 'web', 42);

    expect(listComments).toHaveBeenCalledWith({
      owner: 'acme',
      repo: 'web',
      issue_number: 42,
      per_page: LAST_COMMENTER_PAGE_SIZE,
    });
  });

  it('follows the Link header to the last page when more than one page exists', async () => {
    const listComments = vi
      .fn()
      // First call: page 1 of 3, with a rel="last" link pointing to page 3.
      .mockResolvedValueOnce({
        data: [comment('old-one'), comment('old-two')],
        headers: {
          link:
            '<https://api.github.com/repositories/1/issues/1/comments?per_page=100&page=3>; rel="last"',
        },
      })
      // Second call: the last page, whose final comment is the newest.
      .mockResolvedValueOnce({
        data: [comment('middle'), comment('newest')],
      });

    const octokit = mockOctokit({ issues: { listComments } });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('newest');
    expect(listComments).toHaveBeenNthCalledWith(2, {
      owner: 'acme',
      repo: 'web',
      issue_number: 1,
      per_page: LAST_COMMENTER_PAGE_SIZE,
      page: 3,
    });
  });

  it('walks back to earlier pages when the last page has only excluded commenters', async () => {
    const botTail = Array(LAST_COMMENTER_PAGE_SIZE).fill(
      comment('github-actions[bot]')
    );
    const listComments = vi
      .fn()
      // Page 1 of 3: returned by the initial fetch. Ends with the most recent
      // eligible human commenter before the bot tail.
      .mockResolvedValueOnce({
        data: [comment('old-one'), comment('alice')],
        headers: {
          link:
            '<https://api.github.com/repositories/1/issues/1/comments?per_page=100&page=3>; rel="last"',
        },
      })
      // Page 3 (fetched first during walk-back): 100 bot comments, nothing eligible.
      .mockResolvedValueOnce({ data: botTail })
      // Page 2 (fetched next): more bot comments.
      .mockResolvedValueOnce({ data: botTail });

    const octokit = mockOctokit({ issues: { listComments } });

    // Falls back to page 1 (reusing the initial fetch) and returns alice.
    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
    // Three network calls: initial fetch, page 3, page 2. Page 1 is reused.
    expect(listComments).toHaveBeenCalledTimes(3);
  });

  it('does not fetch a second page when the first page is the last page', async () => {
    const listComments = vi.fn().mockResolvedValue({
      data: [comment('alice')],
      headers: { link: undefined },
    });
    const octokit = mockOctokit({ issues: { listComments } });

    expect(await getLastCommenter(octokit, 'acme', 'web', 1)).toBe('alice');
    expect(listComments).toHaveBeenCalledTimes(1);
  });
});

describe('parseLastPage', () => {
  it('returns null when the header is missing', () => {
    expect(parseLastPage(undefined)).toBeNull();
  });

  it('returns null when the header has no rel="last" entry', () => {
    const link =
      '<https://api.github.com/repositories/1/issues/1/comments?per_page=100&page=2>; rel="next"';
    expect(parseLastPage(link)).toBeNull();
  });

  it('extracts the last-page number from a full Link header', () => {
    const link =
      '<https://api.github.com/repositories/1/issues/1/comments?per_page=100&page=2>; rel="next", ' +
      '<https://api.github.com/repositories/1/issues/1/comments?per_page=100&page=9>; rel="last"';
    expect(parseLastPage(link)).toBe(9);
  });
});
