/**
 * Typed access to the preload-injected `window.electronAPI` bridge.
 * Returns `null` when running in a plain browser context.
 */
import type { DeviceFlowTransport } from '../../shared/auth/transport.js';

interface ElectronAPI {
  oauthDeviceFlow: {
    postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function getElectronOAuthTransport(): DeviceFlowTransport | null {
  if (typeof window === 'undefined') return null;
  const api = window.electronAPI;
  if (!api?.oauthDeviceFlow?.postForm) return null;
  return {
    postForm: (url, body) => api.oauthDeviceFlow.postForm(url, body),
  };
}
