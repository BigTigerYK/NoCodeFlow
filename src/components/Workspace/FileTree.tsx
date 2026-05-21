import { RefreshCw, FolderOpen, ChevronsDownUp } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileTreeNode } from './FileTreeNode';

export function FileTree() {
  const { fileTree, refreshTree, rootPath } = useWorkspaceStore();

  const handleCollapseAll = () => {
    useWorkspaceStore.setState({ expandedPaths: new Set<string>() });
  };

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
            onClick={handleCollapseAll}
            title="Collapse All"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={refreshTree}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {fileTree.length > 0 ? (
          <div className="py-1" role="tree" aria-label="File explorer">
            {fileTree.map((node) => (
              <FileTreeNode key={node.path} node={node} depth={0} />
            ))}
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
