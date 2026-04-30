import type { DeviceFlowTransport } from './transport.js';

export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Default scope. The `repo` scope is required to read PRs, commits, and check
 * status from private repositories — there is no narrower OAuth scope that
 * grants private-repo PR read access. Note that `repo` also confers write
 * access; the dashboard never uses it, but token holders should be aware.
 */
export const DEFAULT_OAUTH_SCOPE = 'repo';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  /** Seconds until the device_code expires. */
  expires_in: number;
  /** Seconds the client must wait between polls. */
  interval: number;
}

export class DeviceFlowError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DeviceFlowError';
  }
}

/** Raised when polling is aborted by the caller. */
export class DeviceFlowAbortedError extends DeviceFlowError {
  constructor() {
    super('Device flow aborted', 'aborted');
    this.name = 'DeviceFlowAbortedError';
  }
}

export async function requestDeviceCode(
  transport: DeviceFlowTransport,
  clientId: string,
  scope: string = DEFAULT_OAUTH_SCOPE
): Promise<DeviceCodeResponse> {
  const result = await transport.postForm(GITHUB_DEVICE_CODE_URL, {
    client_id: clientId,
    scope,
  });

  if (typeof result.error === 'string') {
    throw new DeviceFlowError(
      typeof result.error_description === 'string' ? result.error_description : result.error,
      result.error
    );
  }

  if (
    typeof result.device_code !== 'string' ||
    typeof result.user_code !== 'string' ||
    typeof result.verification_uri !== 'string' ||
    typeof result.expires_in !== 'number' ||
    typeof result.interval !== 'number'
  ) {
    throw new DeviceFlowError('Malformed device code response from GitHub');
  }

  return {
    device_code: result.device_code,
    user_code: result.user_code,
    verification_uri: result.verification_uri,
    expires_in: result.expires_in,
    interval: result.interval,
  };
}

export interface PollOptions {
  /** Initial poll interval in seconds, supplied by GitHub. */
  intervalSeconds: number;
  /** Caller-controlled cancellation. */
  signal?: AbortSignal;
  /** Test seam — defaults to setTimeout-based wait. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/**
 * Poll GitHub for the access token until the user authorizes (or denies / lets it expire).
 *
 * Implements the wait-and-back-off rules from the OAuth Device Flow spec:
 *   - `authorization_pending` → continue polling at the current interval.
 *   - `slow_down` → bump the interval by 5 seconds (per the spec).
 *   - `expired_token` / `access_denied` → terminal failure.
 */
export async function pollAccessToken(
  transport: DeviceFlowTransport,
  clientId: string,
  deviceCode: string,
  options: PollOptions
): Promise<string> {
  const { signal, sleep = defaultSleep } = options;
  let intervalMs = options.intervalSeconds * 1000;

  while (true) {
    if (signal?.aborted) throw new DeviceFlowAbortedError();
    await sleep(intervalMs, signal);
    // Re-check after the sleep so a cancel that landed during the wait
    // doesn't trigger one more access-token POST before we notice.
    if (signal?.aborted) throw new DeviceFlowAbortedError();

    const result = await transport.postForm(GITHUB_ACCESS_TOKEN_URL, {
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    if (typeof result.access_token === 'string' && result.access_token.length > 0) {
      return result.access_token;
    }

    const code = typeof result.error === 'string' ? result.error : 'unknown';
    switch (code) {
      case 'authorization_pending':
        continue;
      case 'slow_down':
        intervalMs += 5000;
        continue;
      case 'expired_token':
        throw new DeviceFlowError('Login code expired before you finished signing in.', code);
      case 'access_denied':
        throw new DeviceFlowError('Authorization was declined.', code);
      default:
        throw new DeviceFlowError(
          typeof result.error_description === 'string'
            ? result.error_description
            : `OAuth error: ${code}`,
          code
        );
    }
  }
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new DeviceFlowAbortedError());
    };
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
    signal?.addEventListener('abort', onAbort);
    // Check after registering so a signal that was already aborted is caught
    // (the abort event would have fired before we listened for it).
    if (signal?.aborted) {
      cleanup();
      reject(new DeviceFlowAbortedError());
    }
  });
}
