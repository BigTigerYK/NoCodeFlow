import type { AgentOutputEvent } from '@shared/types/agent';
import {
  parseOutputEvent,
  type TimelineEntry,
  type TextEntry,
  type ToolUseEntry,
  type ToolResultEntry,
} from './output-parser';

export class TimelineBuilder {
  private entries: TimelineEntry[] = [];
  private activeTextEntryId: string | null = null;
  private pendingToolUses = new Map<string, ToolUseEntry>();

  handleEvent(event: AgentOutputEvent): void {
    const entry = parseOutputEvent(event);
    if (!entry) return;

    switch (entry.kind) {
      case 'text':
        this.handleText(entry);
        break;
      case 'tool_use':
        this.handleToolUse(entry);
        break;
      case 'tool_result':
        this.handleToolResult(entry);
        break;
      case 'result':
        this.closeActiveText();
        this.entries.push(entry);
        break;
      case 'error':
        this.closeActiveText();
        this.entries.push(entry);
        break;
      case 'system':
        this.entries.push(entry);
        break;
    }
  }

  getEntries(): readonly TimelineEntry[] {
    return this.entries;
  }

  reset(): void {
    this.entries = [];
    this.activeTextEntryId = null;
    this.pendingToolUses.clear();
  }

  private handleText(entry: TextEntry): void {
    const active = this.activeTextEntry
    if (active) {
      active.content += entry.content;
      active.timestamp = entry.timestamp;
    } else {
      this.entries.push(entry);
      this.activeTextEntryId = entry.id;
    }
  }

  private handleToolUse(entry: ToolUseEntry): void {
    this.closeActiveText();
    this.pendingToolUses.set(entry.toolId, entry);
    this.entries.push(entry);
  }

  private handleToolResult(entry: ToolResultEntry): void {
    const pending = this.pendingToolUses.get(entry.toolUseId);
    if (pending) {
      entry.toolName = pending.toolName;
      pending.status = entry.isError ? 'error' : 'completed';
      this.pendingToolUses.delete(entry.toolUseId);
    }
    this.entries.push(entry);
  }

  private closeActiveText(): void {
    if (!this.activeTextEntryId) return;
    const active = this.activeTextEntry;
    if (active) {
      active.isStreaming = false;
      active.status = 'completed';
    }
    this.activeTextEntryId = null;
  }

  private get activeTextEntry(): TextEntry | undefined {
    if (!this.activeTextEntryId) return undefined;
    const entry = this.entries.find((e) => e.id === this.activeTextEntryId);
    return entry?.kind === 'text' ? entry : undefined;
  }
}
