import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { configStore } from '../store/config';

export function registerConfigHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (_event, key: string) => {
    return configStore.get(key);
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_event, key: string, value: unknown) => {
    configStore.set(key, value);
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_ALL, () => {
    return configStore.store;
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_DELETE, (_event, key: string) => {
    configStore.delete(key);
  });
}
