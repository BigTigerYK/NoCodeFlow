import { useEffect, useState } from 'react';
import { FolderOpen, Clock } from 'lucide-react';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { AppConfig } from '@shared/types/config';
import { useWorkspaceStore } from '@/stores/workspace';
import { Button } from '@/components/ui/button';

export function RecentWorkspaces() {
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);

  useEffect(() => {
    window.api
      .invoke(IPC_CHANNELS.CONFIG_GET_ALL)
      .then((data) => {
        const config = data as Partial<AppConfig>;
        setRecentPaths(config.recentWorkspaces || []);
      })
      .catch(() => {});
  }, []);

  if (recentPaths.length === 0) return null;

  return (
    <div className="mt-8 text-left">
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Recent Workspaces</span>
      </div>
      <div className="space-y-1">
        {recentPaths.slice(0, 8).map((p) => {
          const name = p.split(/[\\/]/).pop() || p;
          return (
            <Button
              key={p}
              variant="ghost"
              className="w-full justify-start text-sm h-8 font-normal"
              onClick={() => openWorkspace(p)}
            >
              <FolderOpen className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
              <div className="truncate">
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {p}
                </span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
