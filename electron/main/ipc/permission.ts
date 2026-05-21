import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { PermissionManager } from '../sandbox/permission-manager';
import type { PermissionRequest, PermissionResponse } from '@shared/types/permission';

let manager: PermissionManager | null = null;

/** 待确认队列：requestId → { event, resolve } */
const pendingConfirmations = new Map<string, {
  event: unknown;
  resolve: (allowed: boolean) => void;
}>();

export function registerPermissionHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PERMISSION_INIT, async (_event, workspacePath: string) => {
    manager = new PermissionManager(workspacePath);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_UPDATE_WORKSPACE, async (_event, workspacePath: string) => {
    manager?.updateWorkspace(workspacePath);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_GET_RECORDS, async () => {
    return manager?.getRecords() ?? [];
  });

  ipcMain.handle(IPC_CHANNELS.PERMISSION_RESPOND, async (_event, response: PermissionResponse) => {
    const pending = pendingConfirmations.get(response.requestId);
    if (pending) {
      pending.resolve(response.decision === 'allow');
    }
    return { success: true };
  });
}

export function getPermissionManager(): PermissionManager | null {
  return manager;
}

/** 等待用户对指定请求的响应 */
export function waitForPermissionResponse(requestId: string, event: unknown): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    pendingConfirmations.set(requestId, { event, resolve });
  });
}

/** 清理待确认队列中的条目 */
export function removePendingConfirmation(requestId: string): void {
  pendingConfirmations.delete(requestId);
}
