import React, { useEffect, useRef } from 'react';
import type { DashboardItem } from '../types.js';
import { CIBadge } from './CIBadge.js';
import { ReviewBadge } from './ReviewBadge.js';
import { LabelBadge } from './LabelBadge.js';
import { timeAgo } from '../utils/timeAgo.js';

interface PRRowProps {
  item: DashboardItem;
  selected: boolean;
}

export function PRRow({ item, selected }: PRRowProps) {
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selected]);

  const handleClick = () => {
    window.open(item.url, '_blank');
  };

  const isPR = item.kind === 'pr';

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
        {item.repo.owner}/{item.repo.name}
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
          <ReviewBadge state={item.reviewState} />
        ) : (
          item.milestone && <span className="milestone-badge">🏁 {item.milestone}</span>
        )}
      </td>
    </tr>
  );
}
