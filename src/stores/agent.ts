import { create } from 'zustand';
import { IPC_CHANNELS } from '@shared/types/ipc';
import type { AgentOutputEvent, TokenUsage } from '@shared/types/agent';
import type { AppConfig } from '@shared/types/config';
import type { DepCheckResult, InstallResult } from '@shared/types/setup';
import { agentEventBus } from '@/lib/event-bus';
import { TimelineBuilder } from '@/lib/timeline-builder';
import type { TimelineEntry, ToolUseEntry, ToolResultEntry, ResultEntry } from '@/lib/output-parser';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error' | 'tool_use' | 'result';
  content: string;
  timestamp: number;
  rawEvents?: unknown[];
  toolEntry?: ToolUseEntry;
  toolResult?: ToolResultEntry;
  resultEntry?: ResultEntry;
  usage?: TokenUsage;
}

interface AgentState {
  status: 'idle' | 'starting' | 'running' | 'error' | 'completed';
  isAvailable: boolean;
  isInstalling: boolean;
  cliVersion: string | null;
  messages: AgentMessage[];
  currentInput: string;
  timelineEntries: readonly TimelineEntry[];

  _outputUnsub: (() => void) | null;
  _statusUnsub: (() => void) | null;
  _timelineBuilder: TimelineBuilder | null;

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
  isInstalling: false,
  cliVersion: null,
  messages: [],
  currentInput: '',
  timelineEntries: [],
  _outputUnsub: null,
  _statusUnsub: null,
  _timelineBuilder: null,

  initialize: async (workspacePath: string) => {
    // Clean up previous listeners
    const { _outputUnsub, _statusUnsub } = get();
    _outputUnsub?.();
    _statusUnsub?.();

    // Step 1: Check dependencies
    const deps = await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS) as DepCheckResult;

