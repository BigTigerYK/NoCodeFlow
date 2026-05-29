import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, InstallResult } from '@shared/types/setup';

export type SetupPhase = 'initializing' | 'success' | 'error';

interface SetupState {
  phase: SetupPhase;
  error: string | null;

  checkAndInstall: () => Promise<void>;
  checkDeps: () => Promise<DepCheckResult>;
  reset: () => void;
}

export const useSetupStore = create<SetupState>((set) => ({
  phase: 'initializing',
  error: null,

  checkDeps: async () => {
    return (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;
  },

  checkAndInstall: async () => {
    set({ phase: 'initializing', error: null });
    try {
      const result = (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;

      // Shell 不可用时自动安装 Git for Windows
      if (!result.shellAvailable) {
        const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, () => {});
        const shellResult = (await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_SHELL)) as InstallResult;
        unsub();
        if (!shellResult.success) {
          set({ phase: 'error', error: shellResult.error ?? 'Git for Windows 安装失败' });
          return;
        }
        // 安装完 shell 后重新检测
        const recheck = (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;
        if (!recheck.shellAvailable) {
          set({ phase: 'error', error: 'Git for Windows 安装后未检测到，请重启应用' });
          return;
        }
      }

      const finalResult = (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;
      if (finalResult.cliAvailable) {
        set({ phase: 'success' });
        return;
      }

      const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, () => {});
      const installResult = (await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_CLI)) as InstallResult;
      unsub();
      set({ phase: installResult.success ? 'success' : 'error', error: installResult.success ? null : (installResult.error ?? 'Installation failed') });
    } catch (err) {
      set({ phase: 'error', error: String(err) });
    }
  },

  reset: () => set({ phase: 'initializing', error: null }),
}));
