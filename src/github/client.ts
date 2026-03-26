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
        onRateLimit({
          remaining: Number(remaining),
          limit: Number(limit),
          resetAt: new Date(Number(reset) * 1000),
        });
      }
    });
  }

  return octokit;
}
