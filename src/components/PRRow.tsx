import React from 'react';
import type { DashboardItem } from '../types.js';
import { CIBadge } from './CIBadge.js';
import { ReviewBadge } from './ReviewBadge.js';
import { LabelBadge } from './LabelBadge.js';
import { timeAgo } from '../utils/timeAgo.js';
import { isMergeReady } from '../utils/mergeReady.js';

export interface PRRowProps {
  item: DashboardItem;
  selected: boolean;
  unseen: boolean;
  stale: boolean;
  onPreview: (item: DashboardItem) => void;
  onOpen: (item: DashboardItem) => void;
  onHideRepo?: (owner: string, name: string) => void;
  visibleColumns: string[];
}

export function PRRow({ item, selected, unseen, stale, onPreview, onOpen, onHideRepo, visibleColumns }: PRRowProps) {

  const handleClick = () => {
    onOpen(item);
    onPreview(item);
  };

  const isPR = item.kind === 'pr';
  const mergeReady = isMergeReady(item);

  const handleHideRepo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHideRepo?.(item.repo.owner, item.repo.name);
  };

  const columnRenderers: Record<string, () => React.ReactNode> = {
    type: () => (
      <td key="type" className="col-type">
        <span className={`type-badge type-${item.kind}`}>
          {isPR ? 'PR' : 'Issue'}
        </span>
      </td>
    ),
    ci: () => (
      <td key="ci" className="col-ci">
        {isPR ? <CIBadge status={item.ciStatus} /> : <span className="ci-badge ci-none"><span className="ci-dot" /></span>}
      </td>
    ),
    repo: () => (
      <td key="repo" className="col-repo">
        {unseen && <span className="unseen-dot" title="New activity" />}
        <span className="repo-name-cell">
          {item.repo.owner}/{item.repo.name}
          {onHideRepo && (
            <button
              className="repo-hide-btn"
              onClick={handleHideRepo}
              title={`Hide ${item.repo.owner}/${item.repo.name}`}
              aria-label={`Hide repository ${item.repo.owner}/${item.repo.name}`}
            >
              ✕
            </button>
          )}
        </span>
      </td>
    ),
    number: () => (
      <td key="number" className="col-number">#{item.number}</td>
    ),
    state: () => (
      <td key="state" className="col-state">
        {isPR ? (
          <span className={`state-badge state-${item.state}`}>
            {item.state === 'merged' ? 'merged' : item.state === 'closed' ? 'closed' : item.draft ? 'draft' : 'open'}
          </span>
        ) : (
          <span className={`state-badge state-${item.state}`}>
            {item.state}
          </span>
        )}
      </td>
    ),
    title: () => (
      <td key="title" className="col-title">
        <span className="title-text">{item.title}</span>
        {mergeReady && (
          <span className="merge-ready-badge" role="img" aria-label="Ready to merge" title="Approved & CI passing — ready to merge">🚀</span>
        )}
        {item.labels.length > 0 && (
          <span className="label-badges">
            {item.labels.map((label) => (
              <LabelBadge key={label.name} label={label} />
            ))}
          </span>
        )}
      </td>
    ),
    author: () => (
      <td key="author" className="col-author">@{item.author}</td>
    ),
    assignees: () => (
      <td key="assignees" className="col-assignees">
        {item.assignees.length > 0
          ? item.assignees.map((a) => `@${a}`).join(', ')
          : <span className="text-muted">&mdash;</span>}
      </td>
    ),
    updated: () => (
      <td key="updated" className="col-updated">
        {stale && <span className="stale-badge" role="img" aria-label="Stale">🕸️</span>}
        {timeAgo(item.updatedAt)}
      </td>
    ),
    reviews: () => (
      <td key="reviews" className="col-reviews">
        {isPR ? (
          <ReviewBadge state={item.reviewState} isRequestedReviewer={item.isRequestedReviewer} />
        ) : (
          item.milestone && <span className="milestone-badge">🏁 {item.milestone.title}</span>
        )}
      </td>
    ),
    lastCommenter: () => (
      <td key="lastCommenter" className="col-last-commenter">
        {item.lastCommenter
          ? `@${item.lastCommenter}`
          : <span className="text-muted">&mdash;</span>}
      </td>
    ),
    link: () => (
      <td key="link" className="col-link">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open on GitHub"
          aria-label="Open on GitHub"
        >
          🔗
        </a>
      </td>
    ),
  };

  return (
    <tr
      className={`pr-row ${selected ? 'pr-row-selected' : ''} ${mergeReady ? 'pr-row-merge-ready' : ''} ${stale ? 'pr-row-stale' : ''}`}
      onClick={handleClick}
    >
      {visibleColumns.map((id) => columnRenderers[id]?.())}
      {/* Empty cell for settings column */}
      <td className="col-settings-spacer" />
    </tr>
  );
}
