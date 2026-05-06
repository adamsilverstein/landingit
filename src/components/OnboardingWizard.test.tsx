import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingWizard } from './OnboardingWizard.js';
import type { RepoConfig } from '../types.js';

interface RenderOverrides {
  token?: string | null;
  username?: string | null;
  repos?: RepoConfig[];
  onSaveToken?: (token: string) => void;
  onAddRepo?: (owner: string, name: string) => void;
  onFinish?: () => void;
  onSignOut?: () => void;
}

function renderWizard(overrides: RenderOverrides = {}) {
  // Default to the "returning user" case (token + username set) so existing
  // form interactions land directly on the Choose-repos step. Welcome- and
  // Connect-step tests opt into a null token explicitly.
  const token: string | null = 'token' in overrides
    ? (overrides.token as string | null)
    : 'ghp_fake_token';
  const username: string | null = 'username' in overrides
    ? (overrides.username as string | null)
    : 'octocat';
  const props = {
    token,
    username,
    repos: overrides.repos ?? [],
    onSaveToken: overrides.onSaveToken ?? ((_t: string) => {}),
    onAddRepo: overrides.onAddRepo ?? ((_o: string, _n: string) => {}),
    onFinish: overrides.onFinish ?? (() => {}),
    onSignOut: overrides.onSignOut ?? (() => {}),
  };
  return { ...render(<OnboardingWizard {...props} />), props };
}

describe('OnboardingWizard', () => {
  it('shows the welcome step with a greeting for brand-new users', () => {
    renderWizard({ token: null, username: null });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Track every pull request that needs your attention/);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('routes returning users with a token straight to the add-repo step', () => {
    renderWizard({ token: 'ghp_fake', username: 'octocat' });
    expect(screen.getByRole('heading', { name: /add a repository/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/repository owner and name/i)).toHaveFocus();
  });

  it('walks brand-new users from welcome → connect, then auto-advances when a token arrives', async () => {
    const { rerender, props } = renderWizard({ token: null, username: null });
    await userEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByRole('heading', { name: /authorize landingit on github/i })).toBeInTheDocument();

    // Token arrives via OAuth/PAT — wizard should auto-advance once the
    // authenticated username is also resolved.
    rerender(
      <OnboardingWizard {...props} token="ghp_fake" username="octocat" />
    );
    expect(screen.getByRole('heading', { name: /add a repository/i })).toBeInTheDocument();
  });

  it('rejects malformed input with a friendly error', async () => {
    const onAddRepo = vi.fn();
    renderWizard({ onAddRepo });
    await userEvent.type(screen.getByLabelText(/repository owner and name/i), 'not-a-repo');
    await userEvent.click(screen.getByRole('button', { name: /add repository/i }));
    expect(onAddRepo).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/owner\/name format/i);
  });

  it('accepts owner/name input and calls onAddRepo, then moves to confirm', async () => {
    const onAddRepo = vi.fn();
    const { rerender, props } = renderWizard({ onAddRepo });
    await userEvent.type(screen.getByLabelText(/repository owner and name/i), 'facebook/react');
    await userEvent.click(screen.getByRole('button', { name: /add repository/i }));
    expect(onAddRepo).toHaveBeenCalledWith('facebook', 'react');

    rerender(
      <OnboardingWizard
        {...props}
        repos={[{ owner: 'facebook', name: 'react', enabled: true }]}
      />
    );
    expect(screen.getByRole('heading', { name: /you're all set/i })).toBeInTheDocument();
    expect(screen.getByText('facebook/react')).toBeInTheDocument();
  });

  it('accepts a github.com URL and strips the prefix', async () => {
    const onAddRepo = vi.fn();
    renderWizard({ onAddRepo });
    await userEvent.type(
      screen.getByLabelText(/repository owner and name/i),
      'https://github.com/facebook/react'
    );
    await userEvent.click(screen.getByRole('button', { name: /add repository/i }));
    expect(onAddRepo).toHaveBeenCalledWith('facebook', 'react');
  });

  it('blocks duplicate repo entries', async () => {
    const onAddRepo = vi.fn();
    renderWizard({
      onAddRepo,
      repos: [{ owner: 'facebook', name: 'react', enabled: true }],
    });
    await userEvent.type(screen.getByLabelText(/repository owner and name/i), 'facebook/react');
    await userEvent.click(screen.getByRole('button', { name: /add repository/i }));
    expect(onAddRepo).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/already in your list/i);
  });

  it('finishes onboarding when the user clicks Open dashboard', async () => {
    const onFinish = vi.fn();
    const { rerender, props } = renderWizard({ onFinish });
    await userEvent.type(screen.getByLabelText(/repository owner and name/i), 'facebook/react');
    await userEvent.click(screen.getByRole('button', { name: /add repository/i }));
    rerender(
      <OnboardingWizard
        {...props}
        repos={[{ owner: 'facebook', name: 'react', enabled: true }]}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /open dashboard/i }));
    expect(onFinish).toHaveBeenCalled();
  });

  it('lets the brand-new user sign out from the welcome step', async () => {
    const onSignOut = vi.fn();
    renderWizard({ token: null, username: null, onSignOut });
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalled();
  });
});
