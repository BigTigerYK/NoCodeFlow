export type AgentStatus = 'idle' | 'starting' | 'running' | 'error' | 'completed';

export interface AgentOutputEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'result' | 'system';
  data: unknown;
  timestamp: number;
}

export interface AgentAdapter {
  start(task: string, workspacePath: string): Promise<void>;
  send(message: string): Promise<void>;
  stop(): Promise<void>;
  getStatus(): AgentStatus;
  onEvent(callback: (event: AgentOutputEvent) => void): () => void;
}
