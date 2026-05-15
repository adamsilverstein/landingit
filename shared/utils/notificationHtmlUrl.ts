import type { NotificationItem } from '../types.js';

/**
 * Translate a notification's API subject URL into the equivalent
 * github.com HTML URL so the user can click through to read the thread.
 *
 *   /repos/{owner}/{repo}/pulls/{n}   → /{owner}/{repo}/pull/{n}
 *   /repos/{owner}/{repo}/issues/{n}  → /{owner}/{repo}/issues/{n}
 *   /repos/{owner}/{repo}/commits/SHA → /{owner}/{repo}/commit/SHA
 *
 * Falls back to the repo URL when the subject URL isn't a known shape,
 * and to github.com when there's no repo info at all. Never returns
 * an empty string — callers can always pass the result to window.open.
 */
export function notificationHtmlUrl(n: NotificationItem): string {
  const repoBase = `https://github.com/${n.repo.owner}/${n.repo.name}`;
  const url = n.subject.url;
  if (!url) return repoBase;

  const match = /^https?:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/.exec(
    url
  );
  if (!match) return repoBase;
  const [, owner, repo, kind, rest] = match;
  switch (kind) {
    case 'pulls':   return `https://github.com/${owner}/${repo}/pull/${rest}`;
    case 'issues':  return `https://github.com/${owner}/${repo}/issues/${rest}`;
    case 'commits': return `https://github.com/${owner}/${repo}/commit/${rest}`;
    case 'releases': return `https://github.com/${owner}/${repo}/releases/tag/${rest}`;
    default:        return repoBase;
  }
}
