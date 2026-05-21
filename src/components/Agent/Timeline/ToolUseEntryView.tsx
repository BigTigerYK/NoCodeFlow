import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolIcon } from './ToolIcon';
import { StatusBadge } from './StatusBadge';
import type { ToolUseEntry, ToolResultEntry } from '@/lib/output-parser';

interface ToolUseEntryViewProps {
  entry: ToolUseEntry;
  result?: ToolResultEntry;
}

export function ToolUseEntryView({ entry, result }: ToolUseEntryViewProps) {
  const [expanded, setExpanded] = useState(false);
  const status = result ? (result.isError ? 'error' : 'completed') : entry.status;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent/50 text-left transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <ToolIcon name={entry.toolName} className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm truncate">{entry.description}</span>
        <StatusBadge status={status} />
        <ChevronRight
          className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <div className="border-t px-3 py-2 space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">输入参数</p>
            <pre className="bg-muted p-2 rounded overflow-x-auto text-xs max-h-48 overflow-y-auto">
              {JSON.stringify(entry.input, null, 2)}
            </pre>
          </div>

          {result && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                {result.isError ? '错误' : '结果'}
              </p>
              <pre
                className={cn(
                  'p-2 rounded overflow-x-auto text-xs max-h-64 overflow-y-auto whitespace-pre-wrap break-all',
                  result.isError ? 'bg-destructive/10' : 'bg-muted'
                )}
              >
                {result.content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
