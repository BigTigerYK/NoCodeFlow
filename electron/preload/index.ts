import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';

const api = {
  invoke: (channel: string, ...args: unknown[]) => {
    const allowedChannels = Object.values(IPC_CHANNELS);
    if (allowedChannels.includes(channel as any)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
  },

  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      IPC_CHANNELS.AGENT_OUTPUT,
      IPC_CHANNELS.AGENT_STATUS,
      IPC_CHANNELS.FS_WATCH,
      IPC_CHANNELS.PERMISSION_REQUEST,
    ];
    if (allowedChannels.includes(channel as any)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },
};

contextBridge.exposeInMainWorld('api', api);
