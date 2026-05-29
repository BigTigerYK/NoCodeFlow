import { registerFsHandlers } from './fs';
import { registerConfigHandlers } from './config';
import { registerDialogHandlers } from './dialog';
import { registerAgentHandlers, cleanupAgent } from './agent';
import { registerPermissionHandlers } from './permission';
import { registerSnapshotHandlers, cleanupSnapshotManager } from './snapshot';
import { registerDocumentHandlers } from './document';
import { registerSetupHandlers } from './setup';
import { registerDebugHandlers } from './debug';

export function registerAllIpcHandlers(): void {
  registerFsHandlers();
  registerConfigHandlers();
  registerDialogHandlers();
  registerPermissionHandlers();
  registerSnapshotHandlers();
  registerAgentHandlers();
  registerDocumentHandlers();
  registerSetupHandlers();
  registerDebugHandlers();
}

export function cleanupAllIpcHandlers(): void {
  cleanupAgent();
  cleanupSnapshotManager();
}
