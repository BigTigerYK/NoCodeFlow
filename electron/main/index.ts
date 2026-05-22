import { app, crashReporter } from 'electron';
import { createMainWindow } from './window';
import { registerAllIpcHandlers, cleanupAllIpcHandlers } from './ipc';
import { cleanupFsWatchers } from './ipc/fs';
import { logger } from './logger';

// Crash Reporter — must be set up before app.whenReady
crashReporter.start({
  submitURL: '',
  productName: 'NoCodeFlow',
  compress: true,
  uploadToServer: false,
});

logger.info('Application starting', 'main');
logger.info(`Crash reports directory: ${app.getPath('crashDumps')}`, 'main');

app.whenReady().then(() => {
  logger.info('Application ready', 'main');
  registerAllIpcHandlers();
  createMainWindow();
});

app.on('before-quit', () => {
  logger.info('Application quitting', 'main');
  cleanupAllIpcHandlers();
  logger.dispose();
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

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', 'main', { message: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', 'main', { reason: String(reason) });
});
