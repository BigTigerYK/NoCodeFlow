import { useEffect, useState, useCallback } from 'react';
import { Sparkles, FolderOpen } from 'lucide-react';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { AppConfig } from '@shared/types/config';
import { useWorkspaceStore } from '@/stores/workspace';
import { Button } from '@/components/ui/button';
import { TaskInput } from './TaskInput';
import { QuickTags } from './QuickTags';
import { ProjectCard, NewProjectCard } from './ProjectCard';
import { TaskCard } from './TaskCard';

export function HomePage() {
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);

  const loadRecent = useCallback(() => {
    window.api
      .invoke(IPC_CHANNELS.CONFIG_GET_ALL)
      .then((data) => {
        const config = data as Partial<AppConfig>;
        setRecentPaths(config.recentWorkspaces || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleTaskSubmit = (task: string) => {
    // For now, open a workspace if one isn't open, then the agent will handle the task
    // The task text will be passed to the agent after workspace opens
    // Store the pending task in sessionStorage so WorkspacePage can pick it up
    sessionStorage.setItem('pendingTask', task);
    if (useWorkspaceStore.getState().isOpen) {
      // Already in a workspace, just switch to workspace page
      // The WorkspacePage will pick up the pending task
      window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'workspace' }));
    } else {
      // Need to open a workspace first - prompt user
      window.api.invoke(IPC_CHANNELS.FS_OPEN_DIALOG).then((path) => {
        if (path) {
          openWorkspace(path as string).then(() => {
            window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'workspace' }));
          });
        }
      });
    }
  };

  const handleRemoveRecent = async (path: string) => {
    const updated = recentPaths.filter((p) => p !== path);
    setRecentPaths(updated);
    await window.api.invoke(IPC_CHANNELS.CONFIG_SET, 'recentWorkspaces', updated);
  };

  const handleOpenFolder = async () => {
    const path = await window.api.invoke(IPC_CHANNELS.FS_OPEN_DIALOG);
    if (path) {
      await openWorkspace(path as string);
      window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'workspace' }));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-4">
            <Sparkles className="h-10 w-10 text-purple animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold mb-2">今天想完成什么？</h1>
          <p className="text-muted-foreground text-sm mb-8">
            告诉 AI 你的想法，让它帮你实现
          </p>
          <TaskInput onSubmit={handleTaskSubmit} />
        </div>

        {/* Quick Tags */}
        <div className="mb-12">
          <QuickTags onSelect={handleTaskSubmit} />
        </div>

        {/* Recent Projects */}
        <section className="mb-12">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            最近项目
          </h2>
          {recentPaths.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentPaths.slice(0, 7).map((p) => {
                const name = p.split(/[\\/]/).pop() || p;
                return (
                  <ProjectCard
                    key={p}
                    name={name}
                    path={p}
                    onRemove={handleRemoveRecent}
                  />
                );
              })}
              <NewProjectCard onCreated={loadRecent} />
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                还没有最近项目
              </p>
              <Button
                variant="outline"
                onClick={handleOpenFolder}
                className="btn-press"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                打开文件夹
              </Button>
            </div>
          )}
        </section>

        {/* Task Types */}
        <section className="mb-16">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            快速开始
          </h2>
          <TaskCard onSelect={handleTaskSubmit} />
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pb-8">
          NoCodeFlow — AI 认知工作台
        </footer>
      </div>
    </div>
  );
}
