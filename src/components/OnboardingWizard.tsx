import React, { useState } from 'react';
import type { RepoConfig } from '../types.js';

interface OnboardingWizardProps {
  username: string | null;
  repos: RepoConfig[];
  onAddRepo: (owner: string, name: string) => void;
  onFinish: () => void;
  onSignOut: () => void;
}

type Step = 'welcome' | 'add' | 'confirm';

export function OnboardingWizard({
  username,
  repos,
  onAddRepo,
  onFinish,
  onSignOut,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = input.trim().replace(/^https?:\/\/github\.com\//, '');
    const parts = trimmed.split('/').filter(Boolean);
    if (parts.length !== 2) {
      setError('Enter a repository in owner/name format (e.g., facebook/react).');
      return;
    }
    const [owner, name] = parts;
    if (repos.some((r) => r.owner === owner && r.name === name)) {
      setError(`${owner}/${name} is already in your list.`);
      return;
    }
    onAddRepo(owner, name);
    setInput('');
    setStep('confirm');
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <ProgressIndicator step={step} />

        {step === 'welcome' && (
          <WelcomeStep
            username={username}
            onNext={() => setStep('add')}
            onSignOut={onSignOut}
          />
        )}

        {step === 'add' && (
          <AddRepoStep
            input={input}
            onInputChange={(v) => {
              setInput(v);
              if (error) setError(null);
            }}
            onSubmit={handleAdd}
            error={error}
            hasRepos={repos.length > 0}
            onBack={() => setStep('welcome')}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            repos={repos}
            onAddAnother={() => setStep('add')}
            onFinish={onFinish}
          />
        )}
      </div>
    </div>
  );
}

function ProgressIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'welcome', label: 'Welcome' },
    { key: 'add', label: 'Add repo' },
    { key: 'confirm', label: 'Done' },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);
  return (
    <ol className="onboarding-progress" aria-label="Setup progress">
      {steps.map((s, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
        return (
          <li key={s.key} className={`onboarding-step onboarding-step-${state}`}>
            <span className="onboarding-step-dot" aria-hidden="true">{i + 1}</span>
            <span className="onboarding-step-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function WelcomeStep({
  username,
  onNext,
  onSignOut,
}: {
  username: string | null;
  onNext: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <h1>Welcome to LandinGit{username ? `, ${username}` : ''}</h1>
      <p>
        LandinGit gives you a fast, keyboard-driven dashboard for the pull
        requests and issues you care about across multiple GitHub repositories.
      </p>
      <ul className="onboarding-feature-list">
        <li>Track PRs you authored, were assigned, or are involved in.</li>
        <li>See CI status, review state, and stale work at a glance.</li>
        <li>Filter, search, and jump to any item without leaving the keyboard.</li>
      </ul>
      <p className="onboarding-cta-hint">
        First, let's connect a repository to monitor.
      </p>
      <button type="button" className="token-btn" onClick={onNext}>
        Get started
      </button>
      <p className="token-fallback">
        <button type="button" className="token-link-btn" onClick={onSignOut}>
          Sign out
        </button>
      </p>
    </>
  );
}

function AddRepoStep({
  input,
  onInputChange,
  onSubmit,
  error,
  hasRepos,
  onBack,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  hasRepos: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <h1>Add a repository</h1>
      <p>
        Enter the GitHub repository you'd like to track. You can add more later
        from the Manage Repositories dialog.
      </p>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="owner/repo (e.g., facebook/react)"
          className="token-input"
          aria-label="Repository owner and name"
          autoFocus
        />
        {error && <p className="token-error" role="alert">{error}</p>}
        <button type="submit" className="token-btn" disabled={!input.trim()}>
          Add repository
        </button>
      </form>
      <p className="token-fallback">
        <button type="button" className="token-link-btn" onClick={onBack}>
          {hasRepos ? 'Back' : 'Back to welcome'}
        </button>
      </p>
    </>
  );
}

function ConfirmStep({
  repos,
  onAddAnother,
  onFinish,
}: {
  repos: RepoConfig[];
  onAddAnother: () => void;
  onFinish: () => void;
}) {
  return (
    <>
      <h1>You're all set</h1>
      <p>
        {repos.length === 1
          ? "Great — you're tracking your first repository:"
          : `Great — you're tracking ${repos.length} repositories:`}
      </p>
      <ul className="onboarding-repo-list">
        {repos.map((r) => (
          <li key={`${r.owner}/${r.name}`}>
            <code>{r.owner}/{r.name}</code>
          </li>
        ))}
      </ul>
      <button type="button" className="token-btn" onClick={onFinish}>
        Open dashboard
      </button>
      <p className="token-fallback">
        <button type="button" className="token-link-btn" onClick={onAddAnother}>
          Add another repository
        </button>
      </p>
    </>
  );
}
