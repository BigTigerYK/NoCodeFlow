import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { FileNode } from '@shared/types/workspace';
import { MAX_RECENT_WORKSPACES } from '@shared/constants';
import { getLanguageForFile } from '@shared/utils/file-extensions';

export interface TabInfo {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

interface WorkspaceState {
  rootPath: string | null;
  workspaceName: string | null;
  isOpen: boolean;

  fileTree: FileNode[];
  expandedPaths: Set<string>;
  selectedPath: string | null;

  openTabs: TabInfo[];
  activeTabPath: string | null;

  openWorkspace: (path: string) => Promise<void>;
  closeWorkspace: () => void;
  refreshTree: () => Promise<void>;
  toggleExpand: (path: string) => void;
  expandPath: (path: string) => void;
  selectFile: (path: string) => void;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateTabContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveActiveFile: () => Promise<void>;
}

interface InvokeResult<T = unknown> {
  data?: T;
  error?: string;
}

async function ipcInvoke<T = unknown>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const result = (await window.api.invoke(
    channel,
    ...args,
  )) as InvokeResult<T>;
  if (result.error) {
    throw new Error(result.error);
  }
  return result.data as T;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rootPath: null,
  workspaceName: null,
  isOpen: false,

  fileTree: [],
  expandedPaths: new Set<string>(),
  selectedPath: null,

  openTabs: [],
  activeTabPath: null,

  openWorkspace: async (dirPath: string) => {
    const tree = await ipcInvoke<FileNode[]>(IPC_CHANNELS.FS_TREE, {
      rootPath: dirPath,
    });
    const name = dirPath.split(/[\\/]/).pop() || dirPath;
    set({
      rootPath: dirPath,
      workspaceName: name,
      isOpen: true,
      fileTree: tree,
      expandedPaths: new Set<string>(),
      selectedPath: null,
      openTabs: [],
      activeTabPath: null,
    });

    // Auto-expand first level
    const firstExpanded = new Set<string>();
    firstExpanded.add(dirPath);
    set({ expandedPaths: firstExpanded });

    // Update recent workspaces in config
    try {
      const config = (await window.api.invoke(
        IPC_CHANNELS.CONFIG_GET_ALL,
      )) as any;
      const recent: string[] = config?.recentWorkspaces || [];
      const updated = [dirPath, ...recent.filter((p: string) => p !== dirPath)].slice(0, MAX_RECENT_WORKSPACES);
      await window.api.invoke(IPC_CHANNELS.CONFIG_SET, 'recentWorkspaces', updated);
    } catch {
      // non-critical
    }
  },

  closeWorkspace: () => {
    set({
      rootPath: null,
      workspaceName: null,
      isOpen: false,
      fileTree: [],
      expandedPaths: new Set<string>(),
      selectedPath: null,
      openTabs: [],
      activeTabPath: null,
    });
  },

  refreshTree: async () => {
    const { rootPath } = get();
    if (!rootPath) return;
    const tree = await ipcInvoke<FileNode[]>(IPC_CHANNELS.FS_TREE, {
      rootPath,
    });
    set({ fileTree: tree });
  },

  toggleExpand: (path: string) => {
    const { expandedPaths } = get();
    const next = new Set(expandedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    set({ expandedPaths: next });
  },

  expandPath: (path: string) => {
    const { expandedPaths } = get();
    const next = new Set(expandedPaths);
    next.add(path);
    set({ expandedPaths: next });
  },

  selectFile: (path: string) => {
    set({ selectedPath: path });
  },

  openFile: async (filePath: string) => {
    const { openTabs } = get();

    // Already open? Just activate
    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      set({ activeTabPath: filePath, selectedPath: filePath });
      return;
    }

    const result = await ipcInvoke<{ content: string; encoding: string }>(
      IPC_CHANNELS.FS_READ,
      { filePath },
    );

    const name = filePath.split(/[\\/]/).pop() || filePath;
    const newTab: TabInfo = {
      path: filePath,
      name,
      content: result.content,
      originalContent: result.content,
      isDirty: false,
      language: getLanguageForFile(filePath),
    };

    set({
      openTabs: [...openTabs, newTab],
      activeTabPath: filePath,
      selectedPath: filePath,
    });
  },

  closeTab: (path: string) => {
    const { openTabs, activeTabPath } = get();
    const filtered = openTabs.filter((t) => t.path !== path);
    let newActive = activeTabPath;
    if (activeTabPath === path) {
      const idx = openTabs.findIndex((t) => t.path === path);
      newActive =
        filtered.length > 0
          ? filtered[Math.min(idx, filtered.length - 1)]?.path || null
          : null;
    }
    set({ openTabs: filtered, activeTabPath: newActive });
  },

  setActiveTab: (path: string) => {
    set({ activeTabPath: path, selectedPath: path });
  },

  updateTabContent: (path: string, content: string) => {
    const { openTabs } = get();
    set({
      openTabs: openTabs.map((t) =>
        t.path === path
          ? { ...t, content, isDirty: content !== t.originalContent }
          : t,
      ),
    });
  },

  saveFile: async (path: string) => {
    const { openTabs } = get();
    const tab = openTabs.find((t) => t.path === path);
    if (!tab || !tab.isDirty) return;

    await ipcInvoke(IPC_CHANNELS.FS_WRITE, { filePath: path, content: tab.content });
    set({
      openTabs: openTabs.map((t) =>
        t.path === path
          ? { ...t, isDirty: false, originalContent: t.content }
          : t,
      ),
    });
  },

  saveActiveFile: async () => {
    const { activeTabPath } = get();
    if (!activeTabPath) return;
    await get().saveFile(activeTabPath);
  },
}));
