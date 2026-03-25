import React, { useState } from 'react';

interface TokenSetupProps {
  onSave: (token: string) => void;
}

export function TokenSetup({ onSave }: TokenSetupProps) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  return (
    <div className="token-setup">
      <div className="token-card">
        <h1>Git Dashboard</h1>
        <p>Enter a GitHub Personal Access Token to get started.</p>
        <p className="token-hint">
          Create one at{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/settings/tokens
          </a>{' '}
          with <code>repo</code> scope.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="token-input"
            autoFocus
          />
          <button type="submit" className="token-btn" disabled={!token.trim()}>
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
