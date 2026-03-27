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
}

export function PRRow({ item, selected, unseen, stale, onPreview, onOpen, onHideRepo }: PRRowProps) {

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

  return (
    <tr
      className={`pr-row ${selected ? 'pr-row-selected' : ''} ${mergeReady ? 'pr-row-merge-ready' : ''} ${stale ? 'pr-row-stale' : ''}`}
      onClick={handleClick}
    >
      <td className="col-type">
        <span className={`type-badge type-${item.kind}`}>
          {isPR ? 'PR' : 'Issue'}
        </span>
      </td>
      <td className="col-ci">
        {isPR ? <CIBadge status={item.ciStatus} /> : <span className="ci-badge ci-none"><span className="ci-dot" /></span>}
      </td>
      <td className="col-repo">
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
      <td className="col-number">#{item.number}</td>
      <td className="col-state">
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
      <td className="col-title">
        <span className="title-text">{item.title}</span>
        {mergeReady && (
          <span className="merge-ready-badge" role="img" aria-label="Ready to merge" title="Approved & CI passing — ready to merge">🚀</span>
        )}
        {!isPR && item.labels.length > 0 && (
          <span className="label-badges">
            {item.labels.map((label) => (
              <LabelBadge key={label.name} label={label} />
            ))}
          </span>
        )}
      </td>
      <td className="col-author">@{item.author}</td>
      <td className="col-assignees">
        {item.assignees.length > 0
          ? item.assignees.map((a) => `@${a}`).join(', ')
          : <span className="text-muted">&mdash;</span>}
      </td>
      <td className="col-updated">
        {stale && <span className="stale-badge" role="img" aria-label="Stale">🕸️</span>}
        {timeAgo(item.updatedAt)}
      </td>
      <td className="col-reviews">
        {isPR ? (
          <ReviewBadge state={item.reviewState} isRequestedReviewer={item.isRequestedReviewer} />
        ) : (
          item.milestone && <span className="milestone-badge">🏁 {item.milestone}</span>
        )}
      </td>
      <td className="col-link">
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
    </tr>
  );
}
