import React from 'react';
import type { RepoFetchError } from '../types.js';

interface StatusBarProps {
  error: string | null;
  failedRepos: RepoFetchError[];
  searchQuery: string;
  matchCount: number;
  totalCount: number;
}

export function StatusBar({ error, failedRepos, searchQuery, matchCount, totalCount }: StatusBarProps) {
  return (
    <footer className="status-bar">
      {error ? (
        <span className="status-error">Error: {error}</span>
      ) : failedRepos.length > 0 ? (
        <span className="status-warning">
          ⚠ Failed to fetch: {failedRepos.map((f) => f.repo).join(', ')}
        </span>
      ) : (
        <span className="status-shortcuts">
          {searchQuery.trim() && (
            <span className="status-match-count">
              {matchCount} of {totalCount} match{matchCount !== 1 ? 'es' : ''}
              {' '}&middot;{' '}
            </span>
          )}
          <kbd>?</kbd> help &middot; <kbd>j</kbd>/<kbd>k</kbd> navigate &middot;{' '}
          <kbd>Enter</kbd> open &middot; <kbd>/</kbd> search &middot;{' '}
          <kbd>f</kbd> filter &middot;{' '}
          <kbd>s</kbd> sort &middot; <kbd>r</kbd> refresh &middot;{' '}
          <kbd>c</kbd> repos &middot; <kbd>t</kbd> theme
        </span>
      )}
    </footer>
  );
}
