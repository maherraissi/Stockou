const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');

// Allow installer to close the app gracefully via --quit argument
if (process.argv.includes('--quit')) {
  app.quit();
}

let mainWindow;

// Ensure Electron storage paths are writable (prevents cache/storage failures
// that can break IndexedDB / jeep-sqlite web store on some Windows setups).
try {
  const userDataPath = path.join(app.getPath('appData'), 'Stockou');
  app.setPath('userData', userDataPath);
  app.setPath('cache', path.join(userDataPath, 'Cache'));
  app.commandLine.appendSwitch('disable-gpu-cache');
} catch (e) {
  // Non-fatal: keep defaults
  console.warn('Failed to set Electron paths:', e);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../src/assets/icon/favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // needed to load local SQLite assets
    },
    titleBarStyle: 'default',
    title: 'Stockou'
  });

  // Load the built Angular app
  const indexPath = path.join(__dirname, '../www/index.html');
  mainWindow.loadURL(
    url.format({
      pathname: indexPath,
      protocol: 'file:',
      slashes: true
    })
  );

  // Remove default menu
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
