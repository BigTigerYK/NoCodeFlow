import { ToolUseEntryView } from './ToolUseEntryView';
import { ToolResultEntryView } from './ToolResultEntryView';
import { TextEntryView } from './TextEntryView';
import { ResultEntryView } from './ResultEntryView';
import { ErrorEntryView } from './ErrorEntryView';
import { SystemEntryView } from './SystemEntryView';
import type { TimelineEntry as TimelineEntryType } from '@/lib/output-parser';

interface TimelineEntryProps {
  entry: TimelineEntryType;
  toolResult?: Extract<TimelineEntryType, { kind: 'tool_result' }>;
}

export function TimelineEntry({ entry, toolResult }: TimelineEntryProps) {
  switch (entry.kind) {
    case 'text':
      return <TextEntryView entry={entry} />;
    case 'tool_use':
      return <ToolUseEntryView entry={entry} result={toolResult} />;
    case 'tool_result':
      return <ToolResultEntryView entry={entry} />;
    case 'result':
      return <ResultEntryView entry={entry} />;
    case 'error':
      return <ErrorEntryView entry={entry} />;
    case 'system':
      return <SystemEntryView entry={entry} />;
    default:
      return null;
  }
}
