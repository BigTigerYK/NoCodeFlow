import { registerFsHandlers } from './fs';
import { registerConfigHandlers } from './config';
import { registerDialogHandlers } from './dialog';

export function registerAllIpcHandlers(): void {
  registerFsHandlers();
  registerConfigHandlers();
  registerDialogHandlers();
}
