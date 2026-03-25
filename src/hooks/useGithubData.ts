import { useState, useCallback, useEffect, useRef } from 'react';
import type { Octokit } from '@octokit/rest';
import type { PRItem, RepoConfig } from '../types.js';
import { fetchPullsForRepo } from '../github/pulls.js';
import { getCheckStatus, getReviewState } from '../github/checks.js';

interface UseGithubDataResult {
  items: PRItem[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refresh: () => void;
}

export function useGithubData(
  octokit: Octokit | null,
  repos: RepoConfig[],
  maxPerRepo: number
): UseGithubDataResult {
  const [items, setItems] = useState<PRItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Use refs so the fetch function always reads current values
  // without being recreated on every render
  const octokitRef = useRef(octokit);
  octokitRef.current = octokit;
  const reposRef = useRef(repos);
  reposRef.current = repos;
  const maxRef = useRef(maxPerRepo);
  maxRef.current = maxPerRepo;
  const fetchingRef = useRef(false);

  // Stable key: changes only when repo list actually changes
  const repoKey = repos.map((r) => `${r.owner}/${r.name}`).join(',');

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    const client = octokitRef.current;
    const currentRepos = reposRef.current;
    const max = maxRef.current;

    if (!client || currentRepos.length === 0) return;
    if (fetchingRef.current) return;

    let cancelled = false;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Fetch PRs from all repos in parallel
        const results = await Promise.allSettled(
          currentRepos.map((repo) => fetchPullsForRepo(client, repo, max))
        );

        if (cancelled) return;

        let allPRs: PRItem[] = [];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            allPRs = allPRs.concat(result.value);
          }
        }

        // Enrich with CI status and reviews in parallel
        const enriched = await Promise.allSettled(
          allPRs.map(async (pr) => {
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

        const finalItems: PRItem[] = enriched
          .filter(
            (r): r is PromiseFulfilledResult<PRItem> =>
              r.status === 'fulfilled'
          )
          .map((r) => r.value);

        setItems(finalItems);
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
  }, [repoKey, refreshCounter]);

  return { items, loading, error, lastRefresh, refresh };
}
