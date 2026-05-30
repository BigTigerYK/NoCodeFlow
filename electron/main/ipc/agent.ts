import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { createAdapter, type AgentAdapter } from '../agent/adapters';
import { configStore, decryptApiKeys } from '../store/config';
import { getPermissionManager, waitForPermissionResponse, removePendingConfirmation } from './permission';
import { getSnapshotManager, initSnapshotManager } from './snapshot';
import type { AgentOutputEvent } from '@shared/types/agent';
import { logger } from '../logger';

let adapter: AgentAdapter | null = null;

async function snapshotBeforeModify(toolName: string, input: Record<string, unknown>): Promise<void> {
  if ((toolName === 'Write' || toolName === 'Edit') && typeof input.file_path === 'string') {
    const snapMgr = getSnapshotManager();
    if (snapMgr) {
      await snapMgr.createSnapshot(input.file_path, toolName as 'Write' | 'Edit', '');
    }
  }
}

async function handleAgentOutput(win: BrowserWindow | null, outputEvent: AgentOutputEvent): Promise<void> {
  if (outputEvent.type !== 'tool_use') {
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    return;
  }

  const permManager = getPermissionManager();
  if (!permManager) {
    const toolName = (outputEvent.data.name as string) || '';
    const input = (typeof outputEvent.data.input === 'object' && outputEvent.data.input !== null
      ? outputEvent.data.input
      : {}) as Record<string, unknown>;
    await snapshotBeforeModify(toolName, input);
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    return;
  }

  const toolName = (outputEvent.data.name as string) || '';
  const input = (typeof outputEvent.data.input === 'object' && outputEvent.data.input !== null
    ? outputEvent.data.input
    : {}) as Record<string, unknown>;
  const toolId = (outputEvent.data.id as string) || '';

  const result = await permManager.evaluate(toolName, input, toolId);

  if (result.riskLevel === 'auto_allow') {
    await snapshotBeforeModify(toolName, input);
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    return;
  }

  if (result.riskLevel === 'deny' && result.request) {
    permManager.record(result.request, 'deny', false);
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, {
      type: 'system',
      data: { message: `权限拒绝：${result.request.description}` },
      timestamp: Date.now(),
    } as AgentOutputEvent);
    return;
  }

  if (result.riskLevel === 'confirm' && result.request) {
    const remembered = permManager.checkSessionMemory(result.request);
    if (remembered !== null) {
      permManager.record(result.request, remembered ? 'allow' : 'deny', true);
      if (remembered) {
        await snapshotBeforeModify(toolName, input);
        win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
      }
      return;
    }

    win?.webContents.send(IPC_CHANNELS.PERMISSION_REQUEST, result.request);

    try {
      const allowed = await waitForPermissionResponse(result.request.id, outputEvent);
      permManager.record(result.request, allowed ? 'allow' : 'deny', false);
      if (allowed) {
        await snapshotBeforeModify(toolName, input);
        win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
      }
    } finally {
      removePendingConfirmation(result.request.id);
    }
  }
}

export function registerAgentHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AGENT_START, async (event, options: {
    workspacePath: string;
    model?: string;
    permissionMode?: 'default' | 'auto';
  }) => {
    if (adapter) {
      adapter.stop();
    }

    const fullConfig = configStore.store;
    const decrypted = decryptApiKeys(fullConfig);
    const profiles = decrypted.claude.profiles;
    const activeId = decrypted.claude.activeProfileId;
    const activeProfile = profiles.find(p => p.id === activeId);

    const adapterType = activeProfile?.adapterType || 'claude-code';
    logger.info(`Starting agent with adapter: ${adapterType}`, 'agent');

    adapter = createAdapter(adapterType, {
      workspacePath: options.workspacePath,
      model: activeProfile?.model || options.model,
      apiBaseUrl: activeProfile?.baseUrl,
      apiKey: activeProfile?.apiKey,
    });

    initSnapshotManager(options.workspacePath);

    const availability = await adapter.checkAvailability();
    if (!availability.available) {
      adapter.stop();
      adapter = null;
      return { success: false, error: availability.error };
    }

    const win = BrowserWindow.fromWebContents(event.sender);

    adapter.onOutput((outputEvent) => {
      if (win && !win.isDestroyed()) {
        handleAgentOutput(win, outputEvent);
      }
    });

    adapter.onStatusChange((status) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.AGENT_STATUS, { status });
      }
    });

    return { success: true, version: availability.version };
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_SEND, async (_event, message: string) => {
    if (!adapter) {
      return { success: false, error: 'Agent not started. Call AGENT_START first.' };
    }
    try {
      await adapter.send(message);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_STOP, async () => {
    if (adapter) {
      adapter.stop();
    }
    return { success: true };
  });
}

export function cleanupAgent(): void {
  adapter?.stop();
  adapter = null;
}
