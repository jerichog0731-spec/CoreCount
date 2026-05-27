/**
 * CoreCount Desktop — Electron Main Process
 *
 * What this does:
 *  1. Checks if the Express backend is already running on port 5000
 *  2. If not, spawns it using the system's Node.js
 *  3. Waits up to 15 seconds for the server to become ready
 *  4. Opens a native window pointing to http://localhost:5000
 *  5. On close, kills the backend child process cleanly
 *
 * The project directory is resolved relative to where this file lives.
 * This .exe sits in electron/ and the backend is one level up.
 */

'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path  = require('path');
const http  = require('http');
const fs    = require('fs');

const PORT        = 5000;
const PROJECT_DIR = path.resolve(__dirname, '..');          // c:\Project Dignity CoreCount
const SERVER_JS   = path.join(PROJECT_DIR, 'dist', 'server.js');

let win           = null;
let serverProcess = null;

// ── Health check ──────────────────────────────────────────────────────────

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.request(
      { host: 'localhost', port: PORT, path: '/api/health', timeout: 2000 },
      (res) => resolve(res.statusCode === 200)
    );
    req.on('error',   () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function waitForServer(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await checkHealth()) return true;
    await new Promise(r => setTimeout(r, 600));
  }
  return false;
}

// ── Start backend ─────────────────────────────────────────────────────────

function startServer() {
  if (!fs.existsSync(SERVER_JS)) {
    dialog.showErrorBox(
      'Backend Not Built',
      `CoreCount server not found at:\n${SERVER_JS}\n\nPlease run: npm run build\nin the project directory and try again.`
    );
    app.quit();
    return false;
  }

  // Use the system Node.js that the user already has installed
  const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node';

  serverProcess = spawn(nodeBin, [SERVER_JS], {
    cwd:   PROJECT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT:          String(PORT),
      DATABASE_PATH: path.join(PROJECT_DIR, 'data', 'pdh_core.db'),
    },
  });

  serverProcess.stdout?.on('data', d => process.stdout.write('[Backend] ' + d));
  serverProcess.stderr?.on('data', d => process.stderr.write('[Backend ERR] ' + d));
  serverProcess.on('exit', code => console.log(`[Backend] process exited with code ${code}`));

  return true;
}

// ── Create window ─────────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width:           1300,
    height:          840,
    minWidth:        880,
    minHeight:       560,
    title:           'CoreCount C.O.R.E. — Project Dignity Hobbs',
    backgroundColor: '#0a0a0f',
    show:            false,           // Show after content loads to avoid white flash
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.cjs'),
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(`http://localhost:${PORT}`);

  win.once('ready-to-show', () => {
    win.show();
    console.log('[Electron] Window ready at http://localhost:' + PORT);
  });

  // Open external links in the system browser, not in the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  console.log('[Electron] Starting CoreCount...');
  console.log('[Electron] Project directory:', PROJECT_DIR);

  // Check if backend is already running (e.g. user ran npm run dev separately)
  const alreadyUp = await checkHealth();

  if (!alreadyUp) {
    console.log('[Electron] Starting backend server...');
    const ok = startServer();
    if (!ok) return;

    const ready = await waitForServer(15000);
    if (!ready) {
      dialog.showErrorBox(
        'Server Timeout',
        'CoreCount backend failed to start within 15 seconds.\n\nCheck that Node.js is installed and try running:\nnpm run build\nin the project directory.'
      );
      if (serverProcess) serverProcess.kill();
      app.quit();
      return;
    }
  } else {
    console.log('[Electron] Backend already running on port', PORT);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('[Electron] Shutting down backend...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
