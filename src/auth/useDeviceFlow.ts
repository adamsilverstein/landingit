import { useDeviceFlow as useSharedDeviceFlow } from '../../shared/auth/useDeviceFlow.js';
import { OAUTH_CLIENT_ID, getOAuthAvailability } from './oauthConfig.js';

export type { DeviceFlowState, DeviceFlowStatus } from '../../shared/auth/useDeviceFlow.js';

/**
 * Open a URL in the system browser. In Electron, `setWindowOpenHandler`
 * routes http(s) URLs through `shell.openExternal`; in a plain browser this
 * opens a new tab (when not blocked by the popup blocker).
 */
function openInSystemBrowser(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Web/Electron wrapper around the shared Device Flow state machine. */
export function useDeviceFlow() {
  return useSharedDeviceFlow({
    getAvailability: getOAuthAvailability,
    clientId: OAUTH_CLIENT_ID,
    openVerificationUrl: openInSystemBrowser,
  });
}
