import React, { useEffect, useRef } from 'react';
import type { PRItem } from '../types.js';
import { CIBadge } from './CIBadge.js';
import { ReviewBadge } from './ReviewBadge.js';
import { timeAgo } from '../utils/timeAgo.js';

interface PRRowProps {
  item: PRItem;
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

  return (
    <tr
      ref={ref}
      className={`pr-row ${selected ? 'pr-row-selected' : ''}`}
      onClick={handleClick}
    >
      <td className="col-ci">
        <CIBadge status={item.ciStatus} />
      </td>
      <td className="col-repo">
        {item.repo.owner}/{item.repo.name}
      </td>
      <td className="col-number">#{item.number}</td>
      <td className="col-state">
        <span className={`state-badge state-${item.state}`}>
          {item.state === 'merged' ? 'merged' : item.state === 'closed' ? 'closed' : item.draft ? 'draft' : 'open'}
        </span>
      </td>
      <td className="col-title">
        {item.title}
      </td>
      <td className="col-author">@{item.author}</td>
      <td className="col-updated">{timeAgo(item.updatedAt)}</td>
      <td className="col-reviews">
        <ReviewBadge state={item.reviewState} />
      </td>
    </tr>
  );
}
