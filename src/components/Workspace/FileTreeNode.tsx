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
import { getIconTypeForFile } from '@shared/utils/file-extensions';
import { useWorkspaceStore } from '@/stores/workspace';
import { cn } from '@/lib/utils';

function getFileIcon(name: string) {
  const iconType = getIconTypeForFile(name);
  switch (iconType) {
    case 'code':
      return FileCode;
    case 'json':
      return FileJson;
    case 'markdown':
      return FileType;
    case 'image':
      return Image;
    case 'config':
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
    if (isDir && e.key === 'ArrowRight' && !isExpanded) {
      e.preventDefault();
      toggleExpand(node.path);
    }
    if (isDir && e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault();
      toggleExpand(node.path);
    }
  };

  const Icon = isDir
    ? isExpanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name);

  return (
    <div role="group">
      <div
        role="treeitem"
        aria-expanded={isDir ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm hover:bg-accent/50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isSelected && 'bg-accent',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
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
        <div role="group">
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});
