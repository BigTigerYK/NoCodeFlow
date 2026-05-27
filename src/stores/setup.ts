import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, SetupProgress, InstallResult } from '@shared/types/setup';

export type SetupPhase = 'checking' | 'installing' | 'success' | 'error';

interface SetupState {
  phase: SetupPhase;
  deps: DepCheckResult | null;
  logs: string[];
  error: string | null;

  checkAndInstall: () => Promise<void>;
  installCli: () => Promise<void>;
  reset: () => void;
}

export const useSetupStore = create<SetupState>((set) => ({
  phase: 'checking',
  deps: null,
  logs: [],
  error: null,

  /** 检测依赖，CLI 缺失时自动安装 */
  checkAndInstall: async () => {
    set({ phase: 'checking', error: null, logs: [] });
    try {
      const result = (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;
      set({ deps: result });
      if (result.cliAvailable) {
        set({ phase: 'success' });
        return;
      }
      // CLI 不可用，自动安装
      set({ phase: 'installing', logs: [] });

      const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, (data: unknown) => {
        const progress = data as SetupProgress;
        if (progress.type === 'status' && progress.line === 'done') return;
        set((s) => ({ logs: [...s.logs, `[${progress.type}] ${progress.line}`] }));
      });

      const installResult = (await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_CLI)) as InstallResult;
      unsub();
      if (installResult.success) {
        set({ phase: 'success' });
      } else {
        set({ phase: 'error', error: installResult.error ?? 'Installation failed' });
      }
    } catch (err) {
      set({ phase: 'error', error: String(err) });
    }
  },

  installCli: async () => {
    set({ phase: 'installing', logs: [], error: null });

    const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, (data: unknown) => {
      const progress = data as SetupProgress;
      if (progress.type === 'status' && progress.line === 'done') return;
      set((s) => ({ logs: [...s.logs, `[${progress.type}] ${progress.line}`] }));
    });

    try {
      const result = (await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_CLI)) as InstallResult;
      unsub();
      if (result.success) {
        set({ phase: 'success' });
      } else {
        set({ phase: 'error', error: result.error ?? 'Installation failed' });
      }
    } catch (err) {
      unsub();
      set({ phase: 'error', error: String(err) });
    }
  },

  reset: () => set({ phase: 'checking', deps: null, logs: [], error: null }),
}));
