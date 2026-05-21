import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { ClaudeProfile } from '@shared/types/config';
import { ClaudeAdapter } from '../agent';
import { configStore } from '../store/config';

let adapter: ClaudeAdapter | null = null;

export function registerAgentHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AGENT_START, async (event, options: {
    workspacePath: string;
    model?: string;
    permissionMode?: 'default' | 'auto';
  }) => {
    if (adapter) {
      adapter.destroy();
    }

    // Read active profile from config
    const profiles = (configStore.get('claude.profiles', []) as ClaudeProfile[]);
    const activeId = configStore.get('claude.activeProfileId', null) as string | null;
    const activeProfile = profiles.find(p => p.id === activeId);

    adapter = new ClaudeAdapter({
      workspacePath: options.workspacePath,
      model: activeProfile?.model || options.model,
      permissionMode: options.permissionMode ?? 'default',
      apiBaseUrl: activeProfile?.baseUrl,
      apiKey: activeProfile?.apiKey,
    });

    const availability = await adapter.checkAvailability();
    if (!availability.available) {
      adapter.destroy();
      adapter = null;
      return { success: false, error: availability.error };
    }

    const win = BrowserWindow.fromWebContents(event.sender);

    adapter.onOutput((outputEvent) => {
      win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    });

    adapter.onStatusChange((status) => {
      win?.webContents.send(IPC_CHANNELS.AGENT_STATUS, { status });
    });

    return { success: true, version: availability.version };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_SEND, async (event, message: string) => {
    if (!adapter) {
      throw new Error('Agent not started. Call AGENT_START first.');
    }
    adapter.send(message).catch((err) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, {
        type: 'error',
        data: err.message,
        timestamp: Date.now(),
      });
    });
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_STOP, async () => {
    if (adapter) {
      await adapter.stop();
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_STATUS, async () => {
    return {
      status: adapter?.getStatus() ?? 'idle',
    };
  });
}

export function cleanupAgent(): void {
  adapter?.destroy();
  adapter = null;
}
