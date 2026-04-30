/**
 * Electron preload — exposes a small, audited surface to the renderer.
 *
 * Only methods needed for the GitHub OAuth Device Flow are exposed; the
 * main process validates every URL before making a request. The renderer
 * cannot drive arbitrary network calls through this bridge.
 */
const { clipboard, contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  oauthDeviceFlow: {
    /**
     * POST a form-encoded body to a GitHub OAuth endpoint and return the JSON response.
     * The main process restricts allowed URLs to GitHub's device/access-token endpoints.
     */
    postForm(url, body) {
      return ipcRenderer.invoke('oauth:postForm', url, body);
    },
  },
  clipboard: {
    writeText(text) {
      if (typeof text !== 'string') {
        throw new TypeError('clipboard.writeText expects a string');
      }
      clipboard.writeText(text);
    },
  },
});
