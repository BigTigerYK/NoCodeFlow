import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useAgentStore } from '@/stores/agent';
import { usePermissionStore } from '@/stores/permission';
import { Button } from '@/components/ui/button';
import { AgentStatusBar } from './AgentStatus';
import { MessageBubble } from './MessageBubble';
import { MessageHistory } from './MessageHistory';
import { ChatInput } from './ChatInput';
import { DependencySetup } from './DependencySetup';
import { TimelinePanel } from './Timeline';
import { PermissionDialog } from '@/components/Permission';
import type { ToolUseEntry } from '@/lib/output-parser';

interface ChatPanelProps {
  workspacePath: string;
}

export function ChatPanel({ workspacePath }: ChatPanelProps) {
  const { messages, timelineEntries, status, isAvailable, sendMessage, stopAgent, initialize } =
    useAgentStore();
  const { initialize: initPermission, dispose: disposePermission } = usePermissionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [showHistory, setShowHistory] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const userMessages = useMemo(() => messages.filter((m) => m.role === 'user'), [messages]);

  const scrollToMessage = useCallback((id: string) => {
    const el = document.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 1500);
    }
    setShowHistory(false);
  }, []);

  const currentTool = useMemo(() => {
    if (status !== 'running') return undefined;
    for (let i = timelineEntries.length - 1; i >= 0; i--) {
      const e = timelineEntries[i];
      if (e.kind === 'tool_use' && e.status === 'running') {
        return (e as ToolUseEntry).toolName;
      }
    }
    return undefined;
  }, [timelineEntries, status]);

  useEffect(() => {
    if (!initializedRef.current && workspacePath) {
      initializedRef.current = true;
      initialize(workspacePath).then((ok) => {
        if (ok) {
          // Check for pending task from HomePage
          const pending = sessionStorage.getItem('pendingTask');
          if (pending) {
            sessionStorage.removeItem('pendingTask');
            sendMessage(pending);
          }
        }
      });
      initPermission();
    }
    return () => { disposePermission(); };
  }, [workspacePath, initialize, initPermission, disposePermission, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, timelineEntries]);

  if (!isAvailable && initializedRef.current) {
    return (
      <DependencySetup
        onReady={() => {
          initializedRef.current = false;
          initialize(workspacePath);
        }}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-full border-l bg-background"
      role="log"
      aria-label="Agent conversation"
      aria-live="polite"
    >
      <AgentStatusBar status={status} onStop={stopAgent} currentTool={currentTool} />

      <div className="flex-1 relative overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && timelineEntries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              开始与 NoCodeFlow AI 对话
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} data-message-id={msg.id}>
                  <MessageBubble message={msg} highlight={highlightId === msg.id} />
                </div>
              ))}
            </>
          )}
        </div>

        {userMessages.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-3 right-3 h-7 w-7 z-20 opacity-70 hover:opacity-100"
            onClick={() => setShowHistory(!showHistory)}
            title="历史记录"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h10M2 7h10M2 10h10" />
            </svg>
          </Button>
        )}

        {showHistory && (
          <MessageHistory
            messages={userMessages}
            onJump={scrollToMessage}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>

      {timelineEntries.length > 0 && messages.length > 0 && (
        <div className="border-t max-h-[200px] overflow-y-auto px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Agent Timeline
          </p>
          <TimelinePanel />
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={status === 'running'} />

      <PermissionDialog />
    </div>
  );
}
