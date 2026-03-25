import React from 'react';

interface HeaderProps {
  loading: boolean;
  lastRefresh: Date | null;
  repoCount: number;
  itemCount: number;
  onOpenRepos: () => void;
  onSignOut: () => void;
}

export function Header({
  loading,
  lastRefresh,
  repoCount,
  itemCount,
  onOpenRepos,
  onSignOut,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Git Dashboard</h1>
        <span className="header-stats">
          {repoCount} repo{repoCount !== 1 ? 's' : ''} &middot; {itemCount} PR
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
