import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { PermissionRequest, PermissionRecord } from '@shared/types/permission';

interface PermissionState {
  currentRequest: PermissionRequest | null;
  records: PermissionRecord[];
  _unsub: (() => void) | null;

  initialize: () => void;
  respond: (decision: 'allow' | 'deny', remember: boolean) => void;
  fetchRecords: () => Promise<void>;
  dispose: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  currentRequest: null,
  records: [],
  _unsub: null,

  initialize: () => {
    const { _unsub } = get();
    _unsub?.();

    const unsub = window.api.on(IPC_CHANNELS.PERMISSION_REQUEST, (request: unknown) => {
      set({ currentRequest: request as PermissionRequest });
    });

    set({ _unsub: unsub });
  },

  respond: (decision, remember) => {
    const { currentRequest } = get();
    if (!currentRequest) return;

    window.api.invoke(IPC_CHANNELS.PERMISSION_RESPOND, {
      requestId: currentRequest.id,
      decision,
      remember,
    });

    set({ currentRequest: null });
  },

  fetchRecords: async () => {
    const records = await window.api.invoke(IPC_CHANNELS.PERMISSION_GET_RECORDS) as PermissionRecord[];
    set({ records });
  },

  dispose: () => {
    const { _unsub } = get();
    _unsub?.();
    set({ _unsub: null, currentRequest: null });
  },
}));
