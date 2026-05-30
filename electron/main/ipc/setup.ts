import { ipcMain, shell, BrowserWindow, app } from 'electron';
import { spawn } from 'child_process';
import { platform } from 'os';
import fs from 'fs';
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

/** 返回打包的 Node.js 便携版目录 */
function getBundledNodeDir(): string {
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources');
  return path.join(base, 'node', 'win-x64');
}

function hasBundledNode(): boolean {
  const dir = getBundledNodeDir();
  return fs.existsSync(path.join(dir, getNodeCommand()));
}

function spawnCheck(cmd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ available: boolean; version: string | null }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { timeout: 5000, shell: true, env: env ?? process.env });
    let stdout = '';
    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.on('close', (code) => {
      resolve(code === 0 ? { available: true, version: stdout.trim() } : { available: false, version: null });
    });
    proc.on('error', () => resolve({ available: false, version: null }));
  });
}

/** 构建包含 bundled Node.js 的环境变量 */
function buildEnvWithBundledNode(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const nodeDir = getBundledNodeDir();
  env.PATH = nodeDir + path.delimiter + env.PATH;
  return env;
}

export function registerSetupHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETUP_CHECK_DEPS, async (): Promise<DepCheckResult> => {
    // 先检查系统 node
    const systemNode = await spawnCheck(getNodeCommand(), ['--version']);
    let nodeAvailable = systemNode.available;
    let nodeVersion = systemNode.version;

    // 系统没有 node，检查 bundled node
    if (!nodeAvailable && hasBundledNode()) {
      const bundledEnv = buildEnvWithBundledNode();
      const bundledNode = await spawnCheck(getNodeCommand(), ['--version'], bundledEnv);
      if (bundledNode.available) {
        nodeAvailable = true;
        nodeVersion = bundledNode.version;
        logger.info('[setup] using bundled node: ' + nodeVersion);
      }
    }

    // 检查 cli（优先用系统 PATH，其次用 bundled node 环境）
    let cli = { available: false, version: null as string | null };
    if (nodeAvailable) {
      cli = await spawnCheck(getClaudeCommand(), ['--version']);
      if (!cli.available && hasBundledNode()) {
        cli = await spawnCheck(getClaudeCommand(), ['--version'], buildEnvWithBundledNode());
      }
    }

    logger.info(`[setup] deps check: node=${nodeAvailable}(${nodeVersion}), cli=${cli.available}(${cli.version})`);
    return {
      nodeAvailable,
      nodeVersion,
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

    // 优先使用 bundled node 的 npm
    const useBundled = hasBundledNode();
    const npmCmd = useBundled ? path.join(getBundledNodeDir(), getNpmCommand()) : getNpmCommand();
    const env = useBundled ? buildEnvWithBundledNode() : { ...process.env };

    logger.info(`[setup] installing CLI via ${npmCmd} (bundled=${useBundled})`);

    return new Promise<InstallResult>((resolve) => {
      const proc = spawn(npmCmd, ['install', '-g', '@anthropic-ai/claude-code', '--registry', 'https://registry.npmmirror.com'], {
        timeout: 120_000,
        env,
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
}
