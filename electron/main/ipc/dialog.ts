import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { getMainWindow } from '../window';

export function registerDialogHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG_MESSAGE, async (_event, options) => {
    const win = getMainWindow();
    if (!win) return null;
    return dialog.showMessageBox(win, options as Electron.MessageBoxOptions);
  });
}
