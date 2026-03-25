import { describe, it, expect, vi } from 'vitest';
import { fetchUserPRs, fetchAllPRsForRepo } from '../github/pulls.js';
import type { Octokit } from '@octokit/rest';
import type { RepoConfig } from '../types.js';

function mockOctokit(overrides: Record<string, unknown> = {}): Octokit {
  return overrides as unknown as Octokit;
}

describe('fetchUserPRs', () => {
  const repos: RepoConfig[] = [
    { owner: 'acme', name: 'web', enabled: true },
  ];

  it('maps search results to PRItem objects', async () => {
    const octokit = mockOctokit({
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({
          data: {
            total_count: 1,
            items: [
              {
                id: 42,
                number: 7,
                title: 'Fix bug',
                user: { login: 'dev' },
                repository_url: 'https://api.github.com/repos/acme/web',
                html_url: 'https://github.com/acme/web/pull/7',
                updated_at: '2026-01-15T10:00:00Z',
                created_at: '2026-01-10T08:00:00Z',
                pull_request: { merged_at: null },
                state: 'open',
                draft: false,
              },
            ],
          },
        }),
      },
    });

    const items = await fetchUserPRs(octokit, repos, 'dev');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 42,
      number: 7,
      title: 'Fix bug',
      author: 'dev',
      repo: { owner: 'acme', name: 'web' },
      url: 'https://github.com/acme/web/pull/7',
      state: 'open',
      draft: false,
      ciStatus: 'none',
      reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
    });
  });

  it('detects merged PRs from pull_request.merged_at', async () => {
    const octokit = mockOctokit({
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({
          data: {
            total_count: 1,
            items: [
              {
                id: 1,
                number: 1,
                title: 'Merged PR',
                user: { login: 'dev' },
                repository_url: 'https://api.github.com/repos/acme/web',
                html_url: 'https://github.com/acme/web/pull/1',
                updated_at: '2026-01-15T10:00:00Z',
                created_at: '2026-01-10T08:00:00Z',
                pull_request: { merged_at: '2026-01-14T09:00:00Z' },
                state: 'closed',
                draft: false,
              },
            ],
          },
        }),
      },
    });

    const items = await fetchUserPRs(octokit, repos, 'dev');
    expect(items[0].state).toBe('merged');
  });

  it('detects closed (not merged) PRs', async () => {
    const octokit = mockOctokit({
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({
          data: {
            total_count: 1,
            items: [
              {
                id: 2,
                number: 2,
                title: 'Closed PR',
                user: { login: 'dev' },
                repository_url: 'https://api.github.com/repos/acme/web',
                html_url: 'https://github.com/acme/web/pull/2',
                updated_at: '2026-01-15T10:00:00Z',
                created_at: '2026-01-10T08:00:00Z',
                pull_request: { merged_at: null },
                state: 'closed',
                draft: false,
              },
            ],
          },
        }),
      },
    });

    const items = await fetchUserPRs(octokit, repos, 'dev');
    expect(items[0].state).toBe('closed');
  });

  it('defaults author to "unknown" when user is null', async () => {
    const octokit = mockOctokit({
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({
          data: {
            total_count: 1,
            items: [
              {
                id: 3,
                number: 3,
                title: 'No author',
                user: null,
                repository_url: 'https://api.github.com/repos/acme/web',
                html_url: 'https://github.com/acme/web/pull/3',
                updated_at: '2026-01-15T10:00:00Z',
                created_at: '2026-01-10T08:00:00Z',
                pull_request: { merged_at: null },
                state: 'open',
                draft: false,
              },
            ],
          },
        }),
      },
    });

    const items = await fetchUserPRs(octokit, repos, 'dev');
    expect(items[0].author).toBe('unknown');
  });

  it('paginates when results exceed one page', async () => {
    const fn = vi.fn();
    // First page: 100 items
    fn.mockResolvedValueOnce({
      data: {
        total_count: 150,
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          number: i,
          title: `PR ${i}`,
          user: { login: 'dev' },
          repository_url: 'https://api.github.com/repos/acme/web',
          html_url: `https://github.com/acme/web/pull/${i}`,
          updated_at: '2026-01-15T10:00:00Z',
          created_at: '2026-01-10T08:00:00Z',
          pull_request: { merged_at: null },
          state: 'open',
          draft: false,
        })),
      },
    });
    // Second page: 50 items
    fn.mockResolvedValueOnce({
      data: {
        total_count: 150,
        items: Array.from({ length: 50 }, (_, i) => ({
          id: 100 + i,
          number: 100 + i,
          title: `PR ${100 + i}`,
          user: { login: 'dev' },
          repository_url: 'https://api.github.com/repos/acme/web',
          html_url: `https://github.com/acme/web/pull/${100 + i}`,
          updated_at: '2026-01-15T10:00:00Z',
          created_at: '2026-01-10T08:00:00Z',
          pull_request: { merged_at: null },
          state: 'open',
          draft: false,
        })),
      },
    });

    const octokit = mockOctokit({ search: { issuesAndPullRequests: fn } });
    const items = await fetchUserPRs(octokit, repos, 'dev');
    expect(items).toHaveLength(150);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('extracts owner and repo from repository_url', async () => {
    const octokit = mockOctokit({
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({
          data: {
            total_count: 1,
            items: [
              {
                id: 10,
                number: 5,
                title: 'Test',
                user: { login: 'dev' },
                repository_url: 'https://api.github.com/repos/WordPress/gutenberg',
                html_url: 'https://github.com/WordPress/gutenberg/pull/5',
                updated_at: '2026-01-15T10:00:00Z',
                created_at: '2026-01-10T08:00:00Z',
                pull_request: { merged_at: null },
                state: 'open',
                draft: false,
              },
            ],
          },
        }),
      },
    });

    const items = await fetchUserPRs(octokit, repos, 'dev');
    expect(items[0].repo).toEqual({ owner: 'WordPress', name: 'gutenberg' });
  });
});

