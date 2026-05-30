import { Button } from '@/components/ui/button';
import type { AgentMessage } from '@/stores/agent';

interface MessageHistoryProps {
  messages: AgentMessage[];
  onJump: (id: string) => void;
  onClose: () => void;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function MessageHistory({ messages, onJump, onClose }: MessageHistoryProps) {
  return (
    <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-sm font-medium">历史记录</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            暂无对话记录
          </div>
        ) : (
          messages.map((msg) => (
            <button
              key={msg.id}
              className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors border-b border-border/50"
              onClick={() => onJump(msg.id)}
            >
              <p className="text-sm truncate">{msg.content.slice(0, 40)}</p>
              <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
