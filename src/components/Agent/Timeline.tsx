import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronRight,
  ChevronDown,
  FileEdit,
  Terminal,
  Search,
  Globe,
  FileText,
} from 'lucide-react';
import { useAgentStore } from '@/stores/agent';
import { cn } from '@/lib/utils';
import type {
  TimelineEntry,
  ToolUseEntry,
  ToolResultEntry,
} from '@/lib/output-parser';

function ToolIcon({ toolName, className }: { toolName: string; className?: string }) {
  const iconClass = cn('h-3.5 w-3.5', className);
  switch (toolName) {
    case 'Read':
      return <FileText className={iconClass} />;
    case 'Write':
    case 'Edit':
      return <FileEdit className={iconClass} />;
    case 'Bash':
      return <Terminal className={iconClass} />;
    case 'Glob':
    case 'Grep':
      return <Search className={iconClass} />;
    case 'WebFetch':
    case 'WebSearch':
      return <Globe className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function ToolUseItem({ entry, result }: { entry: ToolUseEntry; result?: ToolResultEntry }) {
  const [expanded, setExpanded] = useState(false);
  const status = result?.isError ? 'error' : entry.status;

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left py-1.5 px-1 rounded-sm hover:bg-muted/50 transition-colors"
      >
        <StatusIcon status={status} />
        <ToolIcon toolName={entry.toolName} className="text-muted-foreground" />
        <span className="text-sm flex-1 truncate">{entry.description}</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {expanded && (
        <div className="ml-8 mt-1 mb-2 space-y-2">
          {/* Input details */}
          {entry.input && Object.keys(entry.input).length > 0 && (
            <div className="rounded-md bg-muted/50 p-2 text-xs font-mono">
              {entry.input.file_path != null && (
                <div className="text-muted-foreground">
                  <span className="text-foreground/60">文件：</span>
                  <span className="text-code">{String(entry.input.file_path)}</span>
                </div>
              )}
              {entry.input.command != null && (
                <div className="text-muted-foreground">
                  <span className="text-foreground/60">命令：</span>
                  <span className="text-code">{String(entry.input.command)}</span>
                </div>
              )}
              {entry.input.pattern != null && (
                <div className="text-muted-foreground">
                  <span className="text-foreground/60">模式：</span>
                  <span className="text-code">{String(entry.input.pattern)}</span>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={cn(
                'rounded-md p-2 text-xs font-mono max-h-32 overflow-auto',
                result.isError ? 'bg-red-500/8 text-red-400' : 'bg-muted/50 text-muted-foreground'
              )}
            >
              {result.content.slice(0, 500)}
              {result.content.length > 500 && '...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErrorItem({ entry }: { entry: TimelineEntry & { kind: 'error' } }) {
  return (
    <div className="flex items-start gap-2 py-1.5 px-1">
      <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <span className="text-sm text-red-400 break-all">{entry.message}</span>
    </div>
  );
}

export function TimelinePanel() {
  const { timelineEntries } = useAgentStore();

  if (timelineEntries.length === 0) return null;

  // Build a map of toolUseId -> ToolResultEntry for quick lookup
  const resultMap = new Map<string, ToolResultEntry>();
  for (const entry of timelineEntries) {
    if (entry.kind === 'tool_result') {
      resultMap.set(entry.toolUseId, entry);
    }
  }

  // Only show tool_use and error entries (skip text, system, and result — result is obvious from assistant response)
  const displayEntries = timelineEntries.filter(
    (e) => e.kind === 'tool_use' || e.kind === 'error'
  );

  if (displayEntries.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {displayEntries.map((entry) => {
        switch (entry.kind) {
          case 'tool_use':
            return (
              <ToolUseItem
                key={entry.id}
                entry={entry}
                result={resultMap.get(entry.toolId)}
              />
            );
          case 'error':
            return <ErrorItem key={entry.id} entry={entry} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