describe('fetchAllPRsForRepo', () => {
  const repo: RepoConfig = { owner: 'acme', name: 'web', enabled: true };

  it('maps PR list results to PRItem objects', async () => {
    const now = new Date().toISOString();
    const octokit = mockOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 100,
              number: 10,
              title: 'New feature',
              user: { login: 'contributor' },
              html_url: 'https://github.com/acme/web/pull/10',
              updated_at: now,
              created_at: now,
              merged_at: null,
              state: 'open',
              draft: true,
            },
          ],
        }),
      },
    });

    const items = await fetchAllPRsForRepo(octokit, repo, 30);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 100,
      number: 10,
      title: 'New feature',
      author: 'contributor',
      repo: { owner: 'acme', name: 'web' },
      state: 'open',
      draft: true,
      ciStatus: 'none',
    });
  });

  it('detects merged PRs', async () => {
    const now = new Date().toISOString();
    const octokit = mockOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 101,
              number: 11,
              title: 'Merged',
              user: { login: 'dev' },
              html_url: 'https://github.com/acme/web/pull/11',
              updated_at: now,
              created_at: now,
              merged_at: now,
              state: 'closed',
              draft: false,
            },
          ],
        }),
      },
    });

    const items = await fetchAllPRsForRepo(octokit, repo, 30);
    expect(items[0].state).toBe('merged');
  });

  it('detects closed (not merged) PRs', async () => {
    const now = new Date().toISOString();
    const octokit = mockOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 102,
              number: 12,
              title: 'Closed',
              user: { login: 'dev' },
              html_url: 'https://github.com/acme/web/pull/12',
              updated_at: now,
              created_at: now,
              merged_at: null,
              state: 'closed',
              draft: false,
            },
          ],
        }),
      },
    });

    const items = await fetchAllPRsForRepo(octokit, repo, 30);
    expect(items[0].state).toBe('closed');
  });

  it('filters out PRs older than 30 days', async () => {
    const now = new Date().toISOString();
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const octokit = mockOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              number: 1,
              title: 'Recent',
              user: { login: 'dev' },
              html_url: 'https://github.com/acme/web/pull/1',
              updated_at: now,
              created_at: now,
              merged_at: null,
              state: 'open',
              draft: false,
            },
            {
              id: 2,
              number: 2,
              title: 'Old',
              user: { login: 'dev' },
              html_url: 'https://github.com/acme/web/pull/2',
              updated_at: oldDate,
              created_at: oldDate,
              merged_at: null,
              state: 'open',
              draft: false,
            },
          ],
        }),
      },
    });

    const items = await fetchAllPRsForRepo(octokit, repo, 30);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Recent');
  });

  it('clamps maxPerRepo between 1 and 100', async () => {
    const listFn = vi.fn().mockResolvedValue({ data: [] });
    const octokit = mockOctokit({ pulls: { list: listFn } });

    await fetchAllPRsForRepo(octokit, repo, 200);
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 100 }),
    );

    await fetchAllPRsForRepo(octokit, repo, -5);
    expect(listFn).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 1 }),
    );
  });

  it('defaults author to "unknown" when user is null', async () => {
    const now = new Date().toISOString();
    const octokit = mockOctokit({
      pulls: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: 50,
              number: 50,
              title: 'No user',
              user: null,
              html_url: 'https://github.com/acme/web/pull/50',
              updated_at: now,
              created_at: now,
              merged_at: null,
              state: 'open',
              draft: false,
            },
          ],
        }),
      },
    });

    const items = await fetchAllPRsForRepo(octokit, repo, 30);
    expect(items[0].author).toBe('unknown');
  });
});
