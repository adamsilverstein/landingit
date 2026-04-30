const { app, BrowserWindow, ipcMain, net, protocol, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// GitHub OAuth Device Flow endpoints. The renderer cannot call these directly
// because GitHub does not return CORS headers for them, so the main process
// proxies the requests via Node's `net.fetch`.
const ALLOWED_OAUTH_URLS = new Set([
  'https://github.com/login/device/code',
  'https://github.com/login/oauth/access_token',
]);

function registerOAuthBridge() {
  ipcMain.handle('oauth:postForm', async (_event, url, body) => {
    if (typeof url !== 'string' || !ALLOWED_OAUTH_URLS.has(url)) {
      throw new Error(`Refusing OAuth request to disallowed URL: ${url}`);
    }
    if (!body || typeof body !== 'object') {
      throw new Error('OAuth bridge requires a body object');
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new Error('OAuth body entries must be strings');
      }
      params.append(key, value);
    }

    // Bound the request so a hung network doesn't leave the Device Flow UI
    // wedged in a pending state. Electron's `net.fetch` honors AbortSignal.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await net.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`OAuth endpoint returned non-JSON response (status ${response.status})`);
      }
    } finally {
      clearTimeout(timeout);
    }
  });
}

// Register the custom scheme as privileged so it gets a proper origin
// and can make CORS requests (file:// has a null origin which blocks fetch).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// Serve dist/ files via the app:// protocol so the renderer has a real
// origin and can make authenticated GitHub API requests without CORS issues.
// Registered once at startup — protocol.handle throws on duplicate registration,
// and on macOS createWindow() can be called again via the `activate` event.
function registerAppProtocol() {
  const distDir = path.resolve(__dirname, '..', 'dist');
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    if (url.host !== 'dashboard') {
      return new Response('Not found', { status: 404 });
    }

    // Default to index.html for the root path; strip leading slashes so
    // path.resolve treats the value as relative to distDir.
    const relativePath =
      url.pathname === '/' || url.pathname === ''
        ? 'index.html'
        : decodeURIComponent(url.pathname).replace(/^\/+/, '');

    // Resolve the candidate path and ensure it stays inside distDir to
    // prevent path traversal (e.g. app://dashboard/%2e%2e/%2e%2e/etc/passwd).
    const filePath = path.resolve(distDir, relativePath);
    const relativeToDist = path.relative(distDir, filePath);
    if (relativeToDist.startsWith('..') || path.isAbsolute(relativeToDist)) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'icon.png')
      : path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Deny all permission requests (camera, microphone, etc.)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // Open http/https URLs in the system browser, swallowing Promise rejections.
  const openExternalSafe = (rawUrl) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(parsed.href).catch(() => {});
      }
    } catch {
      // Ignore invalid URLs.
    }
  };

  // Intercept window.open — always deny; open http(s) links externally.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });

  // Deny all in-app navigation by default; open http(s) links externally.
  win.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
    openExternalSafe(url);
  });

  win.loadURL('app://dashboard/');
}

app.whenReady().then(() => {
  registerAppProtocol();
  registerOAuthBridge();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
