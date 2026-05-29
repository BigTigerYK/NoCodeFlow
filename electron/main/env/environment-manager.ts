import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { logger } from '../logger';

export interface EnvCheckResult {
  /** bundled Node.js 是否可用 */
  nodeAvailable: boolean;
  nodeVersion: string | null;
  /** CLI 是否已安装到 userData 且可用 */
  cliAvailable: boolean;
  cliVersion: string | null;
  /** CLI 命令的绝对路径 */
  cliCmd: string;
  /** Windows shell 是否可用 */
  shellAvailable: boolean;
  shellType: 'git-bash' | 'powershell-7' | null;
  shellPath: string | null;
  /** CLI 安装目录 */
  cliDir: string;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}

/**
 * 统一的环境管理器。
 *
 * 核心思路：
 * - Node.js：使用 app 自带的 bundled node（不依赖系统安装）
 * - Claude CLI：用 bundled npm 安装到 userData/cli/（用户可写目录，不依赖系统权限）
 * - Shell：Windows 上自动检测/安装 Git Bash 或 pwsh
 * - 环境变量：统一构建包含 bundled node + CLI 路径的 env
 */
export class EnvironmentManager {
  private cachedShell: { available: boolean; type: 'git-bash' | 'powershell-7' | null; path: string | null } | null = null;

  /** CLI 安装目录（userData 下，始终可写） */
  get cliDir(): string {
    return path.join(app.getPath('userData'), 'cli');
  }

  /** claude.cmd 的绝对路径（避免依赖 PATH 解析） */
  get cliCmd(): string {
    return path.join(this.cliDir, 'claude.cmd');
  }

  /** bundled Node.js 目录（extraResources） */
  get bundledNodeDir(): string {
    // 打包后: process.resourcesPath = .../resources/，node 直接在下面
    // 开发时: app.getAppPath() = 项目根，node 在 resources/node/ 下
    const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources');
    return path.join(base, 'node', 'win-x64');
  }

  get nodeExe(): string {
    return path.join(this.bundledNodeDir, 'node.exe');
  }

