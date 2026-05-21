import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { FileNode } from '@shared/types/workspace';
import { FILE_TREE_MAX_DEPTH, FILE_MAX_SIZE_BYTES, BINARY_CHECK_BUFFER_SIZE, WATCHER_STABILITY_THRESHOLD_MS, WATCHER_THROTTLE_MS } from '@shared/constants';
import { getMainWindow } from '../window';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  '__pycache__',
  '.DS_Store',
  'dist-electron',
  '.nocodeflow',
]);

let watcher: chokidar.FSWatcher | null = null;
let currentWorkspaceRoot: string | null = null;

function isPathWithinWorkspace(filePath: string, workspaceRoot: string): boolean {
  const resolved = path.resolve(filePath);
  const resolvedRoot = path.resolve(workspaceRoot);
  return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
}

export async function cleanupFsWatchers(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
  }
}

async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(BINARY_CHECK_BUFFER_SIZE);
    const { bytesRead } = await fd.read(buf, 0, BINARY_CHECK_BUFFER_SIZE, 0);
    await fd.close();

    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    // Can't read file header - assume binary to be safe
    return true;
  }
}

async function buildFileTree(
  dirPath: string,
  maxDepth: number = FILE_TREE_MAX_DEPTH,
  currentDepth: number = 0,
): Promise<FileNode[]> {
  if (currentDepth >= maxDepth) return [];

  let entries: string[];
  try {
    entries = await fs.readdir(dirPath);
  } catch (err: any) {
    console.warn(`Failed to read directory ${dirPath}:`, err.message);
    return [];
  }

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;

    const fullPath = path.join(dirPath, entry);
    let stat;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      continue;
    }

    const node: FileNode = {
      name: entry,
      path: fullPath,
      type: stat.isDirectory() ? 'directory' : 'file',
      size: stat.size,
      modifiedAt: stat.mtimeMs,
    };

    if (stat.isDirectory()) {
      node.children = await buildFileTree(fullPath, maxDepth, currentDepth + 1);
    }

    nodes.push(node);
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function registerFsHandlers(): void {
  // Open directory dialog
  ipcMain.handle(IPC_CHANNELS.FS_OPEN_DIALOG, async () => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Build file tree
  ipcMain.handle(
    IPC_CHANNELS.FS_TREE,
    async (_event, args: { rootPath: string; maxDepth?: number }) => {
      try {
        const { rootPath, maxDepth = FILE_TREE_MAX_DEPTH } = args;
        const stat = await fs.stat(rootPath);
        if (!stat.isDirectory()) {
          return { error: 'Path is not a directory' };
        }
        currentWorkspaceRoot = await fs.realpath(rootPath);
        const tree = await buildFileTree(rootPath, maxDepth);
        return { data: tree };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  // Read file
  ipcMain.handle(
    IPC_CHANNELS.FS_READ,
    async (_event, args: { filePath: string }) => {
      try {
        const { filePath } = args;
        if (!currentWorkspaceRoot) {
          return { error: 'No workspace open' };
        }
        if (!isPathWithinWorkspace(filePath, currentWorkspaceRoot)) {
          return { error: 'Access denied: path is outside workspace' };
        }
        try {
          const realPath = await fs.realpath(filePath);
          if (!isPathWithinWorkspace(realPath, currentWorkspaceRoot)) {
            return { error: 'Access denied: symlink points outside workspace' };
          }
        } catch {
          // File doesn't exist - check parent directory
          const parentDir = path.dirname(filePath);
          try {
            const realParent = await fs.realpath(parentDir);
            if (!isPathWithinWorkspace(realParent, currentWorkspaceRoot)) {
              return { error: 'Access denied: parent directory outside workspace' };
            }
          } catch {
            // Parent doesn't exist either - read will fail naturally
          }
        }
        const stat = await fs.stat(filePath);

        if (stat.size > FILE_MAX_SIZE_BYTES) {
          return { error: 'File too large (max 10MB)' };
        }

        if (await isBinaryFile(filePath)) {
          return { error: 'Binary file cannot be opened in editor' };
        }

        const content = await fs.readFile(filePath, 'utf-8');
        return { data: { content, encoding: 'utf-8' } };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  // Write file (atomic: write to .tmp then rename)
  ipcMain.handle(
    IPC_CHANNELS.FS_WRITE,
    async (_event, args: { filePath: string; content: string }) => {
      try {
        const { filePath, content } = args;
        if (!currentWorkspaceRoot) {
          return { error: 'No workspace open' };
        }
        if (!isPathWithinWorkspace(filePath, currentWorkspaceRoot)) {
          return { error: 'Access denied: path is outside workspace' };
        }
        try {
          const realPath = await fs.realpath(filePath);
          if (!isPathWithinWorkspace(realPath, currentWorkspaceRoot)) {
            return { error: 'Access denied: symlink points outside workspace' };
          }
        } catch {
          // File doesn't exist yet - check parent directory
          const parentDir = path.dirname(filePath);
          try {
            const realParent = await fs.realpath(parentDir);
            if (!isPathWithinWorkspace(realParent, currentWorkspaceRoot)) {
              return { error: 'Access denied: parent directory outside workspace' };
            }
          } catch {
            // Parent doesn't exist either - will fail on write
          }
        }
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        const tmpPath = filePath + '.nocodeflow-tmp';
        await fs.writeFile(tmpPath, content, 'utf-8');
        await fs.rename(tmpPath, filePath);

        return { data: { success: true } };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  // Watch directory
  ipcMain.handle(
    IPC_CHANNELS.FS_WATCH,
    async (_event, args: { dirPath: string }) => {
      try {
        const { dirPath } = args;
        if (!currentWorkspaceRoot || !isPathWithinWorkspace(dirPath, currentWorkspaceRoot)) {
          return { error: 'Access denied: path is outside workspace' };
        }
        try {
          const realDirPath = await fs.realpath(dirPath);
          if (!isPathWithinWorkspace(realDirPath, currentWorkspaceRoot)) {
            return { error: 'Access denied: symlink points outside workspace' };
          }
        } catch {
          return { error: 'Directory does not exist' };
        }

        // Clean up existing watcher
        if (watcher) {
          await watcher.close();
          watcher = null;
        }

        watcher = chokidar.watch(dirPath, {
          ignored: (filePath: string) => {
            const relative = path.relative(dirPath, filePath);
            const parts = relative.split(path.sep);
            return parts.some((part) => IGNORED_DIRS.has(part));
          },
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: WATCHER_STABILITY_THRESHOLD_MS,
            pollInterval: WATCHER_THROTTLE_MS,
          },
        });

        const win = getMainWindow();

        let eventBuffer: Array<{ type: string; path: string }> = [];
        let flushTimer: ReturnType<typeof setTimeout> | null = null;

        watcher.on('all', (eventType: string, filePath: string) => {
          if (!win || win.isDestroyed()) return;
          const mappedType =
            eventType === 'addDir' || eventType === 'add'
              ? 'add'
              : eventType === 'unlinkDir' || eventType === 'unlink'
                ? 'unlink'
                : 'change';

          eventBuffer.push({ type: mappedType, path: filePath });

          if (!flushTimer) {
            flushTimer = setTimeout(() => {
              if (win && !win.isDestroyed()) {
                const deduped = new Map<string, string>();
                for (const ev of eventBuffer) {
                  deduped.set(ev.path, ev.type);
                }
                for (const [path, type] of deduped) {
                  win.webContents.send(IPC_CHANNELS.FS_WATCH_EVENT, { type, path });
                }
              }
              eventBuffer = [];
              flushTimer = null;
            }, WATCHER_THROTTLE_MS);
          }
        });

        return { data: { success: true } };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  );

  // Unwatch
  ipcMain.handle(IPC_CHANNELS.FS_UNWATCH, async () => {
    try {
      if (watcher) {
        await watcher.close();
        watcher = null;
      }
      return { data: { success: true } };
    } catch (err: any) {
      return { error: err.message };
    }
  });
}
