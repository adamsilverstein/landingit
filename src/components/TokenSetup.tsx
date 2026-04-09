import React, { useState } from 'react';

interface TokenSetupProps {
  onSave: (token: string) => void;
  reason?: 'expired' | null;
}

export function TokenSetup({ onSave, reason }: TokenSetupProps) {
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
        {reason === 'expired' ? (
          <p className="token-warning">Your GitHub token is invalid or expired. Please enter a new one.</p>
        ) : (
          <p>Enter a GitHub Personal Access Token to get started.</p>
        )}
        <p className="token-hint">
          To create a token:
        </p>
        <ol className="token-steps">
          <li>Go to{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/settings/tokens
            </a>
          </li>
          <li>Click <strong>Generate new token (classic)</strong></li>
          <li>Select the <code>repo</code> scope</li>
          <li>Copy and paste the token below</li>
        </ol>
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
