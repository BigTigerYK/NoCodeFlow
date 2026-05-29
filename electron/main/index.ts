import { app, crashReporter } from 'electron';
import { createMainWindow } from './window';
import { registerAllIpcHandlers, cleanupAllIpcHandlers } from './ipc';
import { cleanupFsWatchers } from './ipc/fs';
import { logger } from './logger';
import { configStore } from './store/config';
import { DEFAULT_CONFIG } from '@shared/types/config';

/** 修复配置中缺失的默认值（electron-store 的 defaults 只在键不存在时生效） */
function migrateConfig(): void {
  const profiles = configStore.get('claude.profiles');
  if (Array.isArray(profiles)) {
    let changed = false;
    for (let i = 0; i < profiles.length; i++) {
      // 修复旧的 Mimo 代理 baseUrl（旧版错误地包含了 /anthropic 路径）
      if (profiles[i].baseUrl === 'https://token-plan-cn.xiaomimimo.com/anthropic') {
        profiles[i].baseUrl = 'https://token-plan-cn.xiaomimimo.com';
        changed = true;
        logger.info(`[config] migrated profile "${profiles[i].name}" baseUrl: removed /anthropic suffix`);
      }

      if (!profiles[i].baseUrl) {
        profiles[i].baseUrl = DEFAULT_CONFIG.claude.profiles[0].baseUrl;
        changed = true;
        logger.info(`[config] migrated profile "${profiles[i].name}" baseUrl to default`);
      }

      // 修复旧配置：非 Anthropic 官方端点一律使用 openai 兼容适配器
      // claude-code / claude-api 适配器使用 Anthropic 格式，代理不兼容
      const isAnthropicUrl = profiles[i].baseUrl &&
        (() => { try { const h = new URL(profiles[i].baseUrl).hostname; return h === 'api.anthropic.com' || h.endsWith('.anthropic.com'); } catch { return false; } })();
      if (!isAnthropicUrl && profiles[i].baseUrl &&
          (profiles[i].adapterType === 'claude-code' || profiles[i].adapterType === 'claude-api')) {
        const oldType = profiles[i].adapterType;
        profiles[i].adapterType = 'openai';
        changed = true;
        logger.info(`[config] migrated profile "${profiles[i].name}" adapter: ${oldType} → openai (proxy endpoint)`);
      }

      // 修复 Mimo 代理的模型名（旧配置可能残留 gpt-4o 或 claude-sonnet 等不支持的模型）
      if (profiles[i].baseUrl?.includes('xiaomimimo.com') &&
          (!profiles[i].model || profiles[i].model.startsWith('gpt-') || profiles[i].model.startsWith('claude-'))) {
        profiles[i].model = 'mimo-v2.5-pro';
        changed = true;
        logger.info(`[config] migrated profile "${profiles[i].name}" model → mimo-v2.5-pro`);
      }
    }
    if (changed) {
      configStore.set('claude.profiles', profiles);
    }
  }
}

// Crash Reporter — must be set up before app.whenReady
crashReporter.start({
  submitURL: '',
  productName: 'NoCodeFlow',
  compress: true,
  uploadToServer: false,
});

logger.info('Application starting', 'main');
logger.info(`Crash reports directory: ${app.getPath('crashDumps')}`, 'main');

app.whenReady().then(() => {
  logger.info('Application ready', 'main');
  migrateConfig();
  registerAllIpcHandlers();
  createMainWindow();
});

app.on('before-quit', () => {
  logger.info('Application quitting', 'main');
  cleanupAllIpcHandlers();
  logger.dispose();
});

app.on('window-all-closed', async () => {
  await cleanupFsWatchers();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  const { BrowserWindow } = require('electron');
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', 'main', { message: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', 'main', { reason: String(reason) });
});
