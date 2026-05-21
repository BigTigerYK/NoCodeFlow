import type { AgentOutputEvent } from '@shared/types/agent';

// ── Timeline Entry Types ──

interface TimelineEntryBase {
  id: string;
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface TextEntry extends TimelineEntryBase {
  kind: 'text';
  content: string;
  isStreaming: boolean;
}

export type PermissionStatus = 'auto_allowed' | 'confirmed' | 'denied' | 'pending';

export interface ToolUseEntry extends TimelineEntryBase {
  kind: 'tool_use';
  toolName: string;
  toolId: string;
  input: Record<string, unknown>;
  description: string;
  permissionStatus?: PermissionStatus;
}

export interface ToolResultEntry extends TimelineEntryBase {
  kind: 'tool_result';
  toolUseId: string;
  toolName: string;
  content: string;
  isError: boolean;
}

export interface ResultEntry extends TimelineEntryBase {
  kind: 'result';
  content: string;
  sessionId?: string;
}

export interface SystemEntry extends TimelineEntryBase {
  kind: 'system';
  content: string;
}

export interface ErrorEntry extends TimelineEntryBase {
  kind: 'error';
  message: string;
}

export type TimelineEntry =
  | TextEntry
  | ToolUseEntry
  | ToolResultEntry
  | ResultEntry
  | SystemEntry
  | ErrorEntry;

// ── Tool Description ──

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  Read: '读取文件',
  Write: '写入文件',
  Edit: '编辑文件',
  Bash: '执行命令',
  Glob: '搜索文件',
  Grep: '搜索内容',
  WebFetch: '获取网页',
  WebSearch: '搜索网络',
  Agent: '调用子 Agent',
};

export function buildToolDescription(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
      return `读取 ${input.file_path || '文件'}`;
    case 'Write':
      return `写入 ${input.file_path || '文件'}`;
    case 'Edit':
      return `编辑 ${input.file_path || '文件'}`;
    case 'Bash':
      return `执行 ${input.command || '命令'}`;
    case 'Glob':
      return `搜索 ${input.pattern || '文件'}`;
    case 'Grep':
      return `搜索 "${input.pattern || ''}"`;
    default:
      return TOOL_DISPLAY_NAMES[toolName] || toolName;
  }
}

// ── Helpers ──

function makeId(): string {
  return crypto.randomUUID();
}

function toStringContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return JSON.stringify(value);
}

function isToolResultError(content: unknown): boolean {
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>;
    return obj.is_error === true || obj.isError === true;
  }
  return false;
}

function coerceInput(input: unknown): Record<string, unknown> {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

// ── Parser ──

export function parseOutputEvent(event: AgentOutputEvent): TimelineEntry | null {
  const { type, data, timestamp } = event;

  switch (type) {
    case 'text': {
      const delta = data.delta;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        return {
          id: makeId(),
          timestamp,
          status: 'running',
          kind: 'text',
          content: delta.text,
          isStreaming: true,
        };
      }
      return null;
    }

    case 'tool_use': {
      const toolName = (data.name as string) || 'Unknown';
      const input = coerceInput(data.input);
      return {
        id: makeId(),
        timestamp,
        status: 'running',
        kind: 'tool_use',
        toolName,
        toolId: (data.id as string) || '',
        input,
        description: buildToolDescription(toolName, input),
      };
    }

    case 'tool_result': {
      const content = toStringContent(data.content);
      return {
        id: makeId(),
        timestamp,
        status: 'completed',
        kind: 'tool_result',
        toolUseId: (data.tool_use_id as string) || '',
        toolName: '',
        content,
        isError: isToolResultError(data.content),
      };
    }

    case 'result':
      return {
        id: makeId(),
        timestamp,
        status: 'completed',
        kind: 'result',
        content: toStringContent(data.result),
        sessionId: data.session_id as string | undefined,
      };

    case 'error':
      return {
        id: makeId(),
        timestamp,
        status: 'error',
        kind: 'error',
        message: (data.message as string) || (data.error as string) || JSON.stringify(data),
      };

    case 'system':
      return {
        id: makeId(),
        timestamp,
        status: 'completed',
        kind: 'system',
        content: typeof data === 'string' ? data : JSON.stringify(data),
      };

    default:
      return null;
  }
}
