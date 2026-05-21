import { registerFsHandlers } from './fs';
import { registerConfigHandlers } from './config';
import { registerDialogHandlers } from './dialog';
import { registerAgentHandlers, cleanupAgent } from './agent';
import { registerPermissionHandlers } from './permission';

export function registerAllIpcHandlers(): void {
  registerFsHandlers();
  registerConfigHandlers();
  registerDialogHandlers();
  registerPermissionHandlers();
  registerAgentHandlers();
}

export function cleanupAllIpcHandlers(): void {
  cleanupAgent();
}
