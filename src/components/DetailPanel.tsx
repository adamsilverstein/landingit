import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Octokit } from '@octokit/rest';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DashboardItem, PRItem, PRDetail } from '../types.js';
import { getPRDetails } from '../github/details.js';
import { CIBadge } from './CIBadge.js';
import { timeAgo } from '../utils/timeAgo.js';

interface DetailPanelProps {
  item: DashboardItem;
  octokit: Octokit;
  onClose: () => void;
}

function CheckRunRow({ name, conclusion, status }: { name: string; conclusion: string | null; status: string }) {
  let icon = '⏳';
  let label = 'Pending';
  let cls = 'check-pending';
  if (status === 'completed') {
    if (conclusion === 'success' || conclusion === 'skipped' || conclusion === 'neutral') {
      icon = '✓';
      label = conclusion === 'success' ? 'Passed' : conclusion === 'skipped' ? 'Skipped' : 'Neutral';
      cls = 'check-success';
    } else if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled' || conclusion === 'action_required') {
      icon = '✗';
      label = conclusion === 'failure' ? 'Failed' : conclusion === 'timed_out' ? 'Timed out' : conclusion === 'cancelled' ? 'Cancelled' : 'Action required';
      cls = 'check-failure';
    } else {
      icon = '●';
      label = 'Mixed';
      cls = 'check-mixed';
    }
  }
  return (
    <div className={`detail-check ${cls}`}>
      <span className="detail-check-icon" role="img" aria-label={label}>{icon}</span>
      <span className="detail-check-name">{name}</span>
    </div>
  );
}

function ReviewerRow({ login, state }: { login: string; state: string }) {
  let icon = '💬';
  let label = 'Commented';
  let cls = 'reviewer-commented';
  if (state === 'APPROVED') {
    icon = '✓';
    label = 'Approved';
    cls = 'reviewer-approved';
  } else if (state === 'CHANGES_REQUESTED') {
    icon = '✗';
    label = 'Changes requested';
    cls = 'reviewer-changes';
  }
  return (
    <div className={`detail-reviewer ${cls}`}>
      <span className="detail-reviewer-icon" role="img" aria-label={label}>{icon}</span>
      <span>@{login}</span>
    </div>
  );
}

export function DetailPanel({ item, octokit, onClose }: DetailPanelProps) {
  const [detail, setDetail] = useState<PRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isPR = item.kind === 'pr';

  useEffect(() => {
    if (!isPR) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPRDetails(octokit, item as PRItem).then(
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
  }, [octokit, item, isPR]);

  // Focus trap: keep focus within the panel while it's open
  useEffect(() => {
    // Focus the close button when the panel opens
    closeButtonRef.current?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  const stateLabel =
    isPR
      ? (item as PRItem).state === 'merged'
        ? 'merged'
        : (item as PRItem).state === 'closed'
          ? 'closed'
          : (item as PRItem).draft
            ? 'draft'
            : 'open'
      : item.state;

  return (
    <div className="detail-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Details for: ${item.title}`}>
      <div className="detail-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-top">
            <span className="detail-repo">
              {item.repo.owner}/{item.repo.name}
            </span>
            <button ref={closeButtonRef} className="detail-close" onClick={onClose} aria-label="Close detail panel">
              ✕
            </button>
          </div>
          <h2 className="detail-title">{item.title}</h2>
          <div className="detail-meta">
            <span className={`state-badge state-${stateLabel}`}>{stateLabel}</span>
            <span className="detail-number">#{item.number}</span>
            <span className="detail-author">by @{item.author}</span>
            {isPR && <CIBadge status={(item as PRItem).ciStatus} />}
          </div>
        </div>

        {loading && (
          <div className="detail-loading">
            <span className="spinner" role="status" aria-label="Loading" /> Loading details…
          </div>
        )}

        {error && <div className="detail-error" role="alert">{error}</div>}

        {detail && !loading && (
          <div className="detail-body">
            {/* Branch info */}
            {detail.headBranch && (
              <div className="detail-section">
                <div className="detail-branch">
                  <code>{detail.headBranch}</code>
                  <span className="detail-branch-arrow" aria-hidden="true">→</span>
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

            {/* Description — rendered as GitHub-flavored markdown */}
            {detail.body && (
              <div className="detail-section">
                <h3 className="detail-section-title">Description</h3>
                <div className="detail-description markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.body}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Check Runs */}
            {detail.checkRuns.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  Checks ({detail.checkRuns.length})
                </h3>
                <div className="detail-checks">
                  {detail.checkRuns.map((run, i) => (
                    <CheckRunRow
                      key={`${run.name}-${i}`}
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
