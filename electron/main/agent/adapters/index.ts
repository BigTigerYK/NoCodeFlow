import type { AgentAdapter, AgentAdapterOptions, AdapterType } from './types';
import { ClaudeCodeAdapter } from './claude-code-adapter';
import { ClaudeApiAdapter } from './claude-api-adapter';
import { OpenAIAdapter } from './openai-adapter';

export type { AgentAdapter, AgentAdapterOptions, AdapterType } from './types';
export { ClaudeCodeAdapter } from './claude-code-adapter';
export { ClaudeApiAdapter } from './claude-api-adapter';
export { OpenAIAdapter } from './openai-adapter';

export function createAdapter(type: AdapterType, options: AgentAdapterOptions): AgentAdapter {
  switch (type) {
    case 'claude-code':
      return new ClaudeCodeAdapter(options);
    case 'claude-api':
      return new ClaudeApiAdapter(options);
    case 'openai':
      return new OpenAIAdapter(options);
    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}
