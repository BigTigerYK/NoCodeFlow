import { registerFsHandlers } from './fs';
import { registerConfigHandlers } from './config';
import { registerDialogHandlers } from './dialog';
import { registerAgentHandlers, cleanupAgent } from './agent';
import { registerPermissionHandlers } from './permission';
import { registerSnapshotHandlers, cleanupSnapshotManager } from './snapshot';

export function registerAllIpcHandlers(): void {
  registerFsHandlers();
  registerConfigHandlers();
  registerDialogHandlers();
  registerPermissionHandlers();
  registerSnapshotHandlers();
  registerAgentHandlers();
}

export function cleanupAllIpcHandlers(): void {
  cleanupAgent();
  cleanupSnapshotManager();
}
