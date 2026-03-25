import React, { useEffect, useState } from 'react';
import type { Octokit } from '@octokit/rest';
import type { PRItem, PRDetail } from '../types.js';
import { getPRDetails } from '../github/details.js';
import { CIBadge } from './CIBadge.js';
import { timeAgo } from '../utils/timeAgo.js';

interface DetailPanelProps {
  item: PRItem;
  octokit: Octokit;
  onClose: () => void;
}

function CheckRunRow({ name, conclusion, status }: { name: string; conclusion: string | null; status: string }) {
  let icon = '⏳';
  let cls = 'check-pending';
  if (status === 'completed') {
    if (conclusion === 'success' || conclusion === 'skipped' || conclusion === 'neutral') {
      icon = '✓';
      cls = 'check-success';
    } else if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled' || conclusion === 'action_required') {
      icon = '✗';
      cls = 'check-failure';
    } else {
      icon = '●';
      cls = 'check-mixed';
    }
  }
  return (
    <div className={`detail-check ${cls}`}>
      <span className="detail-check-icon">{icon}</span>
      <span className="detail-check-name">{name}</span>
    </div>
  );
}

function ReviewerRow({ login, state }: { login: string; state: string }) {
  let icon = '💬';
  let cls = 'reviewer-commented';
  if (state === 'APPROVED') {
    icon = '✓';
    cls = 'reviewer-approved';
  } else if (state === 'CHANGES_REQUESTED') {
    icon = '✗';
    cls = 'reviewer-changes';
  }
  return (
    <div className={`detail-reviewer ${cls}`}>
      <span className="detail-reviewer-icon">{icon}</span>
      <span>@{login}</span>
    </div>
  );
}

export function DetailPanel({ item, octokit, onClose }: DetailPanelProps) {
  const [detail, setDetail] = useState<PRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPRDetails(octokit, item).then(
      (d) => {
        if (!cancelled) {
          setDetail(d);
          setLoading(false);
        }
      },
      (e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load details');
          setLoading(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [octokit, item]);

  const stateLabel =
    item.state === 'merged'
      ? 'merged'
      : item.state === 'closed'
        ? 'closed'
        : item.draft
          ? 'draft'
          : 'open';

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-top">
            <span className="detail-repo">
              {item.repo.owner}/{item.repo.name}
            </span>
            <button className="detail-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <h2 className="detail-title">{item.title}</h2>
          <div className="detail-meta">
            <span className={`state-badge state-${stateLabel}`}>{stateLabel}</span>
            <span className="detail-number">#{item.number}</span>
            <span className="detail-author">by @{item.author}</span>
            <CIBadge status={item.ciStatus} />
          </div>
        </div>

        {loading && (
          <div className="detail-loading">
            <span className="spinner" /> Loading details…
          </div>
        )}

        {error && <div className="detail-error">{error}</div>}

        {detail && !loading && (
          <div className="detail-body">
            {/* Branch info */}
            {detail.headBranch && (
              <div className="detail-section">
                <div className="detail-branch">
                  <code>{detail.headBranch}</code>
                  <span className="detail-branch-arrow">→</span>
                  <code>{detail.baseBranch}</code>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="detail-section">
              <div className="detail-stats">
                <span className="stat-additions">+{detail.additions}</span>
                <span className="stat-deletions">−{detail.deletions}</span>
                <span className="stat-files">{detail.changedFiles} files</span>
              </div>
              <div className="detail-dates">
                <span>Created {timeAgo(item.createdAt)}</span>
                <span>Updated {timeAgo(item.updatedAt)}</span>
              </div>
            </div>

            {/* Labels */}
            {detail.labels.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">Labels</h3>
                <div className="detail-labels">
                  {detail.labels.map((label) => (
                    <span key={label} className="detail-label">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {detail.body && (
              <div className="detail-section">
                <h3 className="detail-section-title">Description</h3>
                <div className="detail-description">{detail.body}</div>
              </div>
            )}

            {/* Check Runs */}
            {detail.checkRuns.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  Checks ({detail.checkRuns.length})
                </h3>
                <div className="detail-checks">
                  {detail.checkRuns.map((run) => (
                    <CheckRunRow
                      key={run.name}
                      name={run.name}
                      conclusion={run.conclusion}
                      status={run.status}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reviewers */}
            {detail.reviewers.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">Reviews</h3>
                <div className="detail-reviewers">
                  {detail.reviewers.map((r) => (
                    <ReviewerRow key={r.login} login={r.login} state={r.state} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="detail-footer">
          <a
            className="detail-open-btn"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in GitHub ↗
          </a>
          <span className="detail-hint">
            <kbd>Esc</kbd> close &middot; <kbd>Enter</kbd> open in browser
          </span>
        </div>
      </div>
    </div>
  );
}
