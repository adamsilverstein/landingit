import { describe, it, expect } from 'vitest';
import { getAuthMethod, authMethodLabel } from './method.js';

describe('getAuthMethod', () => {
  it('returns null when no token is provided', () => {
    expect(getAuthMethod(null)).toBe(null);
    expect(getAuthMethod('')).toBe(null);
  });

  it('classifies gho_ tokens as oauth', () => {
    expect(getAuthMethod('gho_abc123')).toBe('oauth');
  });

  it('classifies ghp_ classic PATs as pat', () => {
    expect(getAuthMethod('ghp_xyz789')).toBe('pat');
  });

  it('classifies github_pat_ fine-grained PATs as pat', () => {
    expect(getAuthMethod('github_pat_111111')).toBe('pat');
  });

  it('falls back to pat for unknown prefixes', () => {
    expect(getAuthMethod('legacy-token')).toBe('pat');
  });
});

describe('authMethodLabel', () => {
  it('returns human-readable labels', () => {
    expect(authMethodLabel('oauth')).toBe('OAuth');
    expect(authMethodLabel('pat')).toBe('Personal Access Token');
  });
});
