import type { RepoConfig } from '../types.js';

export type ParseRepoResult =
  | { ok: true; owner: string; name: string }
  | { ok: false; error: string };

/**
 * Parse a user-entered repository identifier into { owner, name }.
 *
 * Accepts plain `owner/name`, full GitHub URLs (with or without protocol,
 * `www.`, `.git` suffix, or trailing path segments like `/tree/main` or
 * `/pulls`), and tolerates surrounding whitespace.
 *
 * Duplicate detection is case-insensitive because GitHub treats
 * owner/name case-insensitively for routing.
 */
export function parseRepoInput(
  input: string,
  existing: RepoConfig[] = []
): ParseRepoResult {
  const trimmed = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '');

  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length < 2) {
    return {
      ok: false,
      error: 'Enter a repository in owner/name format (e.g., facebook/react).',
    };
  }

  const owner = parts[0];
  const name = parts[1];

  const ownerLC = owner.toLowerCase();
  const nameLC = name.toLowerCase();
  const duplicate = existing.some(
    (r) => r.owner.toLowerCase() === ownerLC && r.name.toLowerCase() === nameLC
  );
  if (duplicate) {
    return {
      ok: false,
      error: `${owner}/${name} is already in your list.`,
    };
  }

  return { ok: true, owner, name };
}
