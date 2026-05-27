/**
 * CoreCount Desktop — Electron Main Process
 *
 * Features:
 *  1. Auto-starts the Express backend on port 5000
 *  2. Waits for the backend to be ready (health check)
 *  3. Opens a native window at http://localhost:5000
 *  4. Checks GitHub Releases for updates on every launch
 *  5. Downloads updates silently in the background
 *  6. Prompts user to restart when update is ready
 */

'use strict';

const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log             = require('electron-log');
const { spawn }       = require('child_process');
const path            = require('path');
const http            = require('http');
const fs              = require('fs');

// ── Logging ───────────────────────────────────────────────────────────────
// Logs written to: %USERPROFILE%\AppData\Roaming\CoreCount\logs\main.log
log.transports.file.level = 'info';
autoUpdater.logger        = log;

const PORT        = 5000;
const PROJECT_DIR = path.resolve(__dirname, '..');
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
      `CoreCount server not found at:\n${SERVER_JS}\n\nRun: npm run build\nin the project directory.`
    );
    app.quit();
    return false;
  }

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

  serverProcess.stdout?.on('data', d => log.info('[Backend]',     d.toString().trim()));
  serverProcess.stderr?.on('data', d => log.warn('[Backend ERR]', d.toString().trim()));
  serverProcess.on('exit', code => log.info(`[Backend] exited with code ${code}`));

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
    show:            false,
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

    // Start update check after window is visible (non-blocking)
    if (app.isPackaged) {
      setTimeout(() => setupAutoUpdater(), 3000);
    } else {
      log.info('[Update] Skipping update check in dev mode.');
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

// ── Auto-updater ──────────────────────────────────────────────────────────

function setupAutoUpdater() {
  log.info('[Update] Checking for updates from GitHub Releases...');

  // Silent background check — no dialog until update is actually ready
  autoUpdater.autoDownload    = true;   // download silently
  autoUpdater.autoInstallOnAppQuit = true; // install on next quit if user clicked "Later"

  autoUpdater.on('checking-for-update', () => {
    log.info('[Update] Checking...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`[Update] v${info.version} available — downloading in background...`);

    // Show a subtle non-blocking notification
    if (win) {
      dialog.showMessageBox(win, {
        type:    'info',
        title:   '⬇️ Update Found',
        message: `CoreCount ${info.version} is available`,
        detail:  'Downloading in the background. You\'ll be notified when it\'s ready.',
        buttons: ['OK'],
        noLink:  true,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    log.info('[Update] Already on the latest version.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    log.info(`[Update] Downloading... ${pct}% (${Math.round(progress.transferred / 1024)}KB / ${Math.round(progress.total / 1024)}KB)`);

    // Show download progress in the taskbar
    if (win) win.setProgressBar(progress.percent / 100);
  });

  autoUpdater.on('update-downloaded', (info) => {
    // Clear the taskbar progress bar
    if (win) win.setProgressBar(-1);

    log.info(`[Update] v${info.version} downloaded — prompting user.`);

    if (!win) { autoUpdater.quitAndInstall(); return; }

    dialog.showMessageBox(win, {
      type:      'info',
      title:     '✅ Update Ready',
      message:   `CoreCount ${info.version} is ready to install`,
      detail:    'The update has been downloaded. Restart now to apply it, or it will install automatically the next time you close the app.',
      buttons:   ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId:  1,
      noLink:    true,
    }).then(({ response }) => {
      if (response === 0) {
        log.info('[Update] User chose Restart Now — installing.');
        autoUpdater.quitAndInstall(false, true);
      } else {
        log.info('[Update] User chose Later — will install on next quit.');
      }
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('[Update] Error:', err.message);
    // Don't bother the user with update errors — just log them
  });

  autoUpdater.checkForUpdates().catch(err => {
    log.warn('[Update] checkForUpdates failed (no network?):', err.message);
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  log.info('[Electron] CoreCount starting up...');
  log.info('[Electron] Project directory:', PROJECT_DIR);
  log.info('[Electron] Version:', app.getVersion());

  const alreadyUp = await checkHealth();

  if (!alreadyUp) {
    log.info('[Electron] Starting backend...');
    const ok = startServer();
    if (!ok) return;

    const ready = await waitForServer(15000);
    if (!ready) {
      dialog.showErrorBox(
        'Server Timeout',
        'CoreCount backend failed to start within 15 seconds.\n\nMake sure Node.js is installed and run:\n  npm run build\nin the project directory.'
      );
      if (serverProcess) serverProcess.kill();
      app.quit();
      return;
    }
  } else {
    log.info('[Electron] Backend already running on port', PORT);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    log.info('[Electron] Shutting down backend...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
