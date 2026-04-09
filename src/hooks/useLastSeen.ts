// Web wrapper — injects webStorage into the shared hook.
// Preserves the original zero-argument API so existing callers don't change.
import { useLastSeen as useLastSeenShared, hasNewActivity } from '../../shared/hooks/useLastSeen.js';
import { webStorage } from '../storage/webStorage.js';

export { hasNewActivity };

export function useLastSeen() {
  return useLastSeenShared(webStorage);
}
