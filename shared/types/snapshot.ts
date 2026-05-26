export interface SnapshotMetadata {
  id: string;
  timestamp: number;
  originalPath: string;
  relativePath: string;
  toolName: 'Write' | 'Edit';
  toolId: string;
  fileExisted: boolean;
  snapshotDirName: string;
}
