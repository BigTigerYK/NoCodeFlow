import { Flag } from 'lucide-react';
import type { ResultEntry } from '@/lib/output-parser';

interface ResultEntryViewProps {
  entry: ResultEntry;
}

export function ResultEntryView({ entry }: ResultEntryViewProps) {
  if (!entry.content) return null;

  return (
    <div className="flex items-start gap-2 text-sm border-t pt-2 mt-2">
      <Flag className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-1">任务完成</p>
        <p className="whitespace-pre-wrap break-words">{entry.content}</p>
      </div>
    </div>
  );
}
