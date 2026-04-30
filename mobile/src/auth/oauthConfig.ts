import type { DeviceFlowTransport } from '../../../shared/auth/transport';
import { nativeOAuthTransport } from './transport';

/**
 * GitHub OAuth App `client_id`. Set `EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID`
 * (e.g. via `.env` or EAS Secrets) to enable OAuth login. When unset, the
 * mobile app falls back to PAT entry only.
 */
export const OAUTH_CLIENT_ID: string =
  (process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID as string | undefined) ?? '';

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
