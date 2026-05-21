import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { configStore, encryptApiKeys, decryptApiKeys } from '../store/config';
import type { AppConfig } from '@shared/types/config';

export function registerConfigHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (_event, key: string) => {
    const value = configStore.get(key as keyof AppConfig);
    if (key === 'claude') {
      return decryptApiKeys({ claude: value } as AppConfig).claude;
    }
    return value;
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_event, key: string, value: unknown) => {
    if (key === 'claude') {
      const encrypted = encryptApiKeys({ claude: value } as AppConfig);
      configStore.set(key, encrypted.claude);
    } else {
      configStore.set(key, value);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_ALL, () => {
    const config = configStore.store;
    return decryptApiKeys(config);
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_DELETE, (_event, key: string) => {
    configStore.delete(key as keyof AppConfig);
  });
}
