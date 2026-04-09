// Web wrapper — injects webStorage into the shared hook.
// Preserves the original zero-argument API so existing callers don't change.
import { useConfig as useConfigShared } from '../../shared/hooks/useConfig.js';
import { webStorage } from '../storage/webStorage.js';

export function useConfig() {
  return useConfigShared(webStorage);
}
