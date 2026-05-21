import { app } from 'electron';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from './ipc';
import { cleanupFsWatchers } from './ipc/fs';

app.whenReady().then(() => {
  registerAllIpcHandlers();
  createMainWindow();
});

app.on('window-all-closed', async () => {
  await cleanupFsWatchers();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  const { BrowserWindow } = require('electron');
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
