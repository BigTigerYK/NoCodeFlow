# Agent 适配层

抽象 Agent 引擎接口，支持多 Agent 切换。

## 接口定义

```typescript
interface AgentAdapter {
  start(config: AgentConfig): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
  sendMessage(message: string): Promise<void>
  cancelCurrentTask(): Promise<void>
  onOutput(callback: (event: AgentEvent) => void): void
  onError(callback: (error: AgentError) => void): void
  onComplete(callback: (result: AgentResult) => void): void
}
```

## 适配器

- **ClaudeAdapter** - Claude Code CLI 适配器（MVP）
- **OpenAIAdapter** - OpenAI 适配器（V3）
- **GeminiAdapter** - Gemini 适配器（V3）
- **LocalLLMAdapter** - 本地模型适配器（V3）

## 版本

MVP 阶段实现 ClaudeAdapter。
