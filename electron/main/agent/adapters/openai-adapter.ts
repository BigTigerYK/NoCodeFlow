import type { AgentAdapter, AgentAdapterOptions } from './types';
import type { AgentStatus, AgentOutputEvent } from '@shared/types/agent';

export class OpenAIAdapter implements AgentAdapter {
  readonly name = 'OpenAI';
  private options: Required<AgentAdapterOptions>;
  private onOutputCallback: ((event: AgentOutputEvent) => void) | null = null;
  private onStatusCallback: ((status: AgentStatus) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private aborted = false;

  constructor(options: AgentAdapterOptions) {
    this.options = {
      workspacePath: options.workspacePath,
      model: options.model ?? 'gpt-4o',
      maxTurns: options.maxTurns ?? 10,
      timeoutMs: options.timeoutMs ?? 120000,
      apiBaseUrl: options.apiBaseUrl ?? 'https://api.openai.com',
      apiKey: options.apiKey ?? '',
    };
  }

  private setStatus(s: AgentStatus) { this.onStatusCallback?.(s); }
  private emitOutput(event: AgentOutputEvent) { this.onOutputCallback?.(event); }

  onOutput(cb: (event: AgentOutputEvent) => void) { this.onOutputCallback = cb; }
  onStatusChange(cb: (status: AgentStatus) => void) { this.onStatusCallback = cb; }
  onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }

  async checkAvailability() {
    if (!this.options.apiKey) return { available: false, error: 'No API key configured' };
    try {
      const resp = await fetch(`${this.options.apiBaseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${this.options.apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok ? { available: true } : { available: false, error: `HTTP ${resp.status}` };
    } catch (err: any) {
      return { available: false, error: err.message };
    }
  }

  async send(message: string): Promise<void> {
    this.aborted = false;
    this.setStatus('starting');
    this.setStatus('running');

    const baseUrl = this.options.apiBaseUrl.replace(/\/$/, '');

    try {
      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [{ role: 'user', content: message }],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`API error ${resp.status}: ${errBody}`);
      }

      const data = await resp.json() as any;
      const ts = Date.now();
      const text = data.choices?.[0]?.message?.content || '';

      this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text } }, timestamp: ts });
      this.emitOutput({ type: 'result', data: { result: text, duration_ms: 0, num_turns: 1 }, timestamp: ts });

      this.setStatus('completed');
    } catch (err: any) {
      if (this.aborted) { this.setStatus('idle'); return; }
      this.emitOutput({ type: 'error', data: { error: err.message }, timestamp: Date.now() });
      this.setStatus('error');
      this.onErrorCallback?.(err);
    }
  }

  stop() {
    this.aborted = true;
    this.setStatus('idle');
  }
}
