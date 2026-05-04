import type { DeviceFlowTransport } from '../../../shared/auth/transport';
import { nativeOAuthTransport } from './transport';

/**
 * GitHub OAuth App `client_id` for Device Flow login. Public, non-secret —
 * Device Flow does not use a `client_secret`, and the value is visible in the
 * verification URL users open. Checked in so EAS / TestFlight builds (which do
 * not load local `.env` files) ship with OAuth enabled. Forks can override via
 * the `EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID` env var.
 */
const DEFAULT_OAUTH_CLIENT_ID = 'Ov23liKbvHRiXEkU7xi3';

export const OAUTH_CLIENT_ID: string =
  (process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID as string | undefined) ?? DEFAULT_OAUTH_CLIENT_ID;

export interface OAuthAvailability {
  available: boolean;
  reason?: string;
  transport?: DeviceFlowTransport;
}

export function getOAuthAvailability(): OAuthAvailability {
  if (!OAUTH_CLIENT_ID) {
    return {
      available: false,
      reason: 'OAuth is not configured for this build (EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID is unset).',
    };
  }
  return { available: true, transport: nativeOAuthTransport };
}
