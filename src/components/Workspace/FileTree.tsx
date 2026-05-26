import { useState, useCallback } from 'react';
import { RefreshCw, FolderOpen, ChevronsDownUp, FilePlus, FolderPlus, FileText } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileTreeNode } from './FileTreeNode';

export function FileTree() {
  const { fileTree, refreshTree, rootPath, createFile, createDirectory } = useWorkspaceStore();
  const [rootCreating, setRootCreating] = useState<'file' | 'dir' | null>(null);

  const handleCollapseAll = () => {
    useWorkspaceStore.setState({ expandedPaths: new Set<string>() });
  };

  const handleRootCreate = useCallback(
    async (name: string) => {
      const type = rootCreating;
      setRootCreating(null);
      if (!rootPath) return;
      try {
        if (type === 'file') {
          await createFile(rootPath, name);
        } else {
          await createDirectory(rootPath, name);
        }
      } catch (err: any) {
        console.warn('Create failed:', err.message);
      }
    },
    [rootCreating, rootPath, createFile, createDirectory],
  );

  if (!rootPath) {
    return null;
  }

  return (
    <div className="flex flex-col h-full border-r">
      <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setRootCreating('file')}
            title="新建文件"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setRootCreating('dir')}
            title="新建文件夹"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCollapseAll}
            title="全部折叠"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={refreshTree}
            title="刷新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {fileTree.length > 0 || rootCreating ? (
          <div className="py-1" role="tree" aria-label="File explorer">
            {fileTree.map((node) => (
              <FileTreeNode key={node.path} node={node} depth={0} />
            ))}
            {rootCreating && (
              <div
                className="flex items-center gap-1 px-2 py-0.5"
                style={{ paddingLeft: '8px' }}
              >
                <span className="w-4 shrink-0" />
                {rootCreating === 'file' ? (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
                )}
                <input
                  autoFocus
                  placeholder={rootCreating === 'file' ? '文件名' : '文件夹名'}
                  className="h-5 w-full text-sm bg-background border border-ring rounded px-1 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const name = (e.target as HTMLInputElement).value.trim();
                      if (name) handleRootCreate(name);
                    }
                    if (e.key === 'Escape') setRootCreating(null);
                  }}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name) handleRootCreate(name);
                    else setRootCreating(null);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">Empty folder</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
