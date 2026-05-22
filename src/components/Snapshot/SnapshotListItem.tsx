import { FileEdit, FilePlus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SnapshotMetadata } from '@shared/types/snapshot';
import { useSnapshotStore } from '@/stores/snapshot';
import { SnapshotDiffView } from './SnapshotDiffView';
import { cn } from '@/lib/utils';

interface SnapshotListItemProps {
  snapshot: SnapshotMetadata;
  isSelected: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export function SnapshotListItem({ snapshot, isSelected }: SnapshotListItemProps) {
  const { selectSnapshot, restoreSnapshot, deleteSnapshot, snapshotContent, currentFileContent } =
    useSnapshotStore();

  const handleSelect = () => {
    if (isSelected) {
      // collapse
      useSnapshotStore.setState({ selectedSnapshot: null, snapshotContent: null });
    } else {
      selectSnapshot(snapshot.id);
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定恢复 "${snapshot.relativePath}" 到此快照的状态？`)) {
      await restoreSnapshot(snapshot.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSnapshot(snapshot.id);
  };

  return (
    <div className={cn('border rounded-md overflow-hidden', isSelected && 'ring-1 ring-primary/30')}>
      <button
        onClick={handleSelect}
        className="w-full flex items-start gap-2 p-2.5 hover:bg-accent/50 text-left transition-colors"
      >
        {snapshot.toolName === 'Write' ? (
          <FileEdit className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        ) : (
          <FilePlus className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{snapshot.relativePath}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{formatRelativeTime(snapshot.timestamp)}</span>
            <span className="capitalize">{snapshot.toolName === 'Write' ? '写入' : '编辑'}</span>
            {!snapshot.fileExisted && (
              <span className="text-orange-500">新建文件</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRestore}
            title="恢复此快照"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            title="删除此快照"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>

      {isSelected && snapshotContent !== null && (
        <div className="border-t px-2 py-2">
          <SnapshotDiffView
            metadata={snapshot}
            snapshotContent={snapshotContent}
            currentContent={currentFileContent}
          />
        </div>
      )}
    </div>
  );
}
