import React from 'react';

interface StatusBarProps {
  error: string | null;
}

export function StatusBar({ error }: StatusBarProps) {
  return (
    <footer className="status-bar">
      {error ? (
        <span className="status-error">Error: {error}</span>
      ) : (
        <span className="status-shortcuts">
          <kbd>?</kbd> help &middot; <kbd>j</kbd>/<kbd>k</kbd> navigate &middot;{' '}
          <kbd>Enter</kbd> open &middot; <kbd>f</kbd> filter &middot;{' '}
          <kbd>s</kbd> sort &middot; <kbd>r</kbd> refresh &middot;{' '}
          <kbd>c</kbd> repos
        </span>
      )}
    </footer>
  );
}
