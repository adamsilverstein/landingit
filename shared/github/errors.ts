/**
 * Returns true if the given error is a GitHub API authentication failure
 * (HTTP 401). Octokit rejects requests with a RequestError that carries
 * a `status` property.
 */
export function isAuthError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    (e as { status: unknown }).status === 401
  );
}
