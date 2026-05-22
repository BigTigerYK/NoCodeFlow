import { useEffect } from 'react';
import { X, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSnapshotStore } from '@/stores/snapshot';
import { useWorkspaceStore } from '@/stores/workspace';
import { SnapshotListItem } from './SnapshotListItem';

export function SnapshotPanel() {
  const {
    snapshots,
    selectedSnapshot,
    isOpen,
    loading,
    close,
    setCurrentFileContent,
  } = useSnapshotStore();

  const { activeTabPath, openTabs } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      useSnapshotStore.getState().fetchSnapshots();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSnapshot && activeTabPath) {
      const tab = openTabs.find((t) => t.path === activeTabPath);
      setCurrentFileContent(tab?.content ?? null);
    }
  }, [selectedSnapshot, activeTabPath, openTabs, setCurrentFileContent]);

  if (!isOpen) return null;

  return (
    <div className="w-80 shrink-0 border-l flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-1.5">
          <History className="h-4 w-4" />
          <span className="text-sm font-medium">快照历史</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && snapshots.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              暂无快照记录
            </div>
          )}

          {!loading && snapshots.map((snap) => (
            <SnapshotListItem
              key={snap.id}
              snapshot={snap}
              isSelected={selectedSnapshot?.id === snap.id}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
