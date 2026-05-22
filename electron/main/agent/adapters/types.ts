import type { AgentStatus, AgentOutputEvent } from '@shared/types/agent';

export interface AgentAdapterOptions {
  workspacePath: string;
  model?: string;
  maxTurns?: number;
  timeoutMs?: number;
  apiBaseUrl?: string;
  apiKey?: string;
}

export interface AgentAdapter {
  readonly name: string;

  checkAvailability(): Promise<{ available: boolean; version?: string; error?: string }>;
  send(message: string): Promise<void>;
  stop(): void;
  onOutput(callback: (event: AgentOutputEvent) => void): void;
  onStatusChange(callback: (status: AgentStatus) => void): void;
  onError(callback: (error: Error) => void): void;
}

export type AdapterType = 'claude-code' | 'claude-api' | 'openai';
