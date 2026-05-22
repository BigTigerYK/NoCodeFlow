import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { SnapshotManager } from '../snapshot';

let snapshotManager: SnapshotManager | null = null;

export function getSnapshotManager(): SnapshotManager | null {
  return snapshotManager;
}

export function initSnapshotManager(workspacePath: string): SnapshotManager {
  snapshotManager = new SnapshotManager(workspacePath);
  snapshotManager.init();
  return snapshotManager;
}

export function cleanupSnapshotManager(): void {
  snapshotManager = null;
}

export function registerSnapshotHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SNAPSHOT_LIST, async (_event, args?: { filePath?: string }) => {
    if (!snapshotManager) return { data: [] };
    const snapshots = await snapshotManager.listSnapshots(args);
    return { data: snapshots };
  });

  ipcMain.handle(IPC_CHANNELS.SNAPSHOT_GET, async (_event, args: { snapshotId: string }) => {
    if (!snapshotManager) return { error: 'Snapshot manager not initialized' };
    const result = await snapshotManager.getSnapshotContent(args.snapshotId);
    if (!result) return { error: 'Snapshot not found' };
    return { data: result };
  });

  ipcMain.handle(IPC_CHANNELS.SNAPSHOT_RESTORE, async (_event, args: { snapshotId: string }) => {
    if (!snapshotManager) return { error: 'Snapshot manager not initialized' };
    const result = await snapshotManager.restoreSnapshot(args.snapshotId);
    return { data: result };
  });

  ipcMain.handle(IPC_CHANNELS.SNAPSHOT_DELETE, async (_event, args: { snapshotId: string }) => {
    if (!snapshotManager) return { error: 'Snapshot manager not initialized' };
    const success = await snapshotManager.deleteSnapshot(args.snapshotId);
    return { data: { success } };
  });
}
