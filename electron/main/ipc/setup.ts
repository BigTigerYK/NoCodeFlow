import { ipcMain, shell, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, SetupProgress, InstallResult } from '@shared/types/setup';
import { envManager } from '../env/environment-manager';
import { logger } from '../logger';

export function registerSetupHandlers(): void {

  // ─── 依赖检测（前端 agent.ts initialize 第一步调用）───
  ipcMain.handle(IPC_CHANNELS.SETUP_CHECK_DEPS, async (): Promise<DepCheckResult> => {
    const result = await envManager.check();
    return {
      nodeAvailable: result.nodeAvailable,
      nodeVersion: result.nodeVersion,
      cliAvailable: result.cliAvailable,
      cliVersion: result.cliVersion,
      cliCmd: result.cliCmd,
      shellAvailable: result.shellAvailable,
      shellType: result.shellType,
      shellPath: result.shellPath,
      cliDir: result.cliDir,
    };
  });

  // ─── 打开外部链接 ───
  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  // ─── 安装 CLI（前端自动安装流程调用）───
  ipcMain.handle(IPC_CHANNELS.SETUP_INSTALL_CLI, async (event): Promise<InstallResult> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const sendProgress = (line: string) => {
      win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, { type: 'stdout', line } as SetupProgress);
    };

    const result = await envManager.installCli(sendProgress);

    if (result.success) {
      win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, { type: 'status', line: 'done' } as SetupProgress);
    }

    return result;
  });

  // ─── 安装 Shell（前端自动安装流程调用）───
  ipcMain.handle(IPC_CHANNELS.SETUP_INSTALL_SHELL, async (event): Promise<InstallResult> => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const sendProgress = (line: string) => {
      win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, { type: 'stdout', line } as SetupProgress);
    };

    const result = await envManager.installShell(sendProgress);

    if (result.success) {
      // 重置 shell 缓存，下次检测会重新扫描
      (envManager as any).cachedShell = null;
      win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, { type: 'status', line: 'done' } as SetupProgress);
    }

    return result;
  });
}
