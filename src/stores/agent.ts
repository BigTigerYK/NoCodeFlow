import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { AgentOutputEvent } from '@shared/types/agent';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: number;
  rawEvents?: unknown[];
}

interface AgentState {
  status: 'idle' | 'starting' | 'running' | 'error' | 'completed';
  isAvailable: boolean;
  cliVersion: string | null;
  messages: AgentMessage[];
  currentInput: string;

  initialize: (workspacePath: string) => Promise<boolean>;
  sendMessage: (message: string) => Promise<void>;
  stopAgent: () => Promise<void>;
  resetSession: () => void;
  setCurrentInput: (input: string) => void;

  _addMessage: (msg: AgentMessage) => void;
  _updateStatus: (status: AgentState['status']) => void;
  _appendAssistantContent: (content: string) => void;
  _handleOutputEvent: (event: AgentOutputEvent) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  status: 'idle',
  isAvailable: false,
  cliVersion: null,
  messages: [],
  currentInput: '',

  initialize: async (workspacePath: string) => {
    const result = await window.api.invoke(IPC_CHANNELS.AGENT_START, {
      workspacePath,
      permissionMode: 'default',
    }) as { success: boolean; version?: string; error?: string };

    if (result.success) {
      set({ isAvailable: true, cliVersion: result.version ?? null });

      window.api.on(IPC_CHANNELS.AGENT_OUTPUT, (event: unknown) => {
        get()._handleOutputEvent(event as AgentOutputEvent);
      });

      window.api.on(IPC_CHANNELS.AGENT_STATUS, (data: unknown) => {
        const { status } = data as { status: string };
        get()._updateStatus(status as AgentState['status']);
      });

      return true;
    } else {
      set({ isAvailable: false });
      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: `Claude CLI 不可用：${result.error}`,
        timestamp: Date.now(),
      });
      return false;
    }
  },

  sendMessage: async (message: string) => {
    if (!message.trim()) return;

    get()._addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });
    set({ currentInput: '' });

    get()._addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      rawEvents: [],
    });

    await window.api.invoke(IPC_CHANNELS.AGENT_SEND, message);
  },

  stopAgent: async () => {
    await window.api.invoke(IPC_CHANNELS.AGENT_STOP);
  },

  resetSession: () => {
    set({ messages: [], status: 'idle' });
  },

  setCurrentInput: (input: string) => set({ currentInput: input }),

  _addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  _updateStatus: (status) => set({ status }),

  _appendAssistantContent: (content) => set((s) => {
    const msgs = [...s.messages];
    const last = msgs[msgs.length - 1];
    if (last && last.role === 'assistant') {
      msgs[msgs.length - 1] = { ...last, content: last.content + content };
    }
    return { messages: msgs };
  }),

  _handleOutputEvent: (event: AgentOutputEvent) => {
    const { type, data } = event;
    switch (type) {
      case 'text':
        if (data.delta?.type === 'text_delta' && typeof data.delta.text === 'string') {
          get()._appendAssistantContent(data.delta.text);
        }
        break;
      case 'tool_use':
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `\`tool_use\` ${data.name ?? ''}`,
          timestamp: Date.now(),
        });
        break;
      case 'error':
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'error',
          content: data.error || data.message || JSON.stringify(data),
          timestamp: Date.now(),
        });
        break;
      case 'result':
        break;
      case 'tool_result':
      case 'system':
        break;
    }
  },
}));
