export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: number;
}

export interface WorkspaceInfo {
  name: string;
  rootPath: string;
  fileCount: number;
  lastOpenedAt: number;
}
