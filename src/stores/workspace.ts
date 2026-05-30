import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { FileNode } from '@shared/types/workspace';
import type { AppConfig } from '@shared/types/config';
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

  createFile: (dirPath: string, fileName: string) => Promise<string>;
  createDirectory: (dirPath: string, dirName: string) => Promise<string>;
  deletePath: (filePath: string) => Promise<void>;
  renamePath: (oldPath: string, newName: string) => Promise<string>;
  movePath: (sourcePath: string, targetDir: string) => Promise<string>;
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
      )) as AppConfig;
      const recent: string[] = config?.recentWorkspaces || [];
      const updated = [dirPath, ...recent.filter((p: string) => p !== dirPath)].slice(0, MAX_RECENT_WORKSPACES);
      await window.api.invoke(IPC_CHANNELS.CONFIG_SET, 'recentWorkspaces', updated);
    } catch (err) {
      console.warn('Failed to update recent workspaces:', err);
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

  createFile: async (dirPath: string, fileName: string) => {
    const result = await ipcInvoke<{ path: string }>(IPC_CHANNELS.FS_CREATE_FILE, { dirPath, fileName });
    await get().refreshTree();
    get().expandPath(dirPath);
    return result.path;
  },

  createDirectory: async (dirPath: string, dirName: string) => {
    const result = await ipcInvoke<{ path: string }>(IPC_CHANNELS.FS_CREATE_DIR, { dirPath, dirName });
    await get().refreshTree();
    get().expandPath(dirPath);
    return result.path;
  },

  deletePath: async (filePath: string) => {
    await ipcInvoke(IPC_CHANNELS.FS_DELETE, { filePath });
    // Close any open tabs for deleted path or children
    const { openTabs, activeTabPath } = get();
    const normalizedDeletePath = filePath.replace(/\\/g, '/');
    const deletePathPrefix = normalizedDeletePath.replace(/[\\/]+$/, '') + '/';
    const filtered = openTabs.filter((t) => {
      const normalizedTabPath = t.path.replace(/\\/g, '/');
      return normalizedTabPath !== normalizedDeletePath && !normalizedTabPath.startsWith(deletePathPrefix);
    });
    const normalizedActivePath = activeTabPath?.replace(/\\/g, '/') || null;
    let newActive = activeTabPath;
    if (normalizedActivePath === normalizedDeletePath || normalizedActivePath?.startsWith(deletePathPrefix)) {
      newActive = filtered.length > 0 ? filtered[filtered.length - 1].path : null;
    }
    set({ openTabs: filtered, activeTabPath: newActive });
    await get().refreshTree();
  },

  renamePath: async (oldPath: string, newName: string) => {
    const result = await ipcInvoke<{ newPath: string }>(IPC_CHANNELS.FS_RENAME, { oldPath, newName });
    // Update open tabs that match the old path or are children of it
    const { openTabs, activeTabPath } = get();
    const oldPathPrefix = oldPath.replace(/[\\/]+$/, '') + '/';
    const updatedTabs = openTabs.map((t) => {
      const normalizedTabPath = t.path.replace(/\\/g, '/');
      if (normalizedTabPath === oldPath.replace(/\\/g, '/')) {
        return { ...t, path: result.newPath, name: newName, language: getLanguageForFile(result.newPath) };
      }
      if (normalizedTabPath.startsWith(oldPathPrefix)) {
        const relativePath = normalizedTabPath.slice(oldPathPrefix.length);
        const newPath = result.newPath.replace(/\\/g, '/') + '/' + relativePath;
        const displayName = newPath.split('/').pop() || newPath;
        return { ...t, path: newPath, name: displayName };
      }
      return t;
    });
    const normalizedOldPath = oldPath.replace(/\\/g, '/');
    const normalizedActivePath = activeTabPath?.replace(/\\/g, '/') || null;
    let newActive = activeTabPath;
    if (normalizedActivePath === normalizedOldPath) {
      newActive = result.newPath;
    } else if (normalizedActivePath?.startsWith(oldPathPrefix)) {
      const relativePath = normalizedActivePath.slice(oldPathPrefix.length);
      newActive = result.newPath.replace(/\\/g, '/') + '/' + relativePath;
    }
    set({ openTabs: updatedTabs, activeTabPath: newActive, selectedPath: result.newPath });
    await get().refreshTree();
    return result.newPath;
  },

  movePath: async (sourcePath: string, targetDir: string) => {
    const result = await ipcInvoke<{ newPath: string }>(IPC_CHANNELS.FS_MOVE, { sourcePath, targetDir });
    // Update open tabs that match the source path or are children of it
    const { openTabs, activeTabPath } = get();
    const sourcePathPrefix = sourcePath.replace(/[\\/]+$/, '') + '/';
    const normalizedSourcePath = sourcePath.replace(/\\/g, '/');
    const updatedTabs = openTabs.map((t) => {
      const normalizedTabPath = t.path.replace(/\\/g, '/');
      if (normalizedTabPath === normalizedSourcePath) {
        return { ...t, path: result.newPath, name: result.newPath.split(/[\\/]/).pop() || t.name };
      }
      if (normalizedTabPath.startsWith(sourcePathPrefix)) {
        const relativePath = normalizedTabPath.slice(sourcePathPrefix.length);
        const newPath = result.newPath.replace(/\\/g, '/') + '/' + relativePath;
        const displayName = newPath.split('/').pop() || newPath;
        return { ...t, path: newPath, name: displayName };
      }
      return t;
    });
    const normalizedActivePath = activeTabPath?.replace(/\\/g, '/') || null;
    let newActive = activeTabPath;
    if (normalizedActivePath === normalizedSourcePath) {
      newActive = result.newPath;
    } else if (normalizedActivePath?.startsWith(sourcePathPrefix)) {
      const relativePath = normalizedActivePath.slice(sourcePathPrefix.length);
      newActive = result.newPath.replace(/\\/g, '/') + '/' + relativePath;
    }
    set({ openTabs: updatedTabs, activeTabPath: newActive, selectedPath: result.newPath });
    // Expand target directory to show the moved item
    get().expandPath(targetDir);
    await get().refreshTree();
    return result.newPath;
  },
}));
