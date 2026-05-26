import { X, Circle } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function EditorTabs() {
  const { openTabs, activeTabPath, setActiveTab, closeTab } =
    useWorkspaceStore();
  const [confirmClose, setConfirmClose] = useState<string | null>(null);

  if (openTabs.length === 0) return null;

  const handleClose = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tab = openTabs.find((t) => t.path === path);
    if (tab?.isDirty) {
      setConfirmClose(path);
    } else {
      closeTab(path);
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const tab = openTabs.find((t) => t.path === path);
      if (tab?.isDirty) {
        setConfirmClose(path);
      } else {
        closeTab(path);
      }
    }
  };

  const confirmCloseTab = () => {
    if (confirmClose) {
      closeTab(confirmClose);
      setConfirmClose(null);
    }
  };

  return (
    <>
      <div className="flex border-b bg-muted/20 overflow-x-auto" role="tablist" aria-label="Editor tabs">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            role="tab"
            aria-selected={activeTabPath === tab.path}
            tabIndex={activeTabPath === tab.path ? 0 : -1}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r hover:bg-accent/50 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200',
              activeTabPath === tab.path
                ? 'bg-background border-b-2 border-b-primary'
                : 'text-muted-foreground',
            )}
            onClick={() => setActiveTab(tab.path)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.path)}
          >
            <span className="truncate max-w-[120px]">{tab.name}</span>
            {tab.isDirty && (
              <Circle className="h-2 w-2 fill-orange-500 text-orange-500 shrink-0" aria-label="Unsaved changes" />
            )}
            <button
              className={cn(
                'h-4 w-4 rounded-sm hover:bg-destructive/20 hover:text-destructive flex items-center justify-center shrink-0',
                'opacity-60 group-hover:opacity-100',
                activeTabPath === tab.path && 'opacity-100',
              )}
              onClick={(e) => handleClose(tab.path, e)}
              aria-label={`Close ${tab.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={!!confirmClose} onOpenChange={() => setConfirmClose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              This file has unsaved changes. Do you want to save before closing?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClose(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCloseTab}
            >
              Don&apos;t Save
            </Button>
            <Button
              onClick={async () => {
                if (confirmClose) {
                  await useWorkspaceStore.getState().saveFile(confirmClose);
                  closeTab(confirmClose);
                  setConfirmClose(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
