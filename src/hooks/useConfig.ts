import { useEffect } from 'react';
import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { AppConfig, DEFAULT_CONFIG } from '@shared/types/config';

interface ConfigState {
  config: AppConfig;
  loading: boolean;
  _loaded: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<void>;
}

const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  loading: true,
  _loaded: false,

  loadConfig: async () => {
    if (get()._loaded) return;
    set({ loading: true });
    try {
      const data = await window.api.invoke(IPC_CHANNELS.CONFIG_GET_ALL);
      let merged = { ...DEFAULT_CONFIG, ...(data as Partial<AppConfig>) };
      if (__IS_INTERNAL_BUILD__) {
        merged = {
          ...merged,
          claude: {
            profiles: [{
              id: 'internal',
              name: '内测服务',
              baseUrl: '',
              apiKey: '',
              adapterType: 'claude-code' as const,
            }],
            activeProfileId: 'internal',
          },
        };
      }
      set({ config: merged, _loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  updateConfig: async <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    if (__IS_INTERNAL_BUILD__ && key === 'claude') return;
    set((prev) => ({ config: { ...prev.config, [key]: value } }));
    await window.api.invoke(IPC_CHANNELS.CONFIG_SET, key, value);
  },
}));

export function useConfig() {
  const { config, loading, loadConfig, updateConfig } = useConfigStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return { config, updateConfig, loading };
}