  get npmCli(): string {
    return path.join(this.bundledNodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
  }

  // ─── 检测 ───

  /** 完整环境检测 */
  async check(): Promise<EnvCheckResult> {
    const node = await this.checkBundledNode();
    const shell = this.detectShell();
    const cli = await this.checkCli(node.available);

    logger.info(
      `[env] check: node=${node.available}(${node.version}), cli=${cli.available}(${cli.version}), shell=${shell.available}(${shell.type})`,
      'env'
    );

    return {
      nodeAvailable: node.available,
      nodeVersion: node.version,
      cliAvailable: cli.available,
      cliVersion: cli.version,
      cliCmd: this.cliCmd,
      shellAvailable: shell.available,
      shellType: shell.type,
      shellPath: shell.path,
      cliDir: this.cliDir,
    };
  }

  /** 检测 bundled Node.js 是否可用 */
  private async checkBundledNode(): Promise<{ available: boolean; version: string | null }> {
    if (!fs.existsSync(this.nodeExe)) {
      return { available: false, version: null };
    }
    return this.spawnCheck(this.nodeExe, ['--version']);
  }

  /** 检测 CLI 是否已正确安装 */
  private async checkCli(nodeAvailable: boolean): Promise<{ available: boolean; version: string | null }> {
    if (!nodeAvailable) {
      logger.warn('[env] checkCli: bundled node not available, skipping CLI check');
      return { available: false, version: null };
    }

    const claudeCmd = this.cliCmd;
    if (!fs.existsSync(claudeCmd)) {
      logger.info(`[env] checkCli: CLI not found at ${claudeCmd}`);
      return { available: false, version: null };
    }

    // 使用绝对路径 + 正确的环境验证 CLI 是否能运行
    const env = this.buildEnv();
    logger.info(`[env] checkCli: spawning ${claudeCmd} --version`);
    const result = await this.spawnCheck(claudeCmd, ['--version'], env);
    if (!result.available) {
      logger.warn(`[env] checkCli: CLI exists but --version check failed`);
    }
    return result;
  }

  // ─── 安装 ───

  /**
   * 一键安装所有缺失的依赖。
   * @param onProgress 安装进度回调
   */
  async installAll(onProgress?: (line: string) => void): Promise<InstallResult> {
    // 1. 确保 bundled node 可用
    const node = await this.checkBundledNode();
    if (!node.available) {
      return { success: false, error: '打包的 Node.js 不可用，请重新安装应用' };
    }

    // 2. Windows 上确保 shell 可用
    if (os.platform() === 'win32') {
      const shell = this.detectShell();
      if (!shell.available) {
        onProgress?.('正在安装依赖环境（Git for Windows）...');
        const shellResult = await this.installShell(onProgress);
        if (!shellResult.success) {
          return shellResult;
        }
        this.cachedShell = null; // 重置缓存
      }
    }

    // 3. 安装 Claude Code CLI
    return this.installCli(onProgress);
  }

  /** 安装 Claude Code CLI 到 userData/cli/ */
  async installCli(onProgress?: (line: string) => void): Promise<InstallResult> {
    const cliDir = this.cliDir;
    logger.info(`[env] installCli: target dir = ${cliDir}`);

    // 清理残留的半安装目录（Windows 上 fs.rmSync 可能因文件锁失败，需要重试）
    if (fs.existsSync(cliDir)) {
      const claudeCmd = path.join(cliDir, 'claude.cmd');
      if (!fs.existsSync(claudeCmd)) {
        onProgress?.('清理残留文件...');
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            fs.rmSync(cliDir, { recursive: true, force: true });
            break;
          } catch {
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
      }
    }
    fs.mkdirSync(cliDir, { recursive: true });

    onProgress?.('正在安装 Claude Code CLI（首次约 1-3 分钟）...');

    // 重试 2 次（Windows 上 EPERM 可能是临时的，如杀毒软件扫描锁文件）
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        onProgress?.('重试安装...');
        // 清理上次失败的残留
        if (fs.existsSync(cliDir)) {
          try { fs.rmSync(cliDir, { recursive: true, force: true }); } catch { /* ignore */ }
          await new Promise(r => setTimeout(r, 1500));
        }
        fs.mkdirSync(cliDir, { recursive: true });
      }

      // 优先使用国内镜像，失败后回退官方源
      const registries = [
        'https://registry.npmmirror.com',
        'https://registry.npmjs.org',
      ];

      for (const registry of registries) {
        onProgress?.(`尝试从 ${registry} 安装...`);
        const result = await this.runNpmInstall(cliDir, registry, onProgress);
        if (result.success) return result;
        logger.warn(`[env] npm install from ${registry} failed: ${result.error}`);
      }
    }

