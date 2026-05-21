export type AgentStatus = 'idle' | 'starting' | 'running' | 'error' | 'completed';

export type AgentOutputEvent =
  | { type: 'text'; data: TextDeltaData; timestamp: number }
  | { type: 'tool_use'; data: ToolUseData; timestamp: number }
  | { type: 'tool_result'; data: ToolResultData; timestamp: number }
  | { type: 'error'; data: ErrorData; timestamp: number }
  | { type: 'result'; data: ResultData; timestamp: number }
  | { type: 'system'; data: SystemData; timestamp: number };

export interface TextDeltaData {
  delta?: { type: string; text?: string };
  [key: string]: unknown;
}

export interface ToolUseData {
  id?: string;
  name?: string;
  input?: unknown;
  [key: string]: unknown;
}

export interface ToolResultData {
  tool_use_id?: string;
  content?: unknown;
  [key: string]: unknown;
}

export interface ErrorData {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ResultData {
  result?: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface SystemData {
  [key: string]: unknown;
}
