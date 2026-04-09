import { Octokit } from '@octokit/rest';

export interface RateLimit {
  remaining: number;
  limit: number;
  resetAt: Date;
}

export type RateLimitListener = (rateLimit: RateLimit) => void;

export function createClient(token: string, onRateLimit?: RateLimitListener): Octokit {
  const octokit = new Octokit({ auth: token });

  if (onRateLimit) {
    octokit.hook.after('request', (response) => {
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];
      const reset = response.headers['x-ratelimit-reset'];
      if (remaining != null && limit != null && reset != null) {
        const remainingNum = Number(remaining);
        const limitNum = Number(limit);
        const resetNum = Number(reset);
        if (!Number.isFinite(remainingNum) || !Number.isFinite(limitNum) || !Number.isFinite(resetNum)) return;
        onRateLimit({
          remaining: remainingNum,
          limit: limitNum,
          resetAt: new Date(resetNum * 1000),
        });
      }
    });
  }

  return octokit;
}
