/**
 * Parse a GitHub notification's `subject.url` (an API URL) into a stable
 * identifier we can cross-reference against fetched PRs/issues.
 *
 * Notifications return API URLs, not HTML URLs:
 *   - PRs:    https://api.github.com/repos/{owner}/{repo}/pulls/{number}
 *   - Issues: https://api.github.com/repos/{owner}/{repo}/issues/{number}
 *
 * Other subject types (CheckSuite, Release, Discussion, Commit) either
 * carry non-matching URLs or `null`; we return `null` for those.
 */
export interface ParsedNotificationSubject {
  owner: string;
  repo: string;
  number: number;
  /** 'pull' for PR subjects, 'issue' for issue subjects. */
  type: 'pull' | 'issue';
}

const SUBJECT_URL_RE =
  /^https?:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/(pulls|issues)\/(\d+)$/;

export function parseNotificationSubject(
  url: string | null | undefined
): ParsedNotificationSubject | null {
  if (!url) return null;
  const match = SUBJECT_URL_RE.exec(url.trim());
  if (!match) return null;
  const [, owner, repo, kind, num] = match;
  const number = Number(num);
  if (!Number.isFinite(number)) return null;
  return {
    owner,
    repo,
    number,
    type: kind === 'pulls' ? 'pull' : 'issue',
  };
}
