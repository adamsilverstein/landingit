import React from 'react';
import { AuthPanel } from './AuthPanel.js';

interface TokenSetupProps {
  onSave: (token: string) => void;
  reason?: 'expired' | null;
}

export function TokenSetup({ onSave, reason }: TokenSetupProps) {
  return (
    <div className="token-setup">
      <div className="token-card">
        <h1>LandinGit</h1>
        {reason === 'expired' && (
          <p className="token-warning">Your GitHub credentials are invalid or expired. Please reconnect.</p>
        )}
        <AuthPanel onSave={onSave} />
      </div>
    </div>
  );
}
