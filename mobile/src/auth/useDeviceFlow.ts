import { Linking } from 'react-native';
import { useDeviceFlow as useSharedDeviceFlow } from '../../../shared/auth/useDeviceFlow';
import { OAUTH_CLIENT_ID, getOAuthAvailability } from './oauthConfig';

export type { DeviceFlowState, DeviceFlowStatus } from '../../../shared/auth/useDeviceFlow';

/** Open a URL via the OS browser; failures are swallowed (URL is on screen). */
function openInSystemBrowser(url: string): void {
  Linking.openURL(url).catch(() => {
    // The verification URL is also displayed on screen; user can open it manually.
  });
}

/** Mobile wrapper around the shared Device Flow state machine. */
export function useDeviceFlow() {
  return useSharedDeviceFlow({
    getAvailability: getOAuthAvailability,
    clientId: OAUTH_CLIENT_ID,
    openVerificationUrl: openInSystemBrowser,
  });
}
