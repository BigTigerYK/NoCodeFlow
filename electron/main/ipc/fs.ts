import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { getMainWindow } from '../window';

export function registerFsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FS_OPEN_DIALOG, async () => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });
}
