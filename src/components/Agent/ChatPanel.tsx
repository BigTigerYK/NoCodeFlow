import { useRef, useEffect } from 'react';
import { useAgentStore } from '@/stores/agent';
import { AgentStatusBar } from './AgentStatus';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { AgentUnavailableNotice } from './AgentUnavailableNotice';

interface ChatPanelProps {
  workspacePath: string;
}

export function ChatPanel({ workspacePath }: ChatPanelProps) {
  const { messages, status, isAvailable, sendMessage, stopAgent, initialize } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && workspacePath) {
      initializedRef.current = true;
      initialize(workspacePath);
    }
  }, [workspacePath, initialize]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isAvailable && initializedRef.current) {
    return <AgentUnavailableNotice />;
  }

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <AgentStatusBar status={status} onStop={stopAgent} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            开始与 Claude Code 对话
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>
      <ChatInput onSend={sendMessage} disabled={status === 'running'} />
    </div>
  );
}
