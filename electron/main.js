import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the local server
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // Set production environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3000';

  // Start the Express server directly in the main process
  try {
    await import('../dist/server.js');
  } catch (err) {
    console.error('Failed to start server:', err);
  }

  // Give the server a moment to bind to the port, then open the window
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
