import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, SetupProgress, InstallResult } from '@shared/types/setup';

export type SetupPhase = 'idle' | 'checking' | 'no-node' | 'installing' | 'success' | 'error';

interface SetupState {
  phase: SetupPhase;
  deps: DepCheckResult | null;
  logs: string[];
  error: string | null;

  checkDeps: () => Promise<void>;
  installCli: () => Promise<void>;
  installAll: () => Promise<void>;
  openNodeDownload: () => void;
  reset: () => void;
}

export const useSetupStore = create<SetupState>((set) => ({
  phase: 'idle',
  deps: null,
  logs: [],
  error: null,

  checkDeps: async () => {
    set({ phase: 'checking', error: null, logs: [] });
    try {
      const result = (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;
      set({ deps: result });
      if (!result.nodeAvailable) {
        set({ phase: 'no-node' });
      } else if (!result.cliAvailable) {
        set({ phase: 'idle' });
      } else {
        set({ phase: 'success' });
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

  openNodeDownload: () => {
    window.api.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, 'https://nodejs.org/en/download');
  },

  installAll: async () => {
    set({ phase: 'installing', logs: [], error: null });

    const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, (data: unknown) => {
      const progress = data as SetupProgress;
      if (progress.type === 'status' && progress.line === 'done') return;
      set((s) => ({ logs: [...s.logs, progress.line] }));
    });

    try {
      const result = (await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_ALL)) as InstallResult;
      unsub();
      if (result.success) {
        set({ phase: 'success' });
      } else {
        set({ phase: 'error', error: result.error ?? '安装失败' });
      }
    } catch (err) {
      unsub();
      set({ phase: 'error', error: String(err) });
    }
  },

  reset: () => set({ phase: 'idle', deps: null, logs: [], error: null }),
}));
