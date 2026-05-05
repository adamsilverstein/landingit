import React, { useEffect, useState } from 'react';
import type { RepoConfig } from '../types.js';
import { parseRepoInput } from '../../shared/utils/parseRepoInput.js';
import { AuthPanel } from './AuthPanel.js';

interface OnboardingWizardProps {
  token: string | null;
  username: string | null;
  repos: RepoConfig[];
  onSaveToken: (token: string) => void;
  onAddRepo: (owner: string, name: string) => void;
  onFinish: () => void;
  onSignOut: () => void;
}

type Step = 'welcome' | 'connect' | 'add' | 'confirm';

const STEPS: { key: Step; title: string; subtitle: string }[] = [
  { key: 'welcome', title: 'Welcome', subtitle: 'Get to know LandinGit' },
  { key: 'connect', title: 'Connect GitHub', subtitle: 'Authorize access' },
  { key: 'add', title: 'Choose repositories', subtitle: 'Pick what to monitor' },
  { key: 'confirm', title: "You're ready", subtitle: 'Open the dashboard' },
];

export function OnboardingWizard({
  token,
  username,
  repos,
  onSaveToken,
  onAddRepo,
  onFinish,
  onSignOut,
}: OnboardingWizardProps) {
  // Returning users with a token already set start at "Choose repositories";
  // brand-new users walk through the full flow from "Welcome".
  const [step, setStep] = useState<Step>(() => (token ? 'add' : 'welcome'));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-advance from Connect step once authentication completes.
  useEffect(() => {
    if (step === 'connect' && token && username) {
      setStep('add');
    }
  }, [step, token, username]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const result = parseRepoInput(input, repos);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onAddRepo(result.owner, result.name);
    setInput('');
    setStep('confirm');
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <aside className="onboarding-rail">
          <div className="onboarding-brand">
            <BrandMark />
            <div>
              <div className="onboarding-brand-name">LandinGit</div>
              <div className="onboarding-brand-tag">where prs land</div>
            </div>
          </div>
          <ol className="onboarding-rail-steps" aria-label="Setup progress">
            {STEPS.map((s, i) => {
              const activeIndex = STEPS.findIndex((x) => x.key === step);
              const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
              return (
                <li
                  key={s.key}
                  className={`onboarding-rail-step onboarding-rail-step-${state}`}
                  aria-current={state === 'active' ? 'step' : undefined}
                >
                  <span className="onboarding-rail-num" aria-hidden="true">{i + 1}</span>
                  <span className="onboarding-rail-text">
                    <span className="onboarding-rail-title">{s.title}</span>
                    <span className="onboarding-rail-sub">{s.subtitle}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="onboarding-pane">
          {step === 'welcome' && (
            <WelcomeStep
              username={username}
              onNext={() => setStep(token ? 'add' : 'connect')}
              onSignOut={onSignOut}
              hasToken={!!token}
            />
          )}

          {step === 'connect' && (
            <ConnectStep
              token={token}
              username={username}
              onSaveToken={onSaveToken}
              onBack={() => setStep('welcome')}
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
        </section>
      </div>
    </div>
  );
}

function WelcomeStep({
  username,
  onNext,
  onSignOut,
  hasToken,
}: {
  username: string | null;
  onNext: () => void;
  onSignOut: () => void;
  hasToken: boolean;
}) {
  return (
    <>
      <p className="onboarding-eyebrow">LandinGit · Where PRs land</p>
      <h1 className="onboarding-headline">
        Track every pull request{username ? <>, <span className="onboarding-name">{username}</span></> : ''}
        <span className="onboarding-headline-soft">{username ? '.' : ' that needs your attention.'}</span>
      </h1>
      <p className="onboarding-lede">
        LandinGit pulls in PRs and issues across your repositories — reviews,
        CI, mentions — into one fast, keyboard-driven dashboard. {hasToken
          ? 'Pick a repository and you’re set.'
          : 'Four short steps and you’re set.'}
      </p>

      <div className="onboarding-feature-grid">
        <FeatureCard icon={<EyeIcon />} title="See what needs you">
          PRs awaiting your review and mentions surface first.
        </FeatureCard>
        <FeatureCard icon={<LayersIcon />} title="All your repos at once">
          One dashboard for every project you care about.
        </FeatureCard>
        <FeatureCard icon={<BoltIcon />} title="Keyboard-driven">
          Filter, search, and jump without leaving the keyboard.
        </FeatureCard>
        <FeatureCard icon={<RadarIcon />} title="Stale-aware">
          Spot stuck PRs before they rot.
        </FeatureCard>
      </div>

      <div className="onboarding-footer">
        {hasToken ? (
          <span className="onboarding-rail-sub" aria-label="Authentication status">
            Signed in as <span className="onboarding-name">{username ?? 'GitHub user'}</span>
          </span>
        ) : (
          <button type="button" className="token-link-btn onboarding-skip" onClick={onSignOut}>
            Sign out
          </button>
        )}
        <button type="button" className="onboarding-cta" onClick={onNext}>
          Get started <span aria-hidden="true">→</span>
        </button>
      </div>
    </>
  );
}

function ConnectStep({
  token,
  username,
  onSaveToken,
  onBack,
}: {
  token: string | null;
  username: string | null;
  onSaveToken: (token: string) => void;
  onBack: () => void;
}) {
  if (token && !username) {
    return (
      <>
        <p className="onboarding-eyebrow">Step 2 · Connect GitHub</p>
        <h1 className="onboarding-headline">Verifying your connection…</h1>
        <p className="onboarding-lede">
          We're confirming your GitHub credentials. This should only take a moment.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="onboarding-eyebrow">Step 2 · Connect GitHub</p>
      <h1 className="onboarding-headline">Authorize LandinGit on GitHub.</h1>
      <p className="onboarding-lede">
        We use a read-friendly token to fetch your PRs and issues. You stay in
        control — sign out anytime to revoke local access.
      </p>

      <div className="onboarding-auth-slot">
        <AuthPanel onSave={onSaveToken} />
      </div>

      <div className="onboarding-footer">
        <button type="button" className="token-link-btn onboarding-skip" onClick={onBack}>
          Back
        </button>
      </div>
    </>
  );
}

function AddRepoStep({
  input,
  onInputChange,
  onSubmit,
  error,
  onBack,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  onBack: () => void;
}) {
  return (
    <>
      <p className="onboarding-eyebrow">Step 3 · Choose repositories</p>
      <h1 className="onboarding-headline">Add a repository to monitor.</h1>
      <p className="onboarding-lede">
        Enter the GitHub repository you want to track. You can add more later
        from the Manage Repositories dialog.
      </p>

      <form className="onboarding-form" onSubmit={onSubmit}>
        <label className="onboarding-field-label" htmlFor="onboarding-repo-input">
          Repository
        </label>
        <input
          id="onboarding-repo-input"
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="owner/repo (e.g., facebook/react)"
          className="onboarding-input"
          aria-label="Repository owner and name"
          autoFocus
        />
        {error && <p className="onboarding-error" role="alert">{error}</p>}
        <p className="onboarding-hint">
          You can also paste a github.com URL — we'll handle the rest.
        </p>
        <div className="onboarding-footer">
          <button type="button" className="token-link-btn onboarding-skip" onClick={onBack}>
            Back
          </button>
          <button type="submit" className="onboarding-cta" disabled={!input.trim()}>
            Add repository <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
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
      <p className="onboarding-eyebrow">Step 4 · You're ready</p>
      <h1 className="onboarding-headline">You're all set.</h1>
      <p className="onboarding-lede">
        {repos.length === 1
          ? "You're tracking your first repository:"
          : `You're tracking ${repos.length} repositories:`}
      </p>
      <ul className="onboarding-repo-list">
        {repos.map((r) => (
          <li key={`${r.owner}/${r.name}`}>
            <code>{r.owner}/{r.name}</code>
          </li>
        ))}
      </ul>
      <div className="onboarding-footer">
        <button type="button" className="token-link-btn onboarding-skip" onClick={onAddAnother}>
          Add another repository
        </button>
        <button type="button" className="onboarding-cta" onClick={onFinish}>
          Open dashboard <span aria-hidden="true">→</span>
        </button>
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="onboarding-feature-card">
      <div className="onboarding-feature-icon" aria-hidden="true">{icon}</div>
      <div className="onboarding-feature-text">
        <div className="onboarding-feature-title">{title}</div>
        <div className="onboarding-feature-desc">{children}</div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="onboarding-brand-mark" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="7" fill="#1f2a3a" />
        <path d="M8 7v14" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="7" r="1.8" fill="#3fb950" />
        <circle cx="8" cy="14" r="1.8" fill="#3fb950" />
        <circle cx="8" cy="21" r="1.8" fill="#3fb950" />
        <path d="M11 7h6l-1.5 2 1.5 2h-6" stroke="#f0883e" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M13 14h7" stroke="#f0883e" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 18h5" stroke="#3fb950" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
      <polyline points="2 15.5 12 22 22 15.5" />
      <polyline points="2 12 12 18.5 22 12" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function RadarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 12L19 5" />
    </svg>
  );
}
