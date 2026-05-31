import { useState } from 'react';
import { FolderOpen, Save, MessageSquare, X, History, PanelLeftClose, PanelLeft, ArrowLeft } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { Button } from '@/components/ui/button';
import { FileTree } from './FileTree';
import { Editor } from './Editor';
import { EditorTabs } from './EditorTabs';
import { EmptyState } from './EmptyState';
import { ChatPanel } from '@/components/Agent/ChatPanel';
import { SnapshotPanel } from '@/components/Snapshot';
import { useSnapshotStore } from '@/stores/snapshot';
import { useResizable } from '@/hooks/useResizable';

function DragHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}

export function WorkspacePage() {
  const isOpen = useWorkspaceStore((s) => s.isOpen);
  const workspaceName = useWorkspaceStore((s) => s.workspaceName);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const activeTabPath = useWorkspaceStore((s) => s.activeTabPath);
  const openTabs = useWorkspaceStore((s) => s.openTabs);
  const saveActiveFile = useWorkspaceStore((s) => s.saveActiveFile);
  const closeWorkspace = useWorkspaceStore((s) => s.closeWorkspace);

  const isSnapshotOpen = useSnapshotStore((s) => s.isOpen);
  const openSnapshot = useSnapshotStore((s) => s.open);
  const closeSnapshot = useSnapshotStore((s) => s.close);

  const [showAgent, setShowAgent] = useState(() => {
    // Auto-show agent if there's a pending task from HomePage
    return !!sessionStorage.getItem('pendingTask');
  });

  const leftPanel = useResizable({ defaultWidth: 220, minWidth: 180, maxWidth: 400, direction: 'right' });
  const rightPanel = useResizable({ defaultWidth: 320, minWidth: 280, maxWidth: 500, direction: 'left' });

  const handleOpenFolder = async () => {
    const path = await window.api.invoke(IPC_CHANNELS.FS_OPEN_DIALOG);
    if (path) {
      await openWorkspace(path as string);
    }
  };

  const activeTab = openTabs.find((t) => t.path === activeTabPath);

  if (!isOpen) {
    return <EmptyState />;
  }

  const showRightPanel = showAgent || isSnapshotOpen;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              closeWorkspace();
              window.dispatchEvent(new CustomEvent('nocodeflow:navigate', { detail: 'task-center' }));
            }}
            title="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleOpenFolder}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            打开文件夹
          </Button>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {workspaceName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {activeTab?.isDirty && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={saveActiveFile}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              保存
            </Button>
          )}
          <Button
            variant={showAgent ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowAgent(!showAgent)}
          >
            {showAgent ? <X className="h-3.5 w-3.5 mr-1.5" /> : <MessageSquare className="h-3.5 w-3.5 mr-1.5" />}
            {showAgent ? '关闭' : 'Agent'}
          </Button>
          <Button
            variant={isSnapshotOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={isSnapshotOpen ? closeSnapshot : openSnapshot}
          >
            {isSnapshotOpen ? <X className="h-3.5 w-3.5 mr-1.5" /> : <History className="h-3.5 w-3.5 mr-1.5" />}
            {isSnapshotOpen ? '关闭' : '快照'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        {!leftPanel.isCollapsed && (
          <div style={{ width: leftPanel.width }} className="shrink-0 overflow-hidden">
            <FileTree />
          </div>
        )}

        {/* File tree collapse toggle */}
        <div className="flex items-center shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-4 rounded-none hover:bg-muted/50"
            onClick={leftPanel.toggleCollapse}
            title={leftPanel.isCollapsed ? '展开文件树' : '折叠文件树'}
          >
            {leftPanel.isCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Left drag handle */}
        {!leftPanel.isCollapsed && <DragHandle onMouseDown={leftPanel.startDrag} />}

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-[400px]">
          <EditorTabs />
          <div className="flex-1 overflow-hidden">
            <Editor />
          </div>
        </div>

        {/* Right drag handle */}
        {showRightPanel && <DragHandle onMouseDown={rightPanel.startDrag} />}

        {/* Agent chat panel */}
        {showAgent && rootPath && (
          <div style={{ width: rightPanel.width }} className="shrink-0 overflow-hidden panel-expand">
            <ChatPanel workspacePath={rootPath} />
          </div>
        )}

        {/* Snapshot panel */}
        {isSnapshotOpen && !showAgent && (
          <div style={{ width: rightPanel.width }} className="shrink-0 overflow-hidden panel-expand">
            <SnapshotPanel />
          </div>
        )}
      </div>
    </div>
  );
}
