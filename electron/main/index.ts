import { app } from 'electron';
import { createMainWindow } from './window';
import { registerAllIpcHandlers } from './ipc';

app.whenReady().then(() => {
  registerAllIpcHandlers();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  const { BrowserWindow } = require('electron');
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
