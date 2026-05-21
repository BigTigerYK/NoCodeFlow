import { AlertTriangle } from 'lucide-react';
import type { ErrorEntry } from '@/lib/output-parser';

interface ErrorEntryViewProps {
  entry: ErrorEntry;
}

export function ErrorEntryView({ entry }: ErrorEntryViewProps) {
  return (
    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="whitespace-pre-wrap break-words">{entry.message}</p>
    </div>
  );
}
