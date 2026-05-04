import type { DeviceFlowTransport } from '../../shared/auth/transport.js';
import { getElectronOAuthTransport } from './electronBridge.js';

/**
 * GitHub OAuth App `client_id` for Device Flow login. Public, non-secret —
 * Device Flow does not use a `client_secret`, and the value is visible in the
 * verification URL users open. Checked in so CI-built desktop binaries (whose
 * runners don't load local `.env`) ship with OAuth enabled. Forks can override
 * via the `VITE_GITHUB_OAUTH_CLIENT_ID` env var at build time.
 */
const DEFAULT_OAUTH_CLIENT_ID = 'Ov23liKbvHRiXEkU7xi3';

export const OAUTH_CLIENT_ID: string =
  (import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID as string | undefined) ?? DEFAULT_OAUTH_CLIENT_ID;

export interface OAuthAvailability {
  available: boolean;
  /** When unavailable, a short reason for display to the user. */
  reason?: string;
  transport?: DeviceFlowTransport;
}

export function getOAuthAvailability(): OAuthAvailability {
  if (!OAUTH_CLIENT_ID) {
    return {
      available: false,
      reason: 'OAuth is not configured for this build (VITE_GITHUB_OAUTH_CLIENT_ID is unset).',
    };
  }
  const transport = getElectronOAuthTransport();
  if (!transport) {
    return {
      available: false,
      reason: 'Browser OAuth login is unavailable here. Use a Personal Access Token.',
    };
  }
  return { available: true, transport };
}
