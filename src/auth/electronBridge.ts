/**
 * Typed access to the preload-injected `window.electronAPI` bridge.
 * Returns `null` when running in a plain browser context.
 */
import type { DeviceFlowTransport } from '../../shared/auth/transport.js';

interface ElectronAPI {
  oauthDeviceFlow: {
    postForm(url: string, body: Record<string, string>): Promise<Record<string, unknown>>;
  };
  clipboard?: {
    writeText(text: string): void;
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

/**
 * Copy text to the system clipboard. Prefers Electron's native clipboard
 * (via the preload bridge) because `navigator.clipboard.writeText` is
 * unreliable in Electron renderers. Falls back to the web Clipboard API,
 * then to a hidden-textarea `document.execCommand('copy')` as a last resort.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const electronClipboard = window.electronAPI?.clipboard;
  if (electronClipboard?.writeText) {
    try {
      electronClipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
