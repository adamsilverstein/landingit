import { useState, useCallback, useEffect, useRef } from 'react';
import type { Octokit } from '@octokit/rest';
import type { PRItem, IssueItem, DashboardItem, RepoConfig, RepoFetchError, OwnershipFilter } from '../types.js';
import { fetchUserPRs, fetchAllPRsForRepo } from '../github/pulls.js';
import { fetchUserIssues, fetchAllIssuesForRepo } from '../github/issues.js';
import { getCheckStatus, getReviewState, isRequestedReviewer } from '../github/checks.js';
import { getLastCommenter } from '../github/comments.js';
import { isAuthError } from '../github/errors.js';

interface UseGithubDataResult {
  items: DashboardItem[];
  loading: boolean;
  error: string | null;
  authError: boolean;
  failedRepos: RepoFetchError[];
  lastRefresh: Date | null;
  refresh: () => void;
}

/**
 * Merge an enriched PR into the items array, replacing the existing entry by id.
 */
function replaceItem(prev: DashboardItem[], updated: DashboardItem): DashboardItem[] {
  const idx = prev.findIndex((item) => item.id === updated.id && item.kind === updated.kind);
  if (idx === -1) return prev;
  const next = [...prev];
  next[idx] = updated;
  return next;
}

export function useGithubData(
  octokit: Octokit | null,
  repos: RepoConfig[],
  maxPerRepo: number,
  username: string | null,
  authenticatedUser?: string | null,
  ownershipFilter: OwnershipFilter = 'created'
): UseGithubDataResult {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [failedRepos, setFailedRepos] = useState<RepoFetchError[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const octokitRef = useRef(octokit);
  octokitRef.current = octokit;
  const reposRef = useRef(repos);
  reposRef.current = repos;
  const maxRef = useRef(maxPerRepo);
  maxRef.current = maxPerRepo;
  const usernameRef = useRef(username);
  usernameRef.current = username;
  const authUserRef = useRef(authenticatedUser);
  authUserRef.current = authenticatedUser;
  const ownershipRef = useRef(ownershipFilter);
  ownershipRef.current = ownershipFilter;

  const repoKey = repos.map((r) => `${r.owner}/${r.name}`).join(',');

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    const client = octokitRef.current;
    const currentRepos = reposRef.current;
    const max = maxRef.current;
    const user = usernameRef.current;

    if (!client || currentRepos.length === 0) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuthError(false);
    setFailedRepos([]);
    setItems([]);

    (async () => {
      try {
        let allPRs: PRItem[];
        let allIssues: IssueItem[] = [];

        if (user) {
          // Fetch PRs and issues in parallel, streaming each into the table as it arrives
          const ownership = ownershipRef.current as Exclude<OwnershipFilter, 'everyone'>;
          const prPromise = fetchUserPRs(client, currentRepos, user, ownership);
          const issuePromise = fetchUserIssues(client, currentRepos, user, ownership);

          // Stream whichever resolves first
          const [prResult, issueResult] = await Promise.allSettled([
            prPromise.then((prs) => {
              if (!cancelled) setItems((prev) => [...prev, ...prs]);
              return prs;
            }),
            issuePromise.then((issues) => {
              if (!cancelled) setItems((prev) => [...prev, ...issues]);
              return issues;
            }),
          ]);

          allPRs = prResult.status === 'fulfilled' ? prResult.value : [];
          allIssues = issueResult.status === 'fulfilled' ? issueResult.value : [];

          if (prResult.status === 'rejected') {
            console.warn('Failed to fetch user PRs:', prResult.reason);
            if (isAuthError(prResult.reason)) {
              if (!cancelled) setAuthError(true);
              return;
            }
          }
          if (issueResult.status === 'rejected') {
            console.warn('Failed to fetch user issues:', issueResult.reason);
            if (isAuthError(issueResult.reason)) {
              if (!cancelled) setAuthError(true);
              return;
            }
          }
        } else {
          // Fallback: fetch all PRs and issues per repo, streaming each repo's results
          allPRs = [];
          const repoErrors: RepoFetchError[] = [];

          const prPromises = currentRepos.map(async (repo) => {
            try {
              const prs = await fetchAllPRsForRepo(client, repo, max);
              if (!cancelled) {
                setItems((prev) => [...prev, ...prs]);
              }
              return prs;
            } catch (e) {
              if (isAuthError(e)) throw e;
              repoErrors.push({
                repo: `${repo.owner}/${repo.name}`,
                message: e instanceof Error ? e.message : 'Unknown error',
              });
              return [] as PRItem[];
            }
          });

          const issuePromises = currentRepos.map(async (repo) => {
            try {
              const issues = await fetchAllIssuesForRepo(client, repo, max);
              if (!cancelled) {
                setItems((prev) => [...prev, ...issues]);
              }
              return issues;
            } catch (e) {
              if (isAuthError(e)) throw e;
              repoErrors.push({
                repo: `${repo.owner}/${repo.name}`,
                message: `Issues: ${e instanceof Error ? e.message : 'Unknown error'}`,
              });
              return [] as IssueItem[];
            }
          });

          // Use allSettled to avoid unhandled rejections when a 401 re-throw
          // causes one group to reject before the other is awaited.
          const [prSettled, issueSettled] = await Promise.all([
            Promise.allSettled(prPromises),
            Promise.allSettled(issuePromises),
          ]);

          // Check for auth errors first
          for (const r of [...prSettled, ...issueSettled]) {
            if (r.status === 'rejected' && isAuthError(r.reason)) {
              throw r.reason;
            }
          }

          allPRs = prSettled
            .filter((r): r is PromiseFulfilledResult<PRItem[]> => r.status === 'fulfilled')
            .flatMap((r) => r.value);
          allIssues = issueSettled
            .filter((r): r is PromiseFulfilledResult<IssueItem[]> => r.status === 'fulfilled')
            .flatMap((r) => r.value);

          if (!cancelled) {
            setFailedRepos(repoErrors);
          }
        }

        if (cancelled) return;

        // Enrich PRs with CI status, reviews, and last-commenter, updating each PR as it completes
        const authUser = authUserRef.current;
        const prEnrichmentResults = await Promise.allSettled(
          allPRs.map(async (pr) => {
            if (cancelled) return;

            // Skip the comments fetch when we already know there are none;
            // commentsCount is undefined for code paths that don't surface it,
            // so we fetch in that case too.
            const shouldFetchCommenter = pr.commentsCount !== 0;
            // CI/reviews only make sense for open PRs; commenter enrichment
            // still runs for closed/merged so the column populates everywhere.
            const isOpen = pr.state === 'open';

            // Nothing to fetch for this PR — skip the work entirely.
            if (!isOpen && !shouldFetchCommenter) return;

            const [ciResult, reviewResult, requestedResult, commenterResult] = await Promise.allSettled([
              isOpen
                ? getCheckStatus(
                    client,
                    pr.repo.owner,
                    pr.repo.name,
                    `refs/pull/${pr.number}/head`
                  )
                : Promise.resolve(pr.ciStatus),
              isOpen
                ? getReviewState(client, pr.repo.owner, pr.repo.name, pr.number)
                : Promise.resolve(pr.reviewState),
              isOpen && authUser
                ? isRequestedReviewer(client, pr.repo.owner, pr.repo.name, pr.number, authUser)
                : Promise.resolve(pr.isRequestedReviewer),
              shouldFetchCommenter
                ? getLastCommenter(client, pr.repo.owner, pr.repo.name, pr.number)
                : Promise.resolve(null),
            ]);

            if (cancelled) return;

            // Surface auth failures from enrichment so the outer catch can
            // trigger the re-auth flow instead of silently rendering partial data.
            for (const r of [ciResult, reviewResult, requestedResult, commenterResult]) {
              if (r.status === 'rejected' && isAuthError(r.reason)) {
                throw r.reason;
              }
            }

            const enriched: DashboardItem = {
              ...pr,
              ciStatus:
                ciResult.status === 'fulfilled'
                  ? ciResult.value
                  : pr.ciStatus,
              reviewState:
                reviewResult.status === 'fulfilled'
                  ? reviewResult.value
                  : pr.reviewState,
              isRequestedReviewer:
                requestedResult.status === 'fulfilled'
                  ? requestedResult.value
                  : false,
              lastCommenter:
                commenterResult.status === 'fulfilled' && commenterResult.value
                  ? commenterResult.value
                  : pr.lastCommenter,
            };

            setItems((prev) => replaceItem(prev, enriched));
          })
        );

        // Enrich issues with last-commenter only. Skip zero-comment issues to
        // keep API usage bounded.
        const issueEnrichmentResults = await Promise.allSettled(
          allIssues.map(async (issue) => {
            if (cancelled) return;
            if (issue.commentsCount === 0) return;

            let commenter: string | null;
            try {
              commenter = await getLastCommenter(
                client,
                issue.repo.owner,
                issue.repo.name,
                issue.number
              );
            } catch (e) {
              if (isAuthError(e)) throw e;
              return;
            }

            if (cancelled || !commenter) return;

            const enriched: DashboardItem = { ...issue, lastCommenter: commenter };
            setItems((prev) => replaceItem(prev, enriched));
          })
        );

        // Propagate any auth errors that escaped enrichment so the re-auth
        // flow fires instead of silently keeping the stale token.
        for (const r of [...prEnrichmentResults, ...issueEnrichmentResults]) {
          if (r.status === 'rejected' && isAuthError(r.reason)) {
            throw r.reason;
          }
        }

        if (!cancelled) {
          setLastRefresh(new Date());
        }
      } catch (e) {
        if (!cancelled) {
          if (isAuthError(e)) {
            setAuthError(true);
          } else {
            setError(e instanceof Error ? e.message : 'Unknown error');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // `octokit` is in the deps so a token refresh (new client instance) triggers
    // a fresh fetch; the other values are read via refs to keep the effect stable.
  }, [octokit, repoKey, refreshCounter, username, ownershipFilter]);

  return { items, loading, error, authError, failedRepos, lastRefresh, refresh };
}
