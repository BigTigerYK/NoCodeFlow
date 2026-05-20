import { useState, useEffect, useCallback } from 'react';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { AppConfig, DEFAULT_CONFIG } from '@shared/types/config';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api
      .invoke(IPC_CHANNELS.CONFIG_GET_ALL)
      .then((data) => {
        setConfig({ ...DEFAULT_CONFIG, ...(data as Partial<AppConfig>) });
      })
      .finally(() => setLoading(false));
  }, []);

  const updateConfig = useCallback(
    async <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      await window.api.invoke(IPC_CHANNELS.CONFIG_SET, key, value);
    },
    []
  );

  return { config, updateConfig, loading };
}
