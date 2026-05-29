import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { logger } from '../logger';

export function registerDebugHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DEBUG_GET_LOGS, async (_event, opts?: { lastLines?: number }) => {
    const lines = opts?.lastLines ?? 200;
    try {
      const logDir = logger.getLogDir();
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const logFile = path.join(logDir, `nocodeflow-${dateStr}.log`);

      if (!fs.existsSync(logFile)) {
        return { success: true, content: '(no log file found)', path: logFile };
      }

      const content = fs.readFileSync(logFile, 'utf-8');
      const allLines = content.split('\n').filter(Boolean);
      const recentLines = allLines.slice(-lines);

      // 解析 JSON 并格式化为可读文本
      const formatted = recentLines.map(line => {
        try {
          const entry = JSON.parse(line);
          const time = entry.timestamp?.substring(11, 19) || '';
          const ctx = entry.context ? `[${entry.context}]` : '';
          const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
          return `${time} ${entry.level.toUpperCase()} ${ctx} ${entry.message}${data}`;
        } catch {
          return line;
        }
      });

      return { success: true, content: formatted.join('\n'), path: logFile };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
