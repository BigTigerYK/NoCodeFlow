import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import type { AgentAdapter, AgentAdapterOptions } from './types';
import type { AgentStatus, AgentOutputEvent } from '@shared/types/agent';
import { AGENT_DEFAULT_TIMEOUT_MS, AGENT_DEFAULT_MAX_TURNS, AGENT_CLI_VERSION_TIMEOUT_MS, AGENT_SIGKILL_DELAY_MS } from '@shared/constants';

function getClaudeCommand(): string {
  return platform() === 'win32' ? 'claude.cmd' : 'claude';
}

export class ClaudeCodeAdapter implements AgentAdapter {
  readonly name = 'Claude Code (CLI)';
  private sessionId: string | null = null;
  private currentProcess: ChildProcess | null = null;
  private status: AgentStatus = 'idle';
  private options: Required<AgentAdapterOptions>;
  private onOutputCallback: ((event: AgentOutputEvent) => void) | null = null;
  private onStatusCallback: ((status: AgentStatus) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private killTimer: ReturnType<typeof setTimeout> | null = null;
  private stoppedByUser = false;
  private sendReject: ((reason: Error) => void) | null = null;

  constructor(options: AgentAdapterOptions) {
    this.options = {
      workspacePath: options.workspacePath,
      model: options.model ?? '',
      maxTurns: options.maxTurns ?? AGENT_DEFAULT_MAX_TURNS,
      timeoutMs: options.timeoutMs ?? AGENT_DEFAULT_TIMEOUT_MS,
      apiBaseUrl: options.apiBaseUrl ?? '',
      apiKey: options.apiKey ?? '',
    };
  }

  private buildEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    if (this.options.apiBaseUrl) env.ANTHROPIC_BASE_URL = this.options.apiBaseUrl;
    if (this.options.apiKey) env.ANTHROPIC_API_KEY = this.options.apiKey;
    return env;
  }

  private setStatus(s: AgentStatus) {
    this.status = s;
    this.onStatusCallback?.(s);
  }

  private emitOutput(event: AgentOutputEvent) {
    this.onOutputCallback?.(event);
  }

  onOutput(cb: (event: AgentOutputEvent) => void) { this.onOutputCallback = cb; }
  onStatusChange(cb: (status: AgentStatus) => void) { this.onStatusCallback = cb; }
  onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }

  async checkAvailability() {
    return new Promise<{ available: boolean; version?: string; error?: string }>((resolve) => {
      const proc = spawn(getClaudeCommand(), ['--version'], { timeout: AGENT_CLI_VERSION_TIMEOUT_MS, env: this.buildEnv() });
      let stdout = '';
      proc.stdout?.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        resolve(code === 0 ? { available: true, version: stdout.trim() } : { available: false, error: `exit code ${code}` });
      });
      proc.on('error', (err) => {
        resolve({ available: false, error: `Claude CLI not found: ${err.message}` });
      });
    });
  }

  async send(message: string): Promise<void> {
    if (this.status === 'running') throw new Error('Agent is already running');
    this.stoppedByUser = false;
    this.setStatus('starting');

    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];
    if (this.options.model) {
      args.push('--model', this.options.model);
    }

    this.currentProcess = spawn(getClaudeCommand(), args, {
      cwd: this.options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: this.buildEnv(),
    });

    this.currentProcess.stdin?.write(message);
    this.currentProcess.stdin?.end();
    this.setStatus('running');

    let outputBuffer = '';

    this.currentProcess.stdout?.on('data', (data: Buffer) => {
      if (this.stoppedByUser) return;
      outputBuffer += data.toString();
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          this.handleStreamEvent(JSON.parse(line));
        } catch {
          this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: line } }, timestamp: Date.now() });
        }
      }
    });

    this.currentProcess.stderr?.on('data', (data: Buffer) => {
      if (this.stoppedByUser) return;
      const msg = data.toString().trim();
      if (!msg || msg.startsWith('Warning:') || msg.includes('proceeding without')) return;
      this.emitOutput({ type: 'error', data: { error: msg }, timestamp: Date.now() });
    });

    return new Promise<void>((resolve, reject) => {
      this.sendReject = reject;

      const timeout = setTimeout(() => {
        this.sendReject = null;
        this.stop();
        reject(new Error('Agent execution timed out'));
      }, this.options.timeoutMs);

      this.currentProcess!.on('close', (code) => {
        clearTimeout(timeout);
        this.sendReject = null;

        // User clicked stop — discard everything silently
        if (this.stoppedByUser) {
          outputBuffer = '';
          this.currentProcess = null;
          resolve();
          return;
        }

        outputBuffer = '';

        if (code === 0) { this.setStatus('completed'); resolve(); }
        else { this.setStatus('error'); reject(new Error(`Agent exited with code ${code}`)); }
        this.currentProcess = null;
      });

      this.currentProcess!.on('error', (err) => {
        clearTimeout(timeout);
        this.sendReject = null;
        if (this.stoppedByUser) {
          this.currentProcess = null;
          resolve();
          return;
        }
        this.setStatus('error');
        this.currentProcess = null;
        reject(err);
      });
    });
  }

  stop() {
    this.stoppedByUser = true;

    // Unblock the pending send() promise so AGENT_SEND IPC can return
    if (this.sendReject) {
      const reject = this.sendReject;
      this.sendReject = null;
      reject(new Error('Agent stopped by user'));
    }

    if (this.killTimer) { clearTimeout(this.killTimer); this.killTimer = null; }
    if (this.currentProcess && !this.currentProcess.killed) {
      this.currentProcess.kill('SIGTERM');
      this.killTimer = setTimeout(() => {
        if (this.currentProcess && !this.currentProcess.killed) this.currentProcess.kill('SIGKILL');
      }, AGENT_SIGKILL_DELAY_MS);
    }
    this.setStatus('idle');
  }

  private handleStreamEvent(json: any) {
    if (json.session_id && typeof json.session_id === 'string') {
      this.sessionId = json.session_id;
    }

    const ts = Date.now();
    switch (json.type) {
      case 'text':
      case 'content_block_delta':
        if (json.delta?.text || json.delta?.type === 'text_delta') {
          this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: json.delta.text || '' } }, timestamp: ts });
        }
        break;

      case 'assistant': {
        const content = json.message?.content;
        if (!Array.isArray(content)) break;
        for (const block of content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: block.text } }, timestamp: ts });
          } else if (block.type === 'tool_use') {
            this.emitOutput({ type: 'tool_use', data: { id: block.id, name: block.name, input: block.input }, timestamp: ts });
          }
          // thinking blocks are ignored
        }
        break;
      }

      case 'tool_use':
        this.emitOutput({ type: 'tool_use', data: { id: json.id, name: json.name, input: json.input }, timestamp: ts });
        break;
      case 'tool_result':
        this.emitOutput({ type: 'tool_result', data: { tool_use_id: json.tool_use_id, content: json.content, is_error: json.is_error }, timestamp: ts });
        break;
      case 'error':
        this.emitOutput({ type: 'error', data: { error: json.error?.message || json.message || 'Unknown error' }, timestamp: ts });
        break;
      case 'result':
        this.emitOutput({ type: 'result', data: { result: json.result || json.content, duration_ms: json.duration_ms, num_turns: json.num_turns }, timestamp: ts });
        break;
      case 'system':
        this.emitOutput({ type: 'system', data: { subtype: json.subtype, session_id: json.session_id, model: json.model, tools: json.tools }, timestamp: ts });
        break;
      default:
        // Ignore unknown event types instead of dumping raw JSON as chat text
        break;
    }
  }
}
