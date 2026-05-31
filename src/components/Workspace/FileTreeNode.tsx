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
  Loader2,
} from 'lucide-react';
import { FileNode } from '@shared/types/workspace';
import { getIconTypeForFile } from '@shared/utils/file-extensions';
import { useWorkspaceStore } from '@/stores/workspace';
import { cn } from '@/lib/utils';
import { toast } from '@/components/Common/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  const expandedPaths = useWorkspaceStore((s) => s.expandedPaths);
  const selectedPath = useWorkspaceStore((s) => s.selectedPath);
  const toggleExpand = useWorkspaceStore((s) => s.toggleExpand);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const createFile = useWorkspaceStore((s) => s.createFile);
  const createDirectory = useWorkspaceStore((s) => s.createDirectory);
  const deletePath = useWorkspaceStore((s) => s.deletePath);
  const renamePath = useWorkspaceStore((s) => s.renamePath);
  const movePath = useWorkspaceStore((s) => s.movePath);

  const [isRenaming, setIsRenaming] = useState(false);
  const [creating, setCreating] = useState<'file' | 'dir' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === 'directory';

  // Normalize path for comparison (handle Windows backslashes)
  const normalizePath = (p: string) => p.replace(/\\/g, '/');

  // Check if targetPath is a descendant of sourcePath
  const isDescendant = (sourcePath: string, targetPath: string) => {
    const normalizedSource = normalizePath(sourcePath).replace(/[\/]+$/, '') + '/';
    const normalizedTarget = normalizePath(targetPath);
    return normalizedTarget.startsWith(normalizedSource);
  };

  const handleClick = async () => {
    if (isRenaming || creating || isLoading) return;
    if (isDir) {
      toggleExpand(node.path);
    } else {
      try {
        await openFile(node.path);
      } catch (err: any) {
        toast.error(`打开文件失败: ${err.message}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isRenaming || creating || isLoading) return;
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
    setIsLoading(true);
    try {
      await renamePath(node.path, newName);
      toast.success('重命名成功');
    } catch (err: any) {
      toast.error(`重命名失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = useCallback(
    async (name: string) => {
      const type = creating;
      setCreating(null);
      setIsLoading(true);
      try {
        if (type === 'file') {
          await createFile(node.path, name);
          toast.success(`文件 "${name}" 创建成功`);
        } else {
          await createDirectory(node.path, name);
          toast.success(`文件夹 "${name}" 创建成功`);
        }
      } catch (err: any) {
        toast.error(`创建失败: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [creating, node.path, createFile, createDirectory],
  );

  const handleDelete = async () => {
    setDeleteConfirmOpen(false);
    setIsLoading(true);
    try {
      await deletePath(node.path);
      toast.success(`已删除 "${node.name}"`);
    } catch (err: any) {
      toast.error(`删除失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/nocodeflow-file-path', node.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only allow drop on directories
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isDir) return;
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const sourcePath = e.dataTransfer.getData('application/nocodeflow-file-path');
    if (!sourcePath) return;

    // Prevent dropping onto itself
    if (sourcePath === node.path) return;

    // Prevent dropping a folder into its own descendant
    if (isDescendant(sourcePath, node.path)) {
      toast.error('不能将文件夹移动到其自身内部');
      return;
    }

    setIsLoading(true);
    try {
      await movePath(sourcePath, node.path);
      toast.success('移动成功');
    } catch (err: any) {
      toast.error(`移动失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = () => {
    dragCounterRef.current = 0;
    setIsDragOver(false);
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
            draggable={!isRenaming && !creating}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm hover:bg-accent/50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isSelected && 'bg-accent',
              isLoading && 'opacity-60 pointer-events-none',
              isDragOver && 'bg-primary/20 ring-2 ring-primary',
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => {
              // Prevent DropdownMenuTrigger from opening menu on left-click.
              // Menu should only open via right-click (onContextMenu).
              if (e.button === 0) {
                e.preventDefault();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
            ) : isDir ? (
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
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除{isDir ? '文件夹' : '文件'} &quot;{node.name}&quot; 吗？
              {isDir && '该操作将删除文件夹内的所有内容。'}
              此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
