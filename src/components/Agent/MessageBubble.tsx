import { memo } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolUseEntryView } from './Timeline/ToolUseEntryView';
import { ResultEntryView } from './Timeline/ResultEntryView';
import type { AgentMessage } from '@/stores/agent';

interface MessageBubbleProps {
  message: AgentMessage;
  highlight?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, highlight }: MessageBubbleProps) {
  const { role } = message;

  // Tool use — rendered as a Timeline card
  if (role === 'tool_use' && message.toolEntry) {
    return (
      <div className={cn('my-1', highlight && 'ring-2 ring-primary/50 rounded-lg transition-all duration-300')}>
        <ToolUseEntryView entry={message.toolEntry} result={message.toolResult} />
      </div>
    );
  }

  // Final result
  if (role === 'result' && message.resultEntry) {
    return (
      <div className={cn('my-1', highlight && 'ring-2 ring-primary/50 rounded-lg transition-all duration-300')}>
        <ResultEntryView entry={message.resultEntry} />
      </div>
    );
  }

  const isUser = role === 'user';
  const isError = role === 'error';
  const isSystem = role === 'system';

  return (
    <div className={cn(highlight && 'ring-2 ring-primary/50 rounded-lg transition-all duration-300')}>
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
      {!isUser && !isError && !isSystem && message.usage && (
        <div className="flex justify-start mt-0.5">
          <span className="text-xs text-muted-foreground pl-1">
            Tokens: 入 {message.usage.input_tokens.toLocaleString()} / 出 {message.usage.output_tokens.toLocaleString()}
            {message.usage.cache_read_input_tokens ? ` / 缓存 ${message.usage.cache_read_input_tokens.toLocaleString()}` : ''}
          </span>
        </div>
      )}
    </div>
  );
});
