import { MarkdownRenderer } from '../MarkdownRenderer';
import type { TextEntry } from '@/lib/output-parser';

interface TextEntryViewProps {
  entry: TextEntry;
}

export function TextEntryView({ entry }: TextEntryViewProps) {
  if (!entry.content) return null;

  return (
    <div className="text-sm">
      <MarkdownRenderer content={entry.content} />
    </div>
  );
}
