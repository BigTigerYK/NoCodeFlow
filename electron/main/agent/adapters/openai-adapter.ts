import type { AgentAdapter, AgentAdapterOptions } from './types';
import type { AgentStatus, AgentOutputEvent, TokenUsage } from '@shared/types/agent';

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
          stream: true,
          stream_options: { include_usage: true },
        }),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`API error ${resp.status}: ${errBody}`);
      }

      const contentType = resp.headers.get('content-type') || '';
      const ts = Date.now();
      let fullText = '';
      let usage: TokenUsage | undefined;

      if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (this.aborted) { this.setStatus('idle'); return; }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;

            const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
            try {
              const chunk = JSON.parse(jsonStr);
              const text = this.extractText(chunk);
              if (text) {
                fullText += text;
                this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text } }, timestamp: Date.now() });
              }
              if (chunk.usage) {
                usage = this.normalizeUsage(chunk.usage);
              }
            } catch { /* skip non-JSON lines */ }
          }
        }

        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed !== 'data: [DONE]') {
            const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
            try {
              const chunk = JSON.parse(jsonStr);
              const text = this.extractText(chunk);
              if (text) {
                fullText += text;
                this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text } }, timestamp: Date.now() });
              }
              if (chunk.usage) {
                usage = this.normalizeUsage(chunk.usage);
              }
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await resp.json() as any;
        fullText = this.extractText(data) || data.choices?.[0]?.message?.content || '';
        if (fullText) {
          this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: fullText } }, timestamp: ts });
        }
        if (data.usage) {
          usage = this.normalizeUsage(data.usage);
        }
      }

      this.emitOutput({ type: 'result', data: { result: fullText, duration_ms: 0, num_turns: 1, usage }, timestamp: Date.now() });
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

  private extractText(data: any): string {
    if (!data) return '';
    if (data.type === 'assistant' && data.message?.content) {
      return this.extractFromContentArray(data.message.content);
    }
    if (Array.isArray(data.content)) {
      return this.extractFromContentArray(data.content);
    }
    if (data.choices?.[0]?.message?.content) {
      const c = data.choices[0].message.content;
      return typeof c === 'string' ? c : this.extractFromContentArray(c);
    }
    return '';
  }

  private extractFromContentArray(content: any[]): string {
    if (!Array.isArray(content)) return '';
    return content
      .filter((block: any) => block.type === 'text' && block.text)
      .map((block: any) => block.text)
      .join('');
  }

  private normalizeUsage(raw: any): TokenUsage {
    return {
      input_tokens: raw.input_tokens ?? raw.prompt_tokens ?? 0,
      output_tokens: raw.output_tokens ?? raw.completion_tokens ?? 0,
    };
  }
}
