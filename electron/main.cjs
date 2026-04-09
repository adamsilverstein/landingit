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

  // Serve dist/ files via the app:// protocol so the renderer has a real
  // origin and can make authenticated GitHub API requests without CORS issues.
  const distDir = path.join(__dirname, '..', 'dist');
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let filePath = path.join(distDir, decodeURIComponent(url.pathname));
    // Default to index.html for the root path
    if (url.pathname === '/' || url.pathname === '') {
      filePath = path.join(distDir, 'index.html');
    }
    return net.fetch(pathToFileURL(filePath).toString());
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
