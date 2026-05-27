import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { DepCheckResult, InstallResult } from '@shared/types/setup';

export type SetupPhase = 'initializing' | 'success' | 'error';

interface SetupState {
  phase: SetupPhase;
  error: string | null;

  checkAndInstall: () => Promise<void>;
  reset: () => void;
}

export const useSetupStore = create<SetupState>((set) => ({
  phase: 'initializing',
  error: null,

  checkAndInstall: async () => {
    set({ phase: 'initializing', error: null });
    try {
      const result = (await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS)) as DepCheckResult;
      if (result.cliAvailable) {
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
