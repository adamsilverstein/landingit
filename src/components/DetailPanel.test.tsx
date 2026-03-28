import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DetailPanel } from './DetailPanel.js';
import type { PRItem, PRDetail, TimelineEvent } from '../types.js';

// Mock getPRDetails to avoid real API calls
vi.mock('../github/details.js', () => ({
  getPRDetails: vi.fn(),
}));

import { getPRDetails } from '../github/details.js';
const mockedGetPRDetails = vi.mocked(getPRDetails);

const makePRItem = (overrides: Partial<PRItem> = {}): PRItem => ({
  kind: 'pr',
  id: 1,
  number: 42,
  title: 'Test PR',
  author: 'testuser',
  repo: { owner: 'acme', name: 'web' },
  url: 'https://github.com/acme/web/pull/42',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ciStatus: 'success',
  reviewState: { approvals: 0, changesRequested: 0, commentCount: 0 },
  draft: false,
  state: 'open',
  isRequestedReviewer: false,
  assignees: [],
  labels: [],
  ...overrides,
});

const makeDetail = (overrides: Partial<PRDetail> = {}): PRDetail => ({
  body: '',
  labels: [],
  checkRuns: [],
  reviewers: [],
  additions: 10,
  deletions: 5,
  changedFiles: 3,
  headBranch: 'feature',
  baseBranch: 'main',
  timeline: [],
  ...overrides,
});

const fakeOctokit = {} as any;

describe('DetailPanel markdown rendering', () => {
  it('renders markdown in the description', async () => {
    const md = '**bold text** and a [link](https://example.com)';
    mockedGetPRDetails.mockResolvedValue(makeDetail({ body: md }));

    const { container } = render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    const desc = container.querySelector('.detail-description');
    expect(desc).not.toBeNull();
    // bold text should be in a <strong> tag
    const strong = desc!.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('bold text');
    // link should be an <a> tag
    const link = desc!.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://example.com');
    expect(link!.textContent).toBe('link');
  });

  it('renders GFM features like task lists', async () => {
    const md = '- [x] Done\n- [ ] Todo';
    mockedGetPRDetails.mockResolvedValue(makeDetail({ body: md }));

    const { container } = render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    const desc = container.querySelector('.detail-description');
    const checkboxes = desc!.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('renders code blocks as <pre><code>', async () => {
    const md = '```js\nconsole.log("hello");\n```';
    mockedGetPRDetails.mockResolvedValue(makeDetail({ body: md }));

    const { container } = render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    const desc = container.querySelector('.detail-description');
    const pre = desc!.querySelector('pre');
    expect(pre).not.toBeNull();
    const code = pre!.querySelector('code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toContain('console.log');
  });

  it('does not render description section when body is empty', async () => {
    mockedGetPRDetails.mockResolvedValue(makeDetail({ body: '' }));

    render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/files/)).toBeInTheDocument();
    });

    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });
});

function makeTimelineEvents(count: number): TimelineEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `evt-${i}`,
    type: 'commented' as const,
    actor: `user${i}`,
    createdAt: new Date(Date.now() - (count - i) * 60000).toISOString(),
    body: `Comment ${i}`,
  }));
}

describe('DetailPanel timeline / activity feed', () => {
  it('renders timeline events', async () => {
    const timeline = makeTimelineEvents(3);
    mockedGetPRDetails.mockResolvedValue(makeDetail({ timeline }));

    const { container } = render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Activity (3)')).toBeInTheDocument();
    });

    const events = container.querySelectorAll('.timeline-event');
    expect(events.length).toBe(3);
  });

  it('shows only 10 events initially with a load-more button', async () => {
    const timeline = makeTimelineEvents(15);
    mockedGetPRDetails.mockResolvedValue(makeDetail({ timeline }));

    const { container } = render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Activity (15)')).toBeInTheDocument();
    });

    const events = container.querySelectorAll('.timeline-event');
    expect(events.length).toBe(10);

    const loadMore = screen.getByText(/Show more/);
    expect(loadMore).toBeInTheDocument();
    expect(loadMore.textContent).toContain('5 remaining');
  });

  it('does not show activity section when timeline is empty', async () => {
    mockedGetPRDetails.mockResolvedValue(makeDetail({ timeline: [] }));

    render(
      <DetailPanel item={makePRItem()} octokit={fakeOctokit} onClose={() => {}} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/files/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Activity/)).not.toBeInTheDocument();
  });
});
