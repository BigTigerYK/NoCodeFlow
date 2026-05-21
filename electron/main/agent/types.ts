import type { AgentStatus, AgentOutputEvent, TextDeltaData, ToolUseData, ToolResultData, ErrorData, ResultData, SystemData } from '@shared/types/agent';

export type { AgentStatus, AgentOutputEvent, TextDeltaData, ToolUseData, ToolResultData, ErrorData, ResultData, SystemData };

export interface ClaudeAdapterOptions {
  workspacePath: string;
  model?: string;
  permissionMode?: 'default' | 'auto';
  maxTurns?: number;
  timeoutMs?: number;
  apiBaseUrl?: string;
  apiKey?: string;
}

export interface AvailabilityResult {
  available: boolean;
  version?: string;
  error?: string;
}
