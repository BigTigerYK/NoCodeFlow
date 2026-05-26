import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { SnapshotMetadata } from '@shared/types/snapshot';

interface SnapshotContent {
  metadata: SnapshotMetadata;
  content: string;
}

interface InvokeResult<T = unknown> {
  data?: T;
  error?: string;
}

async function ipcInvoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await window.api.invoke(channel, ...args)) as InvokeResult<T>;
  if (result.error) throw new Error(result.error);
  return result.data as T;
}

interface SnapshotState {
  snapshots: SnapshotMetadata[];
  selectedSnapshot: SnapshotMetadata | null;
  snapshotContent: string | null;
  currentFileContent: string | null;
  isOpen: boolean;
  loading: boolean;

  fetchSnapshots: (filePath?: string) => Promise<void>;
  selectSnapshot: (snapshotId: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string) => Promise<void>;
  open: () => void;
  close: () => void;
  setCurrentFileContent: (content: string | null) => void;
}

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  snapshots: [],
  selectedSnapshot: null,
  snapshotContent: null,
  currentFileContent: null,
  isOpen: false,
  loading: false,

  fetchSnapshots: async (filePath?: string) => {
    set({ loading: true });
    try {
      const snapshots = await ipcInvoke<SnapshotMetadata[]>(
        IPC_CHANNELS.SNAPSHOT_LIST,
        filePath ? { filePath } : undefined,
      );
      set({ snapshots });
    } catch (err) {
      console.error('[Snapshot] Failed to fetch snapshots:', err);
    } finally {
      set({ loading: false });
    }
  },

  selectSnapshot: async (snapshotId: string) => {
    try {
      const result = await ipcInvoke<SnapshotContent>(IPC_CHANNELS.SNAPSHOT_GET, { snapshotId });
      set({ selectedSnapshot: result.metadata, snapshotContent: result.content });
    } catch (err) {
      console.error('[Snapshot] Failed to load snapshot:', err);
    }
  },

  restoreSnapshot: async (snapshotId: string) => {
    try {
      const result = await ipcInvoke<{ success: boolean; filePath: string; error?: string }>(
        IPC_CHANNELS.SNAPSHOT_RESTORE,
        { snapshotId },
      );
      if (!result.success) {
        console.error('[Snapshot] Restore failed:', result.error);
        return;
      }
      // 刷新列表
      await get().fetchSnapshots();
      set({ selectedSnapshot: null, snapshotContent: null });
    } catch (err) {
      console.error('[Snapshot] Failed to restore:', err);
    }
  },

  deleteSnapshot: async (snapshotId: string) => {
    try {
      await ipcInvoke(IPC_CHANNELS.SNAPSHOT_DELETE, { snapshotId });
      const { selectedSnapshot } = get();
      if (selectedSnapshot?.id === snapshotId) {
        set({ selectedSnapshot: null, snapshotContent: null });
      }
      await get().fetchSnapshots();
    } catch (err) {
      console.error('[Snapshot] Failed to delete:', err);
    }
  },

  open: () => {
    set({ isOpen: true });
    get().fetchSnapshots();
  },

  close: () => {
    set({ isOpen: false, selectedSnapshot: null, snapshotContent: null });
  },

  setCurrentFileContent: (content) => {
    set({ currentFileContent: content });
  },
}));
