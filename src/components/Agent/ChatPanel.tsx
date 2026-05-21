import { useRef, useEffect, useMemo } from 'react';
import { useAgentStore } from '@/stores/agent';
import { usePermissionStore } from '@/stores/permission';
import { AgentStatusBar } from './AgentStatus';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { AgentUnavailableNotice } from './AgentUnavailableNotice';
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
      initialize(workspacePath);
      initPermission();
    }
    return () => { disposePermission(); };
  }, [workspacePath, initialize, initPermission, disposePermission]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, timelineEntries]);

  if (!isAvailable && initializedRef.current) {
    return <AgentUnavailableNotice />;
  }

  return (
    <div
      className="flex flex-col h-full border-l bg-background"
      role="log"
      aria-label="Agent conversation"
      aria-live="polite"
    >
      <AgentStatusBar status={status} onStop={stopAgent} currentTool={currentTool} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && timelineEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            开始与 Claude Code 对话
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
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
