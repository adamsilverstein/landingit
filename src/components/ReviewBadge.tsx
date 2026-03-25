import React from 'react';
import type { ReviewState } from '../types.js';

export function ReviewBadge({ state }: { state: ReviewState }) {
  const parts: React.ReactNode[] = [];

  if (state.approvals > 0) {
    parts.push(
      <span key="approved" className="review-badge review-approved" title="Approved">
        ✓{state.approvals}
      </span>
    );
  }
  if (state.changesRequested > 0) {
    parts.push(
      <span key="changes" className="review-badge review-changes" title="Changes requested">
        ✗
      </span>
    );
  }
  if (state.commentCount > 0) {
    parts.push(
      <span key="comments" className="review-badge review-comments" title="Comments">
        💬{state.commentCount}
      </span>
    );
  }

  if (parts.length === 0) return null;
  return <span className="review-badges">{parts}</span>;
}
