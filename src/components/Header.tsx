import React from 'react';
import type { RateLimit } from '../github/client.js';

interface HeaderProps {
  loading: boolean;
  lastRefresh: Date | null;
  repoCount: number;
  itemCount: number;
  unseenCount: number;
  onOpenRepos: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
  autoRefreshSecondsLeft: number | null;
  rateLimit: RateLimit | null;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Header({
  loading,
  lastRefresh,
  repoCount,
  itemCount,
  unseenCount,
  onOpenRepos,
  onSignOut,
  onRefresh,
  autoRefreshSecondsLeft,
  rateLimit,
}: HeaderProps) {
  const rateLimitWarning = rateLimit && rateLimit.remaining < 500;
  const rateLimitCritical = rateLimit && rateLimit.remaining < 100;
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Git Dashboard</h1>
        <span className="header-stats">
          {repoCount} repo{repoCount !== 1 ? 's' : ''} &middot; {itemCount} item
          {itemCount !== 1 ? 's' : ''}
        </span>
        {unseenCount > 0 && (
          <span className="unseen-badge" title={`${unseenCount} PR${unseenCount !== 1 ? 's' : ''} with new activity`}>
            {unseenCount} new
          </span>
        )}
      </div>
      <div className="header-right">
        {loading && <span className="spinner" />}
        {lastRefresh && !loading && (
          <span className="last-refresh">
            {lastRefresh.toLocaleTimeString()}
          </span>
        )}
        {autoRefreshSecondsLeft !== null && !loading && (
          <span className="auto-refresh-countdown" title="Time until next auto-refresh">
            ↻ {formatCountdown(autoRefreshSecondsLeft)}
          </span>
        )}
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh now (r)"
          aria-label="Refresh data"
        >
          {loading ? <span className="spinner" /> : '↻'}
        </button>
        {rateLimit && (
          <span
            className={`rate-limit ${rateLimitCritical ? 'rate-limit-critical' : rateLimitWarning ? 'rate-limit-warning' : ''}`}
            title={`API rate limit: ${rateLimit.remaining}/${rateLimit.limit} remaining. Resets at ${rateLimit.resetAt.toLocaleTimeString()}`}
          >
            {rateLimit.remaining}/{rateLimit.limit}
          </span>
        )}
        <button className="header-btn" onClick={onOpenRepos} title="Manage repos (c)">
          Repos
        </button>
        <button className="header-btn header-btn-subtle" onClick={onSignOut} title="Sign out">
          Sign out
        </button>
      </div>
    </header>
  );
}
