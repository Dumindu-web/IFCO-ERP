const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

async function startServer() {
  const userDataPath = app.getPath('userData');
  process.env.DB_PATH = path.join(userDataPath, 'inventory.db');
  process.env.PORT = '3000';
  process.env.NODE_ENV = 'production';

  const serverPath = path.join(__dirname, '../dist/server.cjs');
  // Require the CJS server module
  require(serverPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  try {
    await startServer();
    // Give it a small delay to ensure Express is listening
    setTimeout(createWindow, 1000);
  } catch (err) {
    console.error('Failed to start server:', err);
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
