import React, { useEffect, useMemo, useState } from 'react';
import { copyTextToClipboard } from '../auth/electronBridge.js';
import { getOAuthAvailability } from '../auth/oauthConfig.js';
import { useDeviceFlow } from '../auth/useDeviceFlow.js';

interface TokenSetupProps {
  onSave: (token: string) => void;
  reason?: 'expired' | null;
}

type Mode = 'oauth' | 'pat';

export function TokenSetup({ onSave, reason }: TokenSetupProps) {
  // OAuth availability is fixed for the lifetime of the page; compute once.
  const oauthAvailability = useMemo(() => getOAuthAvailability(), []);
  const [mode, setMode] = useState<Mode>(oauthAvailability.available ? 'oauth' : 'pat');

  const { state, start, cancel } = useDeviceFlow();
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  // Persist the token as soon as polling succeeds.
  useEffect(() => {
    if (state.status === 'success' && state.token) {
      onSave(state.token);
    }
  }, [state.status, state.token, onSave]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (trimmed) onSave(trimmed);
  };

  const switchToPat = () => {
    cancel();
    setMode('pat');
  };

  const switchToOAuth = () => {
    setMode('oauth');
  };

  const copyCode = async () => {
    if (!state.device?.user_code) return;
    const ok = await copyTextToClipboard(state.device.user_code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="token-setup">
      <div className="token-card">
        <h1>Git Dashboard</h1>
        {reason === 'expired' && (
          <p className="token-warning">Your GitHub credentials are invalid or expired. Please reconnect.</p>
        )}

        {mode === 'oauth' && oauthAvailability.available ? (
          <OAuthPanel
            state={state}
            onStart={start}
            onCancel={cancel}
            onCopyCode={copyCode}
            copied={copied}
            onUsePat={switchToPat}
          />
        ) : (
          <PatPanel
            token={token}
            onTokenChange={setToken}
            onSubmit={handleSubmit}
            oauthReason={oauthAvailability.available ? null : oauthAvailability.reason ?? null}
            onUseOAuth={oauthAvailability.available ? switchToOAuth : undefined}
          />
        )}
      </div>
    </div>
  );
}

function OAuthPanel({
  state,
  onStart,
  onCancel,
  onCopyCode,
  copied,
  onUsePat,
}: {
  state: ReturnType<typeof useDeviceFlow>['state'];
  onStart: () => void;
  onCancel: () => void;
  onCopyCode: () => void;
  copied: boolean;
  onUsePat: () => void;
}) {
  if (state.status === 'awaiting' && state.device) {
    return (
      <>
        <p>Authorize Git Dashboard on GitHub to finish signing in.</p>
        <ol className="token-steps">
          <li>
            Open{' '}
            <a href={state.device.verification_uri} target="_blank" rel="noopener noreferrer">
              {state.device.verification_uri}
            </a>{' '}
            (a new tab should already be open).
          </li>
          <li>Enter the code below.</li>
          <li>Approve access — the dashboard will continue automatically.</li>
        </ol>
        <div className="token-user-code" aria-label="One-time device code">
          <code>{state.device.user_code}</code>
          <button type="button" className="token-link-btn" onClick={onCopyCode}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="token-hint">Waiting for you to approve in GitHub…</p>
        <button type="button" className="token-btn token-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <p className="token-fallback">
          Trouble signing in?{' '}
          <button type="button" className="token-link-btn" onClick={onUsePat}>
            Use a Personal Access Token instead
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <p>Sign in with your GitHub account to read pull requests across your repos.</p>
      {state.status === 'error' && state.error && <p className="token-error">{state.error}</p>}
      <button
        type="button"
        className="token-btn"
        onClick={onStart}
        disabled={state.status === 'requesting'}
      >
        {state.status === 'requesting' ? 'Connecting…' : 'Connect with GitHub'}
      </button>
      <p className="token-fallback">
        Prefer a manual token?{' '}
        <button type="button" className="token-link-btn" onClick={onUsePat}>
          Use a Personal Access Token instead
        </button>
      </p>
    </>
  );
}

function PatPanel({
  token,
  onTokenChange,
  onSubmit,
  oauthReason,
  onUseOAuth,
}: {
  token: string;
  onTokenChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  oauthReason: string | null;
  onUseOAuth?: () => void;
}) {
  return (
    <>
      <p>Enter a GitHub Personal Access Token to get started.</p>
      {oauthReason && <p className="token-hint token-fallback-note">{oauthReason}</p>}
      <p className="token-hint">To create a token:</p>
      <ol className="token-steps">
        <li>
          Go to{' '}
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
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="ghp_..."
          className="token-input"
          autoFocus
        />
        <button type="submit" className="token-btn" disabled={!token.trim()}>
          Save & Continue
        </button>
      </form>
      {onUseOAuth && (
        <p className="token-fallback">
          <button type="button" className="token-link-btn" onClick={onUseOAuth}>
            Connect with GitHub OAuth instead
          </button>
        </p>
      )}
    </>
  );
}
