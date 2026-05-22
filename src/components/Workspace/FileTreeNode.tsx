import { memo, useState, useRef, useEffect, useCallback } from 'react';
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
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { FileNode } from '@shared/types/workspace';
import { getIconTypeForFile } from '@shared/utils/file-extensions';
import { useWorkspaceStore } from '@/stores/workspace';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

/** Inline editable input for rename / create */
function InlineEdit({
  defaultValue = '',
  placeholder = '',
  onSubmit,
  onCancel,
}: {
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== defaultValue) {
      onSubmit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
      placeholder={placeholder}
      className="h-5 w-full text-sm bg-background border border-ring rounded px-1 outline-none"
    />
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
}: FileTreeNodeProps) {
  const {
    expandedPaths,
    selectedPath,
    toggleExpand,
    selectFile,
    openFile,
    createFile,
    createDirectory,
    deletePath,
    renamePath,
  } = useWorkspaceStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (isRenaming || creating) return;
    if (isDir) {
      toggleExpand(node.path);
    } else {
      selectFile(node.path);
      openFile(node.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isRenaming || creating) return;
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
      toggleNodeCollapse();
    }
  };

  const toggleNodeCollapse = () => {
    if (isDir && isExpanded) {
      toggleExpand(node.path);
    }
  };

  const handleRename = async (newName: string) => {
    setIsRenaming(false);
    try {
      await renamePath(node.path, newName);
    } catch (err: any) {
      console.warn('Rename failed:', err.message);
    }
  };

  const handleCreate = useCallback(
    async (name: string) => {
      const type = creating;
      setCreating(null);
      try {
        if (type === 'file') {
          await createFile(node.path, name);
        } else {
          await createDirectory(node.path, name);
        }
      } catch (err: any) {
        console.warn('Create failed:', err.message);
      }
    },
    [creating, node.path, createFile, createDirectory],
  );

  const handleDelete = async () => {
    const label = isDir ? '文件夹' : '文件';
    if (!window.confirm(`确定删除${label} "${node.name}" 吗？`)) return;
    try {
      await deletePath(node.path);
    } catch (err: any) {
      console.warn('Delete failed:', err.message);
    }
  };

  const Icon = isDir
    ? isExpanded
      ? FolderOpen
      : Folder
    : getFileIcon(node.name);

  return (
    <div role="group">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
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
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
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
            {isRenaming ? (
              <InlineEdit
                defaultValue={node.name}
                onSubmit={handleRename}
                onCancel={() => setIsRenaming(false)}
              />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {isDir && (
            <>
              <DropdownMenuItem onClick={() => setCreating('file')}>
                <FilePlus className="h-4 w-4 mr-2" />
                新建文件
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreating('dir')}>
                <FolderPlus className="h-4 w-4 mr-2" />
                新建文件夹
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setIsRenaming(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline create input under directory */}
      {isDir && creating && (
        <div
          className="flex items-center gap-1 px-2 py-0.5"
          style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
        >
          <span className="w-4 shrink-0" />
          {creating === 'file' ? (
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-blue-500" />
          )}
          <InlineEdit
            placeholder={creating === 'file' ? '文件名' : '文件夹名'}
            onSubmit={handleCreate}
            onCancel={() => setCreating(null)}
          />
        </div>
      )}

      {/* Children */}
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
