import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { getConfigStore, encryptApiKeys, decryptApiKeys } from '../store/config';
import type { AppConfig } from '@shared/types/config';

export function registerConfigHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (_event, key: string) => {
    const value = getConfigStore().get(key as keyof AppConfig);
    if (key === 'claude') {
      return decryptApiKeys({ claude: value } as AppConfig).claude;
    }
    return value;
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_event, key: string, value: unknown) => {
    if (key === 'claude') {
      const encrypted = encryptApiKeys({ claude: value } as AppConfig);
      getConfigStore().set(key, encrypted.claude);
    } else {
      getConfigStore().set(key, value);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_ALL, () => {
    const config = getConfigStore().store;
    return decryptApiKeys(config);
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_DELETE, (_event, key: string) => {
    getConfigStore().delete(key as keyof AppConfig);
  });
}
