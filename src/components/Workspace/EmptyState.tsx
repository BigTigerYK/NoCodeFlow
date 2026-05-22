import { FolderOpen, Sparkles } from 'lucide-react';
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
        <div className="relative inline-block mb-6">
          <FolderOpen className="h-16 w-16 text-muted-foreground/30" />
          <Sparkles className="h-6 w-6 text-purple absolute -top-1 -right-2 animate-pulse" />
        </div>
        <h2 className="text-heading-2 mb-2">今天想完成什么？</h2>
        <p className="text-body text-muted-foreground mb-6">
          打开一个文件夹开始工作，让 AI 帮你编写代码
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={handleOpenFolder} size="lg" className="btn-press">
            <FolderOpen className="h-4 w-4 mr-2" />
            打开文件夹
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="btn-press"
            onClick={() => window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'task-center' }))}
          >
            返回首页
          </Button>
        </div>
        <RecentWorkspaces />
      </div>
    </div>
  );
}
