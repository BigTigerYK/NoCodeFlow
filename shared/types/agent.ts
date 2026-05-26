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

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface ResultData {
  result?: string;
  session_id?: string;
  usage?: TokenUsage;
  [key: string]: unknown;
}

export interface SystemData {
  [key: string]: unknown;
}
