import { useCallback } from 'react';
import { IPC_CHANNELS } from '@shared/types/ipc';

type Channel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export function useIpc() {
  const invoke = useCallback(
    async <T = unknown>(channel: Channel, ...args: unknown[]): Promise<T> => {
      return window.api.invoke(channel, ...args) as Promise<T>;
    },
    []
  );

  const on = useCallback(
    (channel: Channel, callback: (...args: unknown[]) => void) => {
      return window.api.on(channel, callback);
    },
    []
  );

  return { invoke, on };
}
