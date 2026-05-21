import { useAgentStore } from '@/stores/agent';
import { TimelineEntry } from './TimelineEntry';
import type { TimelineEntry as TimelineEntryType } from '@/lib/output-parser';

function findToolResult(
  entries: readonly TimelineEntryType[],
  toolId: string
): Extract<TimelineEntryType, { kind: 'tool_result' }> | undefined {
  return entries.find(
    (e): e is Extract<TimelineEntryType, { kind: 'tool_result' }> =>
      e.kind === 'tool_result' && e.toolUseId === toolId
  );
}

export function TimelinePanel() {
  const entries = useAgentStore((s) => s.timelineEntries);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2" role="log" aria-label="Agent 执行时间线">
      {entries.map((entry) => {
        const toolResult =
          entry.kind === 'tool_use' && entry.toolId
            ? findToolResult(entries, entry.toolId)
            : undefined;
        return <TimelineEntry key={entry.id} entry={entry} toolResult={toolResult} />;
      })}
    </div>
  );
}
