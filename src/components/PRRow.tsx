import React, { useEffect, useRef } from 'react';
import type { DashboardItem } from '../types.js';
import { CIBadge } from './CIBadge.js';
import { ReviewBadge } from './ReviewBadge.js';
import { LabelBadge } from './LabelBadge.js';
import { timeAgo } from '../utils/timeAgo.js';

export interface PRRowProps {
  item: DashboardItem;
  selected: boolean;
  unseen: boolean;
  onPreview: (item: DashboardItem) => void;
  onOpen: (item: DashboardItem) => void;
  onHideRepo?: (owner: string, name: string) => void;
}

export function PRRow({ item, selected, unseen, onPreview, onOpen, onHideRepo }: PRRowProps) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selected]);

  const handleClick = () => {
    onOpen(item);
    onPreview(item);
  };

  const isPR = item.kind === 'pr';

  const handleHideRepo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHideRepo?.(item.repo.owner, item.repo.name);
  };

  return (
    <tr
      ref={ref}
      className={`pr-row ${selected ? 'pr-row-selected' : ''}`}
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
        {!isPR && item.labels.length > 0 && (
          <span className="label-badges">
            {item.labels.map((label) => (
              <LabelBadge key={label.name} label={label} />
            ))}
          </span>
        )}
      </td>
      <td className="col-author">@{item.author}</td>
      <td className="col-updated">{timeAgo(item.updatedAt)}</td>
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
