import { FolderOpen, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { useWorkspaceStore } from '@/stores/workspace';

interface ProjectCardProps {
  name: string;
  path: string;
  onRemove?: (path: string) => void;
}

export function ProjectCard({ name, path, onRemove }: ProjectCardProps) {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);

  return (
    <button
      className={cn(
        'group relative flex items-start gap-3 p-4 rounded-lg border bg-card text-left',
        'card-hover cursor-pointer w-full',
      )}
      onClick={async () => {
        await openWorkspace(path);
        window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'workspace' }));
      }}
      title={path}
    >
      <FolderOpen className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {path}
        </div>
      </div>
      {onRemove && (
        <button
          className={cn(
            'absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-opacity duration-150',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(path);
          }}
          title="从列表移除"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </button>
  );
}

interface NewProjectCardProps {
  onCreated?: () => void;
}

export function NewProjectCard({ onCreated }: NewProjectCardProps) {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);

  const handleClick = async () => {
    const path = await window.api.invoke(IPC_CHANNELS.FS_OPEN_DIALOG);
    if (path) {
      await openWorkspace(path as string);
      window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'workspace' }));
      onCreated?.();
    }
  };

  return (
    <button
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed',
        'text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
        'card-hover cursor-pointer min-h-[72px] w-full',
      )}
      onClick={handleClick}
    >
      <Plus className="h-5 w-5" />
      <span className="text-xs">新建项目</span>
    </button>
  );
}
