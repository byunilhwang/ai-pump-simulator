const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn, fork } = require('child_process');
const http = require('http');

let mainWindow;
let nextServer;
const isDev = !app.isPackaged;
const port = 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'AI 펌프 시뮬레이터',
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkServer = () => {
      attempts++;
      http.get(`http://localhost:${port}`, (res) => {
        resolve();
      }).on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(checkServer, 500);
        } else {
          reject(new Error('Server did not start in time'));
        }
      });
    };
    checkServer();
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      waitForServer().then(resolve).catch(reject);
      return;
    }

    const serverPath = app.isPackaged
      ? path.join(process.resourcesPath, '.next', 'standalone', 'server.js')
      : path.join(__dirname, '..', '.next', 'standalone', 'server.js');

    console.log('Starting Next.js server from:', serverPath);

    nextServer = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: port,
        HOSTNAME: 'localhost',
      },
      stdio: 'pipe',
    });

    nextServer.stdout?.on('data', (data) => {
      console.log(`Next.js: ${data}`);
    });

    nextServer.stderr?.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    waitForServer().then(resolve).catch(reject);
  });
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
