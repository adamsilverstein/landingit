import React from 'react';
import { version } from '../../package.json';
import { authMethodLabel, type AuthMethod } from '../../shared/auth/method.js';

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
  authMethod: AuthMethod | null;
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
  authMethod,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title-block">
          <h1 className="header-title">LandinGit</h1>
          <span className="header-version">v{version}</span>
        </div>
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
        <button className="header-btn" onClick={onOpenRepos} title="Manage repos (c)">
          Repos
        </button>
        {authMethod && (
          <span
            className={`auth-method-badge auth-method-${authMethod}`}
            title={`Connected via ${authMethodLabel(authMethod)}`}
          >
            {authMethod === 'oauth' ? 'OAuth' : 'PAT'}
          </span>
        )}
        <button className="header-btn header-btn-subtle" onClick={onSignOut} title="Sign out">
          Sign out
        </button>
      </div>
    </header>
  );
}
