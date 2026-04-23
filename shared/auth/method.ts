export type AuthMethod = 'oauth' | 'pat';

/**
 * Derive the connection method from the stored token.
 *
 * GitHub OAuth Device Flow tokens are prefixed with `gho_`.
 * Personal Access Tokens use `ghp_` (classic) or `github_pat_` (fine-grained).
 * Anything else is treated as PAT for display purposes.
 */
export function getAuthMethod(token: string | null): AuthMethod | null {
  if (!token) return null;
  return token.startsWith('gho_') ? 'oauth' : 'pat';
}

export function authMethodLabel(method: AuthMethod): string {
  return method === 'oauth' ? 'OAuth' : 'Personal Access Token';
}
