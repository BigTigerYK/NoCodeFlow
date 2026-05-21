import { registerFsHandlers } from './fs';
import { registerConfigHandlers } from './config';
import { registerDialogHandlers } from './dialog';
import { registerAgentHandlers, cleanupAgent } from './agent';

export function registerAllIpcHandlers(): void {
  registerFsHandlers();
  registerConfigHandlers();
  registerDialogHandlers();
  registerAgentHandlers();
}

export function cleanupAllIpcHandlers(): void {
  cleanupAgent();
}