    // Step 1.5: If shell is not available on Windows, auto-install Git for Windows
    if (!deps.shellAvailable) {
      set({ isInstalling: true });
      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: '正在安装 Git for Windows（Claude Code 依赖），请稍候...',
        timestamp: Date.now(),
      });

      const unsubShell = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, () => {});
      const shellResult = await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_SHELL) as InstallResult;
      unsubShell();
      set({ isInstalling: false });

      if (!shellResult.success) {
        set({ isAvailable: false, _outputUnsub: null, _statusUnsub: null });
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'error',
          content: `Git for Windows 安装失败：${shellResult.error ?? '未知错误'}`,
          timestamp: Date.now(),
        });
        return false;
      }

      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Git for Windows 安装完成',
        timestamp: Date.now(),
      });

      // 重新检测依赖
      const recheck = await window.api.invoke(IPC_CHANNELS.SETUP_CHECK_DEPS) as DepCheckResult;
      if (!recheck.shellAvailable) {
        set({ isAvailable: false, _outputUnsub: null, _statusUnsub: null });
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'error',
          content: 'Git for Windows 安装后仍未检测到，请重启应用后重试',
          timestamp: Date.now(),
        });
        return false;
      }
    }

    // Step 2: If CLI is not available, auto-install
    if (!deps.cliAvailable) {
      set({ isInstalling: true });
      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: '正在自动安装 Claude Code CLI，请稍候...',
        timestamp: Date.now(),
      });

      const unsub = window.api.on(IPC_CHANNELS.SETUP_PROGRESS, () => {});
      const installResult = await window.api.invoke(IPC_CHANNELS.SETUP_INSTALL_CLI) as InstallResult;
      unsub();
      set({ isInstalling: false });

      if (!installResult.success) {
        set({ isAvailable: false, _outputUnsub: null, _statusUnsub: null });
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'error',
          content: `Claude Code CLI 安装失败：${installResult.error ?? '未知错误'}`,
          timestamp: Date.now(),
        });
        return false;
      }

      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Claude Code CLI 安装完成，正在启动...',
        timestamp: Date.now(),
      });
    }

    // Step 3: Initialize agent (main process auto-detects adapter type)
    const config = await window.api.invoke(IPC_CHANNELS.CONFIG_GET_ALL) as AppConfig;
    const permissionMode = config.permissions?.mode ?? 'default';

    await window.api.invoke(IPC_CHANNELS.PERMISSION_INIT, workspacePath);

    const result = await window.api.invoke(IPC_CHANNELS.AGENT_START, {
      workspacePath,
      permissionMode,
    }) as { success: boolean; version?: string; error?: string };

    if (result.success) {
      const builder = new TimelineBuilder();
      set({ isAvailable: true, cliVersion: result.version ?? null, _timelineBuilder: builder, timelineEntries: [] });

      const unsubOutput = window.api.on(IPC_CHANNELS.AGENT_OUTPUT, (event: unknown) => {
        get()._handleOutputEvent(event as AgentOutputEvent);
      });

      const unsubStatus = window.api.on(IPC_CHANNELS.AGENT_STATUS, (data: unknown) => {
        const { status } = data as { status: string };
        get()._updateStatus(status as AgentState['status']);
      });

      set({ _outputUnsub: unsubOutput, _statusUnsub: unsubStatus });

      return true;
    } else {
      set({ isAvailable: false, _outputUnsub: null, _statusUnsub: null });
      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'error',
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

    // Create assistant message BEFORE sending so streaming events can append to it
    get()._addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      rawEvents: [],
    });
    set({ currentInput: '' });

    const result = await window.api.invoke(IPC_CHANNELS.AGENT_SEND, message) as { success: boolean; error?: string };

    if (!result.success) {
      get()._addMessage({
        id: crypto.randomUUID(),
        role: 'error',
        content: result.error ?? 'Failed to send message',
        timestamp: Date.now(),
      });
    }
  },

  stopAgent: async () => {
    await window.api.invoke(IPC_CHANNELS.AGENT_STOP);
  },

  resetSession: () => {
    get()._timelineBuilder?.reset();
    set({ messages: [], status: 'idle', timelineEntries: [] });
  },

  setCurrentInput: (input: string) => set({ currentInput: input }),

  _addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  _updateStatus: (status) => set({ status }),

  _appendAssistantContent: (content) => set((s) => {
    const messages = s.messages;
    const lastIdx = messages.length - 1;
    const last = messages[lastIdx];
    if (last && last.role === 'assistant') {
      const updated = { ...last, content: last.content + content };
      const newMessages = messages.slice();
      newMessages[lastIdx] = updated;
      return { messages: newMessages };
    }
    return s;
  }),

  _handleOutputEvent: (event: AgentOutputEvent) => {
    // Emit to Event Bus for multi-consumer support (Timeline, etc.)
    agentEventBus.emit('agent:output', event);

    // Update timeline
    const builder = get()._timelineBuilder;
    if (builder) {
      builder.handleEvent(event);
      set({ timelineEntries: builder.getEntries() });
    }

    const { type, data } = event;
    switch (type) {
      case 'text':
        if (data.delta?.type === 'text_delta' && typeof data.delta.text === 'string') {
          get()._appendAssistantContent(data.delta.text);
        }
        break;

      case 'tool_use': {
        const toolName = (data.name as string) || 'Unknown';
        const input = (typeof data.input === 'object' && data.input !== null ? data.input : {}) as Record<string, unknown>;
        const toolId = (data.id as string) || '';
        const entries = get()._timelineBuilder?.getEntries();
        const toolEntry = entries?.find(
          (e): e is ToolUseEntry => e.kind === 'tool_use' && e.toolId === toolId
        );
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'tool_use',
          content: toolEntry?.description ?? toolName,
          timestamp: Date.now(),
          toolEntry: toolEntry ?? {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'running',
            kind: 'tool_use',
            toolName,
            toolId,
            input,
            description: toolName,
          },
        });
        break;
      }

      case 'tool_result': {
        const toolUseId = (data.tool_use_id as string) || '';
        const entries = get()._timelineBuilder?.getEntries();
        const resultEntry = entries?.find(
          (e): e is ToolResultEntry => e.kind === 'tool_result' && e.toolUseId === toolUseId
        );
        // Update the matching tool_use message with the result
        set((s) => {
          const messages = s.messages;
          const idx = messages.findIndex(
            (m) => m.role === 'tool_use' && m.toolEntry?.toolId === toolUseId
          );
          if (idx >= 0) {
            const updated = [...messages];
            updated[idx] = { ...updated[idx], toolResult: resultEntry };
            return { messages: updated };
          }
          return s;
        });
        break;
      }

      case 'result':
        // Result text is already shown via assistant text events — no need to duplicate
        // Attach token usage to the last assistant message
        if (data.usage) {
          set((s) => {
            const messages = s.messages;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === 'assistant') {
                const updated = [...messages];
                updated[i] = { ...updated[i], usage: data.usage as TokenUsage };
                return { messages: updated };
              }
            }
            return s;
          });
        }
        break;

      case 'error':
        get()._addMessage({
          id: crypto.randomUUID(),
          role: 'error',
          content: data.error || data.message || JSON.stringify(data),
          timestamp: Date.now(),
        });
        break;

      case 'system':
        break;
    }
  },
}));
