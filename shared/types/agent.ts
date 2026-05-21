export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

export interface AgentEvent {
  id: string;
  type: 'read' | 'write' | 'delete' | 'execute' | 'analyze' | 'error';
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  filePath?: string;
  timestamp: number;
  detail?: string;
}

export interface AgentAdapter {
  start(task: string, workspacePath: string): Promise<void>;
  send(message: string): Promise<void>;
  stop(): Promise<void>;
  getStatus(): AgentStatus;
  onEvent(callback: (event: AgentEvent) => void): () => void;
}
