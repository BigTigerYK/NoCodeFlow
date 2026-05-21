import { memo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileType,
  Image,
  Settings,
} from 'lucide-react';
import { FileNode } from '@shared/types/workspace';
import { useWorkspaceStore } from '@/stores/workspace';
import { cn } from '@/lib/utils';

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
    case 'mdx':
      return FileType;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return Image;
    case 'css':
    case 'scss':
    case 'less':
    case 'html':
      return FileCode;
    case 'yaml':
    case 'yml':
    case 'toml':
    case 'ini':
      return Settings;
    default:
      return FileText;
  }
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
}: FileTreeNodeProps) {
  const { expandedPaths, selectedPath, toggleExpand, selectFile, openFile } =
    useWorkspaceStore();

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (isDir) {
      toggleExpand(node.path);
    } else {
      selectFile(node.path);
      openFile(node.path);
    }
  };

  const Icon = isDir
    ? isExpanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm hover:bg-accent/50 select-none',
          isSelected && 'bg-accent',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDir ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            isDir ? 'text-blue-500' : 'text-muted-foreground',
          )}
        />
        <span className="truncate">{node.name}</span>
      </div>
      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});
