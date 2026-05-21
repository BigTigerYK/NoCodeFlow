import { FolderOpen, Save } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { IPC_CHANNELS } from '@shared/types/ipc';
import { Button } from '@/components/ui/button';
import { FileTree } from './FileTree';
import { Editor } from './Editor';
import { EditorTabs } from './EditorTabs';
import { EmptyState } from './EmptyState';

export function WorkspacePage() {
  const {
    isOpen,
    workspaceName,
    openWorkspace,
    activeTabPath,
    openTabs,
    saveActiveFile,
  } = useWorkspaceStore();

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleOpenFolder}
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
            Open Folder
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
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-60 shrink-0">
          <FileTree />
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorTabs />
          <div className="flex-1 overflow-hidden">
            <Editor />
          </div>
        </div>
      </div>
    </div>
  );
}
