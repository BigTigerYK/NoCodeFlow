import type { AgentStatus, AgentOutputEvent } from '@shared/types/agent';

export type { AgentStatus, AgentOutputEvent };

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
