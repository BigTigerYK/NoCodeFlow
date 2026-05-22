import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { MAX_SNAPSHOTS, SNAPSHOT_MAX_FILE_SIZE_BYTES } from '@shared/constants';
import type { SnapshotMetadata } from '@shared/types/snapshot';

export class SnapshotManager {
  private snapshotRoot: string;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = path.resolve(workspacePath);
    this.snapshotRoot = path.join(this.workspacePath, '.nocodeflow', 'snapshots');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.snapshotRoot, { recursive: true });
  }

  async createSnapshot(
    filePath: string,
    toolName: 'Write' | 'Edit',
    toolId: string,
  ): Promise<SnapshotMetadata | null> {
    try {
      const resolved = path.resolve(filePath);
      if (!this.isWithinWorkspace(resolved)) return null;

      const relativePath = path.relative(this.workspacePath, resolved);

      let fileExisted = false;
      let content = '';
      try {
        const stat = await fs.stat(resolved);
        if (stat.size > SNAPSHOT_MAX_FILE_SIZE_BYTES) {
          console.warn(`[Snapshot] Skipping large file (${stat.size} bytes): ${relativePath}`);
          return null;
        }
        content = await fs.readFile(resolved, 'utf-8');
        fileExisted = true;
      } catch {
        fileExisted = false;
      }

      const id = crypto.randomUUID();
      const timestamp = Date.now();
      const sanitized = this.sanitizeFilename(relativePath);
      const dirName = `${new Date(timestamp).toISOString().replace(/:/g, '-')}--${sanitized}`;
      const dirPath = path.join(this.snapshotRoot, dirName);

      await fs.mkdir(dirPath, { recursive: true });

      const metadata: SnapshotMetadata = {
        id,
        timestamp,
        originalPath: resolved,
        relativePath,
        toolName,
        toolId,
        fileExisted,
        snapshotDirName: dirName,
      };

      await fs.writeFile(path.join(dirPath, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
      await fs.writeFile(path.join(dirPath, 'content'), content, 'utf-8');

      await this.cleanup();

      return metadata;
    } catch (err) {
      console.error('[Snapshot] Failed to create snapshot:', err);
      return null;
    }
  }

  async listSnapshots(filter?: { filePath?: string }): Promise<SnapshotMetadata[]> {
    try {
      const entries = await fs.readdir(this.snapshotRoot, { withFileTypes: true });
      const snapshots: SnapshotMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const metaPath = path.join(this.snapshotRoot, entry.name, 'metadata.json');
          const raw = await fs.readFile(metaPath, 'utf-8');
          const meta = JSON.parse(raw) as SnapshotMetadata;
          if (filter?.filePath && meta.originalPath !== path.resolve(filter.filePath)) continue;
          snapshots.push(meta);
        } catch {
          // skip invalid snapshot dirs
        }
      }

      return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  async getSnapshotContent(snapshotId: string): Promise<{ metadata: SnapshotMetadata; content: string } | null> {
    const entries = await fs.readdir(this.snapshotRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const metaPath = path.join(this.snapshotRoot, entry.name, 'metadata.json');
        const raw = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(raw) as SnapshotMetadata;
        if (meta.id !== snapshotId) continue;

        const content = await fs.readFile(path.join(this.snapshotRoot, entry.name, 'content'), 'utf-8');
        return { metadata: meta, content };
      } catch {
        // skip
      }
    }

    return null;
  }

  async restoreSnapshot(snapshotId: string): Promise<{ success: boolean; filePath: string; error?: string }> {
    const snap = await this.getSnapshotContent(snapshotId);
    if (!snap) return { success: false, filePath: '', error: 'Snapshot not found' };

    const { metadata, content } = snap;

    try {
      if (!metadata.fileExisted) {
        // File was created by agent — delete it
        try {
          await fs.unlink(metadata.originalPath);
        } catch {
          // file may already not exist
        }
      } else {
        // Restore original content with atomic write
        const dir = path.dirname(metadata.originalPath);
        await fs.mkdir(dir, { recursive: true });
        const tmpPath = metadata.originalPath + '.nocodeflow-tmp';
        await fs.writeFile(tmpPath, content, 'utf-8');
        await fs.rename(tmpPath, metadata.originalPath);
      }

      return { success: true, filePath: metadata.originalPath };
    } catch (err: any) {
      return { success: false, filePath: metadata.originalPath, error: err.message };
    }
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const entries = await fs.readdir(this.snapshotRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const metaPath = path.join(this.snapshotRoot, entry.name, 'metadata.json');
        const raw = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(raw) as SnapshotMetadata;
        if (meta.id === snapshotId) {
          await fs.rm(path.join(this.snapshotRoot, entry.name), { recursive: true, force: true });
          return true;
        }
      } catch {
        // skip
      }
    }

    return false;
  }

  private async cleanup(): Promise<void> {
    const entries = await fs.readdir(this.snapshotRoot, { withFileTypes: true });
    const dirs: { name: string; timestamp: number }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const metaPath = path.join(this.snapshotRoot, entry.name, 'metadata.json');
        const raw = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(raw) as SnapshotMetadata;
        dirs.push({ name: entry.name, timestamp: meta.timestamp });
      } catch {
        // skip invalid
      }
    }

    if (dirs.length <= MAX_SNAPSHOTS) return;

    dirs.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = dirs.slice(0, dirs.length - MAX_SNAPSHOTS);

    for (const d of toDelete) {
      try {
        await fs.rm(path.join(this.snapshotRoot, d.name), { recursive: true, force: true });
      } catch {
        // best effort
      }
    }
  }

  private isWithinWorkspace(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return resolved === this.workspacePath || resolved.startsWith(this.workspacePath + path.sep);
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[\\/]/g, '-')
      .replace(/[<>:"|?*]/g, '_')
      .slice(0, 60);
  }
}
