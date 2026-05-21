import { useState } from 'react';
import { ChevronRight, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolIcon } from './ToolIcon';
import { StatusBadge } from './StatusBadge';
import type { ToolUseEntry, ToolResultEntry, PermissionStatus } from '@/lib/output-parser';

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
        {entry.permissionStatus && <PermissionBadge status={entry.permissionStatus} />}
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

function PermissionBadge({ status }: { status: PermissionStatus }) {
  const config: Record<PermissionStatus, { icon: typeof ShieldCheck; color: string; label: string }> = {
    auto_allowed: { icon: ShieldCheck, color: 'text-green-500', label: '自动允许' },
    confirmed: { icon: ShieldCheck, color: 'text-blue-500', label: '已确认' },
    denied: { icon: ShieldX, color: 'text-destructive', label: '已拒绝' },
    pending: { icon: ShieldAlert, color: 'text-yellow-500', label: '待确认' },
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <span className={cn('flex items-center gap-1 text-xs shrink-0', color)} title={label}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}
