import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { AgentMessage } from '@/stores/agent';

interface MessageBubbleProps {
  message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';
  const isSystem = message.role === 'system';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2 text-sm',
          isUser && 'bg-primary text-primary-foreground',
          isError && 'bg-destructive text-destructive-foreground',
          isSystem && 'bg-muted text-muted-foreground',
          !isUser && !isError && !isSystem && 'bg-secondary text-secondary-foreground'
        )}
      >
        {isSystem || isError ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <span className="inline-block animate-pulse">...</span>
        )}
      </div>
    </div>
  );
}
