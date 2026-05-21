import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { ClaudeAdapter } from '../agent';
import { configStore, decryptApiKeys } from '../store/config';
import { getPermissionManager, waitForPermissionResponse, removePendingConfirmation } from './permission';
import type { AgentOutputEvent } from '@shared/types/agent';

let adapter: ClaudeAdapter | null = null;

async function handleAgentOutput(win: BrowserWindow | null, outputEvent: AgentOutputEvent): Promise<void> {
  // 非 tool_use 事件直接转发
  if (outputEvent.type !== 'tool_use') {
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    return;
  }

  const permManager = getPermissionManager();
  if (!permManager) {
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    return;
  }

  const toolName = (outputEvent.data.name as string) || '';
  const input = (typeof outputEvent.data.input === 'object' && outputEvent.data.input !== null
    ? outputEvent.data.input
    : {}) as Record<string, unknown>;
  const toolId = (outputEvent.data.id as string) || '';

  const result = await permManager.evaluate(toolName, input, toolId);

  // 自动允许 — 直接转发
  if (result.riskLevel === 'auto_allow') {
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
    return;
  }

  // 直接拒绝 — 记录 + 发送拒绝消息
  if (result.riskLevel === 'deny' && result.request) {
    permManager.record(result.request, 'deny', false);
    win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, {
      type: 'system',
      data: { message: `权限拒绝：${result.request.description}` },
      timestamp: Date.now(),
    } as AgentOutputEvent);
    return;
  }

  // 需要确认
  if (result.riskLevel === 'confirm' && result.request) {
    // 检查会话记忆
    const remembered = permManager.checkSessionMemory(result.request);
    if (remembered !== null) {
      permManager.record(result.request, remembered ? 'allow' : 'deny', true);
      if (remembered) {
        win?.webContents.send(IPC_CHANNELS.AGENT_OUTPUT, outputEvent);
      }
      return;
    }

    // 发送权限请求到渲染进程，等待用户响应
    win?.webContents.send(IPC_CHANNELS.PERMISSION_REQUEST, result.request);

    try {
      const allowed = await waitForPermissionResponse(result.request.id, outputEvent);
      permManager.record(result.request, allowed ? 'allow' : 'deny', false);
      if (allowed) {
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
      adapter.destroy();
    }

    // Read active profile from config (decrypt API keys)
    const fullConfig = configStore.store;
    const decrypted = decryptApiKeys(fullConfig);
    const profiles = decrypted.claude.profiles;
    const activeId = decrypted.claude.activeProfileId;
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
      handleAgentOutput(win, outputEvent);
    });

    adapter.onStatusChange((status) => {
      win?.webContents.send(IPC_CHANNELS.AGENT_STATUS, { status });
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
