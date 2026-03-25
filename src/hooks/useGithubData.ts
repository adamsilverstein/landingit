import { useState, useCallback, useEffect, useRef } from 'react';
import type { Octokit } from '@octokit/rest';
import type { PRItem, DashboardItem, RepoConfig, RepoFetchError } from '../types.js';
import { fetchUserPRs, fetchAllPRsForRepo } from '../github/pulls.js';
import { fetchUserIssues, fetchAllIssuesForRepo } from '../github/issues.js';
import { getCheckStatus, getReviewState } from '../github/checks.js';

interface UseGithubDataResult {
  items: DashboardItem[];
  loading: boolean;
  error: string | null;
  failedRepos: RepoFetchError[];
  lastRefresh: Date | null;
  refresh: () => void;
}

export function useGithubData(
  octokit: Octokit | null,
  repos: RepoConfig[],
  maxPerRepo: number,
  username: string | null
): UseGithubDataResult {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const fetchingRef = useRef(false);

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
    if (fetchingRef.current) return;

    let cancelled = false;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    setFailedRepos([]);

    (async () => {
      try {
        let allPRs: PRItem[];
        let allIssues: DashboardItem[];

        if (user) {
          // Use search API to get user's PRs and issues efficiently
          const [prResult, issueResult] = await Promise.allSettled([
            fetchUserPRs(client, currentRepos, user),
            fetchUserIssues(client, currentRepos, user),
          ]);
          allPRs = prResult.status === 'fulfilled' ? prResult.value : [];
          allIssues = issueResult.status === 'fulfilled' ? issueResult.value : [];

          if (prResult.status === 'rejected') {
            console.warn('Failed to fetch user PRs:', prResult.reason);
          }
          if (issueResult.status === 'rejected') {
            console.warn('Failed to fetch user issues:', issueResult.reason);
          }
        } else {
          // Fallback: fetch all PRs and issues per repo
          const [prResults, issueResults] = await Promise.all([
            Promise.allSettled(
              currentRepos.map((repo) => fetchAllPRsForRepo(client, repo, max))
            ),
            Promise.allSettled(
              currentRepos.map((repo) => fetchAllIssuesForRepo(client, repo, max))
            ),
          ]);
          allPRs = [];
          const repoErrors: RepoFetchError[] = [];
          for (let i = 0; i < prResults.length; i++) {
            const result = prResults[i];
            if (result.status === 'fulfilled') {
              allPRs = allPRs.concat(result.value);
            } else {
              const repo = currentRepos[i];
              repoErrors.push({
                repo: `${repo.owner}/${repo.name}`,
                message: result.reason instanceof Error
                  ? result.reason.message
                  : 'Unknown error',
              });
            }
          }
          allIssues = [];
          for (const result of issueResults) {
            if (result.status === 'fulfilled') {
              allIssues = allIssues.concat(result.value);
            }
          }
          if (!cancelled) {
            setFailedRepos(repoErrors);
          }
        }

        if (cancelled) return;

        // Enrich PRs with CI status and reviews in parallel
        const enriched = await Promise.allSettled(
          allPRs.map(async (pr) => {
            // Only fetch CI/reviews for open PRs (closed/merged don't need it)
            if (pr.state !== 'open') return pr;

            const [ciResult, reviewResult] = await Promise.allSettled([
              getCheckStatus(
                client,
                pr.repo.owner,
                pr.repo.name,
                `refs/pull/${pr.number}/head`
              ),
              getReviewState(client, pr.repo.owner, pr.repo.name, pr.number),
            ]);

            return {
              ...pr,
              ciStatus:
                ciResult.status === 'fulfilled'
                  ? ciResult.value
                  : pr.ciStatus,
              reviewState:
                reviewResult.status === 'fulfilled'
                  ? reviewResult.value
                  : pr.reviewState,
            };
          })
        );

        if (cancelled) return;

        const finalPRs: DashboardItem[] = enriched
          .filter(
            (r): r is PromiseFulfilledResult<PRItem> =>
              r.status === 'fulfilled'
          )
          .map((r) => r.value);

        setItems([...finalPRs, ...allIssues]);
        setLastRefresh(new Date());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repoKey, refreshCounter, username]);

  return { items, loading, error, failedRepos, lastRefresh, refresh };
}
