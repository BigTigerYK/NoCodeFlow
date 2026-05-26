import { ipcMain, shell, BrowserWindow, app } from 'electron';
import { spawn } from 'child_process';
import { platform } from 'os';
import path from 'path';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, SetupProgress, InstallResult } from '@shared/types/setup';
import { logger } from '../logger';

function getNpmCommand(): string {
  return platform() === 'win32' ? 'npm.cmd' : 'npm';
}

function getNodeCommand(): string {
  return platform() === 'win32' ? 'node.exe' : 'node';
}

function getClaudeCommand(): string {
  return platform() === 'win32' ? 'claude.cmd' : 'claude';
}

function spawnCheck(cmd: string, args: string[]): Promise<{ available: boolean; version: string | null }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { timeout: 5000, shell: true });
    let stdout = '';
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.on('close', (code) => {
      resolve(code === 0 ? { available: true, version: stdout.trim() } : { available: false, version: null });
    });
    proc.on('error', () => resolve({ available: false, version: null }));
  });
}

export function registerSetupHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETUP_CHECK_DEPS, async (): Promise<DepCheckResult> => {
    const node = await spawnCheck(getNodeCommand(), ['--version']);
    const cli = node.available ? await spawnCheck(getClaudeCommand(), ['--version']) : { available: false, version: null };
    logger.info(`[setup] deps check: node=${node.available}(${node.version}), cli=${cli.available}(${cli.version})`);
    return {
      nodeAvailable: node.available,
      nodeVersion: node.version,
      cliAvailable: cli.available,
      cliVersion: cli.version,
    };
  });

  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SETUP_INSTALL_CLI, async (event): Promise<InstallResult> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    logger.info('[setup] starting npm install -g @anthropic-ai/claude-code');

    return new Promise<InstallResult>((resolve) => {
      const proc = spawn(getNpmCommand(), ['install', '-g', '@anthropic-ai/claude-code', '--registry', 'https://registry.npmmirror.com'], {
        timeout: 120_000,
        env: { ...process.env },
        shell: true,
      });

      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, {
            type: 'stdout',
            line: line.trim(),
          } as SetupProgress);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, {
            type: 'stderr',
            line: line.trim(),
          } as SetupProgress);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          logger.info('[setup] npm install completed successfully');
          win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, {
            type: 'status',
            line: 'done',
          } as SetupProgress);
          resolve({ success: true });
        } else {
          logger.error(`[setup] npm install failed with exit code ${code}`);
          resolve({ success: false, error: `npm exited with code ${code}` });
        }
      });

      proc.on('error', (err) => {
        logger.error(`[setup] npm install error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });
    });
  });

  ipcMain.handle(IPC_CHANNELS.SETUP_INSTALL_ALL, async (event): Promise<InstallResult> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const scriptPath = path.join(app.isPackaged
      ? process.resourcesPath
      : path.join(app.getAppPath(), 'scripts'), 'setup-deps.ps1');

    logger.info(`[setup] running setup script: ${scriptPath}`);

    return new Promise<InstallResult>((resolve) => {
      const proc = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
        timeout: 300_000,
        shell: true,
      });

      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, {
            type: 'stdout',
            line: line.trim(),
          } as SetupProgress);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, {
            type: 'stderr',
            line: line.trim(),
          } as SetupProgress);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          logger.info('[setup] setup script completed successfully');
          win?.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, {
            type: 'status',
            line: 'done',
          } as SetupProgress);
          resolve({ success: true });
        } else {
          logger.error(`[setup] setup script failed with exit code ${code}`);
          resolve({ success: false, error: `脚本退出码: ${code}` });
        }
      });

      proc.on('error', (err) => {
        logger.error(`[setup] setup script error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });
    });
  });
}
