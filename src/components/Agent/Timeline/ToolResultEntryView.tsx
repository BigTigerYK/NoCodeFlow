import { AlertCircle, CheckCircle } from 'lucide-react';
import type { ToolResultEntry } from '@/lib/output-parser';

interface ToolResultEntryViewProps {
  entry: ToolResultEntry;
}

export function ToolResultEntryView({ entry }: ToolResultEntryViewProps) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground pl-6">
      {entry.isError ? (
        <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
      ) : (
        <CheckCircle className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
      )}
      <span className="truncate">
        {entry.toolName && `${entry.toolName}: `}
        {entry.isError ? '执行失败' : '执行完成'}
      </span>
    </div>
  );
}
