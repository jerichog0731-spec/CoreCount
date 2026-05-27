// CoreCount — Electron Preload Script
// Runs in the renderer process with Node.js disabled.
// Use this to safely expose backend APIs to the renderer if needed in the future.
'use strict';

const { contextBridge } = require('electron');

// Expose the app version and platform to the renderer
contextBridge.exposeInMainWorld('corecount', {
  version:  process.env.npm_package_version ?? '1.0.0',
  platform: process.platform,
});
