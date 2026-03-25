import React from 'react';

interface HeaderProps {
  loading: boolean;
  lastRefresh: Date | null;
  repoCount: number;
  itemCount: number;
  onOpenRepos: () => void;
  onSignOut: () => void;
  autoRefreshSecondsLeft: number | null;
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
  onOpenRepos,
  onSignOut,
  autoRefreshSecondsLeft,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Git Dashboard</h1>
        <span className="header-stats">
          {repoCount} repo{repoCount !== 1 ? 's' : ''} &middot; {itemCount} item
          {itemCount !== 1 ? 's' : ''}
        </span>
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