    return { success: false, error: 'npm 安装失败，请重试或检查网络连接' };
  }

  private runNpmInstall(
    cliDir: string,
    registry: string,
    onProgress?: (line: string) => void
  ): Promise<InstallResult> {
    // 关键：bundled node 目录必须在 PATH 中，npm 的 postinstall 子进程需要通过 PATH 找到 node
    const currentPath = process.env.PATH || '';
    const nodeDir = this.bundledNodeDir;
    const newPath = fs.existsSync(nodeDir)
      ? nodeDir + path.delimiter + currentPath
      : currentPath;

    const env: Record<string, string | undefined> = {
      ...process.env,
      PATH: newPath,
      npm_config_prefix: cliDir,
      npm_config_cache: path.join(os.tmpdir(), 'nocodeflow-npm-cache'),
      npm_config_tmp: os.tmpdir(),
      ELECTRON_RUN_AS_NODE: '1',
    };

    return new Promise<InstallResult>((resolve) => {
      const proc = spawn(
        this.nodeExe,
        [this.npmCli, 'install', '-g', '@anthropic-ai/claude-code', '--registry', registry],
        { env, shell: false, timeout: 300_000 }
      );

      let allStdout = '';
      let allStderr = '';

      proc.stdout?.on('data', (d: Buffer) => {
        const text = d.toString();
        allStdout += text;
        const line = text.trim();
        if (line) onProgress?.(line);
      });

      proc.stderr?.on('data', (d: Buffer) => {
        const text = d.toString();
        allStderr += text;
        const line = text.trim();
        if (line) {
          logger.warn(`[env] npm stderr: ${line}`);
          onProgress?.(line);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          // 验证安装结果
          const claudeCmd = path.join(cliDir, 'claude.cmd');
          if (fs.existsSync(claudeCmd)) {
            logger.info('[env] CLI installed successfully to ' + cliDir, 'env');
            resolve({ success: true });
          } else {
            logger.error('[env] npm succeeded but claude.cmd not found');
            resolve({ success: false, error: '安装完成但未找到 CLI 入口，请重试' });
          }
        } else {
          logger.error(`[env] npm install failed with exit code ${code}`);
          logger.error(`[env] npm stdout: ${allStdout.slice(-500)}`);
          logger.error(`[env] npm stderr: ${allStderr.slice(-500)}`);
          // 清理失败的安装
          if (fs.existsSync(cliDir)) {
            fs.rmSync(cliDir, { recursive: true, force: true });
          }
          // 提取 npm 错误信息的最后几行
          const errorLines = (allStderr || allStdout).split('\n').filter(l => l.trim()).slice(-5).join('\n');
          resolve({
            success: false,
            error: `npm 安装失败（exit ${code}）\n${errorLines || '请检查网络连接后重试'}`,
          });
        }
      });

      proc.on('error', (err) => {
        logger.error(`[env] npm install error: ${err.message}`);
        resolve({ success: false, error: `npm 启动失败: ${err.message}` });
      });
    });
  }

  /** 安装 Windows Shell（Git for Windows / pwsh） */
  async installShell(onProgress?: (line: string) => void): Promise<InstallResult> {
    if (os.platform() !== 'win32') return { success: true };

    const runPSScript = (script: string, timeout: number): Promise<InstallResult> => {
      return new Promise((resolve) => {
        const proc = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
          timeout,
          shell: false,
        });
        proc.stdout?.on('data', (d: Buffer) => {
          const line = d.toString().trim();
          if (line) onProgress?.(line);
        });
        proc.stderr?.on('data', (d: Buffer) => {
          const line = d.toString().trim();
          if (line) logger.warn(`[env] shell install: ${line}`);
        });
        proc.on('close', (code) => {
          resolve(code === 0 ? { success: true } : { success: false, error: `退出码 ${code}` });
        });
        proc.on('error', (err) => resolve({ success: false, error: err.message }));
      });
    };

    // 方法 1: winget 安装 Git
    onProgress?.('正在安装 Git for Windows...');
    let result = await runPSScript(`
      $ErrorActionPreference = 'Stop'
      $wg = Get-Command winget -ErrorAction SilentlyContinue
      if ($wg) {
        winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements --silent
        if ($LASTEXITCODE -ne 0) { throw "winget failed" }
      } else { throw 'winget not available' }
    `, 300_000);
    if (result.success) return { success: true };

    // 方法 2: 直接下载 Git 安装包
    onProgress?.('正在下载 Git for Windows...');
    const installerPath = path.join(app.getPath('temp'), 'git-installer.exe').replace(/\\/g, '/');
    result = await runPSScript(`
      $ErrorActionPreference = 'Stop'
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $urls = @(
        'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe',
        'https://ghfast.top/https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.2/Git-2.47.1.2-64-bit.exe'
      )
      $out = '${installerPath}'
      $downloaded = $false
      foreach ($url in $urls) {
        try { $wc = New-Object Net.WebClient; $wc.DownloadFile($url, $out); if (Test-Path $out) { $downloaded = $true; break } } catch {}
      }
      if (-not $downloaded) { throw 'Download failed' }
      $p = Start-Process -FilePath $out -ArgumentList '/VERYSILENT','/NORESTART','/CLOSEAPPLICATIONS' -Wait -PassThru
      if ($p.ExitCode -ne 0) { throw "Installer exit $($p.ExitCode)" }
      Remove-Item $out -Force -ErrorAction SilentlyContinue
    `, 600_000);
    if (result.success) return { success: true };

    // 方法 3: 安装 PowerShell 7
    onProgress?.('正在尝试安装 PowerShell 7...');
    result = await runPSScript(`
      $wg = Get-Command winget -ErrorAction SilentlyContinue
      if ($wg) {
        winget install --id Microsoft.PowerShell -e --accept-package-agreements --accept-source-agreements --silent
      } else { throw 'winget not available' }
    `, 300_000);
    if (result.success) return { success: true };

    return { success: false, error: '自动安装失败，请手动安装 Git for Windows: https://git-scm.com/downloads/win' };
  }

  // ─── 环境变量 ───

  /**
   * 构建 spawn 子进程所需的环境变量。
   * 包含 bundled Node.js 路径和 CLI 安装路径。
   */
  buildEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    const pathsToAdd: string[] = [];

    // 1. CLI 安装目录（最高优先级，包含 claude.cmd + node.exe 副本）
    if (fs.existsSync(this.cliDir)) {
      pathsToAdd.push(this.cliDir);
    }

    // 2. bundled Node.js 目录
    const nodeDir = this.bundledNodeDir;
    if (fs.existsSync(path.join(nodeDir, 'node.exe'))) {
      pathsToAdd.push(nodeDir);
    }

    // 3. npm 全局目录（兼容系统安装的情况）
    if (os.platform() === 'win32') {
      if (env.APPDATA) {
        const npmDir = path.join(env.APPDATA, 'npm');
        if (fs.existsSync(npmDir) && !pathsToAdd.includes(npmDir)) {
          pathsToAdd.push(npmDir);
        }
      }
      const nvmDirs = [
        'C:\\nvm4w\\nodejs',
        env.NVM_SYMLINK,
        env.ProgramFiles ? path.join(env.ProgramFiles, 'nodejs') : null,
      ].filter(Boolean) as string[];
      for (const d of nvmDirs) {
        if (fs.existsSync(d) && !pathsToAdd.includes(d)) pathsToAdd.push(d);
      }
    } else {
      const home = env.HOME;
      if (home) {
        const npmDir = path.join(home, '.npm-global', 'bin');
        if (fs.existsSync(npmDir) && !pathsToAdd.includes(npmDir)) pathsToAdd.push(npmDir);
      }
    }

    if (pathsToAdd.length > 0) {
      env.PATH = pathsToAdd.join(path.delimiter) + path.delimiter + (env.PATH || '');
    }

    // Windows shell 路径
    if (os.platform() === 'win32' && !env.CLAUDE_CODE_GIT_BASH_PATH) {
      const shell = this.detectShell();
      if (shell.path) env.CLAUDE_CODE_GIT_BASH_PATH = shell.path;
    }

    return env;
  }

  // ─── Shell 检测 ───

  detectShell(): { available: boolean; type: 'git-bash' | 'powershell-7' | null; path: string | null } {
    if (this.cachedShell) return this.cachedShell;

    if (os.platform() !== 'win32') {
      this.cachedShell = { available: true, type: null, path: null };
      return this.cachedShell;
    }

    // 1. Git Bash
    const gitBashPaths = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      process.env.GIT_BASH_PATH,
      process.env.CLAUDE_CODE_GIT_BASH_PATH,
    ].filter(Boolean) as string[];

    for (const p of gitBashPaths) {
      if (fs.existsSync(p)) {
        this.cachedShell = { available: true, type: 'git-bash', path: p };
        return this.cachedShell;
      }
    }

    // 2. PowerShell 7
    try {
      const { execSync } = require('child_process');
      const pwshPath = execSync('where.exe pwsh', { timeout: 3000, encoding: 'utf-8' }).trim().split('\n')[0];
      if (pwshPath && fs.existsSync(pwshPath)) {
        this.cachedShell = { available: true, type: 'powershell-7', path: pwshPath };
        return this.cachedShell;
      }
    } catch { /* not on PATH */ }

    const pwshPaths = [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe') : null,
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'pwsh.exe') : null,
    ].filter(Boolean) as string[];

    for (const p of pwshPaths) {
      if (fs.existsSync(p)) {
        this.cachedShell = { available: true, type: 'powershell-7', path: p };
        return this.cachedShell;
      }
    }

    this.cachedShell = { available: false, type: null, path: null };
    return this.cachedShell;
  }

  // ─── 工具方法 ───

  private spawnCheck(
    cmd: string,
    args: string[],
    env?: NodeJS.ProcessEnv
  ): Promise<{ available: boolean; version: string | null }> {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, { timeout: 10_000, shell: true, env: env ?? process.env });
      let stdout = '';
      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0 || stdout.trim()) {
          resolve({ available: true, version: stdout.trim() });
        } else {
          resolve({ available: false, version: null });
        }
      });
      proc.on('error', () => resolve({ available: false, version: null }));
    });
  }
}

/** 全局单例 */
export const envManager = new EnvironmentManager();
