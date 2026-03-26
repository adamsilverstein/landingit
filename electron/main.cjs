const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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

  // Open external links in the default system browser instead of in the Electron app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch {
      // Ignore invalid URLs.
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch {
      // Ignore invalid URLs.
    }
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
