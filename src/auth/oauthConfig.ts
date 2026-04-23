import type { DeviceFlowTransport } from '../../shared/auth/transport.js';
import { getElectronOAuthTransport } from './electronBridge.js';

/**
 * GitHub OAuth App `client_id` for Device Flow login.
 * Set `VITE_GITHUB_OAUTH_CLIENT_ID` at build time. When unset, OAuth is
 * disabled and the UI falls back to PAT entry.
 */
export const OAUTH_CLIENT_ID: string =
  (import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID as string | undefined) ?? '';

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
