import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { useWorkspaceStore } from '@/stores/workspace';
import { RecentWorkspaces } from './RecentWorkspaces';

export function EmptyState() {
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);

  const handleOpenFolder = async () => {
    const path = await window.api.invoke(IPC_CHANNELS.FS_OPEN_DIALOG);
    if (path) {
      await openWorkspace(path as string);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <FolderOpen className="h-16 w-16 mx-auto mb-6 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold mb-2">Open a Workspace</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Open a folder to start browsing and editing files
        </p>
        <Button onClick={handleOpenFolder} size="lg">
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Folder
        </Button>
        <RecentWorkspaces />
      </div>
    </div>
  );
}
