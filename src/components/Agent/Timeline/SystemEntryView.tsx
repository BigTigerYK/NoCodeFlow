import { Info } from 'lucide-react';
import type { SystemEntry } from '@/lib/output-parser';

interface SystemEntryViewProps {
  entry: SystemEntry;
}

export function SystemEntryView({ entry }: SystemEntryViewProps) {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="w-3 h-3 shrink-0 mt-0.5" />
      <p className="truncate">{entry.content}</p>
    </div>
  );
}
