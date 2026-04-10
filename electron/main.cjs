const { app, BrowserWindow, net, protocol, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

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
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
