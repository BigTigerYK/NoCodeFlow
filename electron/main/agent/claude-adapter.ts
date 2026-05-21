import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import { AGENT_DEFAULT_TIMEOUT_MS, AGENT_DEFAULT_MAX_TURNS, AGENT_CLI_VERSION_TIMEOUT_MS, AGENT_SIGKILL_DELAY_MS } from '@shared/constants';

function getClaudeCommand(): string {
  return platform() === 'win32' ? 'claude.cmd' : 'claude';
}
import type { AgentStatus, AgentOutputEvent, TextDeltaData, ToolUseData, ToolResultData, ErrorData, ResultData, SystemData, ClaudeAdapterOptions, AvailabilityResult } from './types';

export class ClaudeAdapter {
  private sessionId: string | null = null;
  private currentProcess: ChildProcess | null = null;
  private status: AgentStatus = 'idle';
  private options: Required<ClaudeAdapterOptions>;

  private onOutputCallback: ((event: AgentOutputEvent) => void) | null = null;
  private onStatusCallback: ((status: AgentStatus) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor(options: ClaudeAdapterOptions) {
    this.options = {
      workspacePath: options.workspacePath,
      model: options.model ?? '',
      permissionMode: options.permissionMode ?? 'default',
      maxTurns: options.maxTurns ?? AGENT_DEFAULT_MAX_TURNS,
      timeoutMs: options.timeoutMs ?? AGENT_DEFAULT_TIMEOUT_MS,
      apiBaseUrl: options.apiBaseUrl ?? '',
      apiKey: options.apiKey ?? '',
    };
  }

  private buildEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    if (this.options.apiBaseUrl) {
      env.ANTHROPIC_BASE_URL = this.options.apiBaseUrl;
    }
    if (this.options.apiKey) {
      env.ANTHROPIC_API_KEY = this.options.apiKey;
    }
    return env;
  }

  async checkAvailability(): Promise<AvailabilityResult> {
    return new Promise((resolve) => {
      const proc = spawn(getClaudeCommand(), ['--version'], { timeout: AGENT_CLI_VERSION_TIMEOUT_MS, env: this.buildEnv() });
      let stdout = '';
      proc.stdout?.on('data', (d) => { stdout += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true, version: stdout.trim() });
        } else {
          resolve({ available: false, error: `claude --version exited with code ${code}` });
        }
      });
      proc.on('error', (err) => {
        resolve({ available: false, error: `Claude CLI not found: ${err.message}` });
      });
    });
  }

  async send(message: string): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Agent is already running');
    }

    this.setStatus('starting');

    const args = ['-p', '--output-format', 'stream-json'];

    if (this.options.permissionMode) {
      args.push('--permission-mode', this.options.permissionMode);
    }

    if (this.sessionId) {
      args.push('--resume', this.sessionId);
    }

    args.push(message);

    this.currentProcess = spawn(getClaudeCommand(), args, {
      cwd: this.options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: this.buildEnv(),
    });

    this.setStatus('running');

    let outputBuffer = '';

    this.currentProcess.stdout?.on('data', (data: Buffer) => {
      outputBuffer += data.toString();
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          this.handleStreamEvent(json);
        } catch {
          this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: line } }, timestamp: Date.now() });
        }
      }
    });

    this.currentProcess.stderr?.on('data', (data: Buffer) => {
      this.emitOutput({ type: 'error', data: { error: data.toString() }, timestamp: Date.now() });
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error('Agent execution timed out'));
      }, this.options.timeoutMs);

      this.currentProcess!.on('close', (code) => {
        clearTimeout(timeout);

        if (outputBuffer.trim()) {
          try {
            const json = JSON.parse(outputBuffer);
            this.handleStreamEvent(json);
          } catch {
            this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: outputBuffer } }, timestamp: Date.now() });
          }
        }

        if (code === 0) {
          this.setStatus('completed');
          resolve();
        } else {
          this.setStatus('error');
          reject(new Error(`Claude process exited with code ${code}`));
        }

        this.currentProcess = null;
      });

      this.currentProcess.on('error', (err) => {
        clearTimeout(timeout);
        this.setStatus('error');
        this.currentProcess = null;
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');

      setTimeout(() => {
        if (this.currentProcess) {
          this.currentProcess.kill('SIGKILL');
          this.currentProcess = null;
        }
      }, AGENT_SIGKILL_DELAY_MS);

      this.setStatus('idle');
    }
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  resetSession(): void {
    this.sessionId = null;
  }

  destroy(): void {
    this.stop();
    this.onOutputCallback = null;
    this.onStatusCallback = null;
    this.onErrorCallback = null;
  }

  onOutput(cb: (event: AgentOutputEvent) => void) { this.onOutputCallback = cb; }
  onStatusChange(cb: (status: AgentStatus) => void) { this.onStatusCallback = cb; }
  onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }

  private setStatus(status: AgentStatus): void {
    this.status = status;
    this.onStatusCallback?.(status);
  }

  private emitOutput(event: AgentOutputEvent): void {
    this.onOutputCallback?.(event);
  }

  private handleStreamEvent(json: Record<string, unknown>): void {
    if (json.session_id && typeof json.session_id === 'string') {
      this.sessionId = json.session_id;
    }

    const type = json.type as string;

    switch (type) {
      case 'content_block_start':
      case 'content_block_delta':
      case 'content_block_stop':
        this.emitOutput({ type: 'text', data: json as unknown as TextDeltaData, timestamp: Date.now() });
        break;
      case 'tool_use':
        this.emitOutput({ type: 'tool_use', data: json as unknown as ToolUseData, timestamp: Date.now() });
        break;
      case 'tool_result':
        this.emitOutput({ type: 'tool_result', data: json as unknown as ToolResultData, timestamp: Date.now() });
        break;
      case 'error':
        this.emitOutput({ type: 'error', data: json as unknown as ErrorData, timestamp: Date.now() });
        break;
      case 'result':
        this.emitOutput({ type: 'result', data: json as unknown as ResultData, timestamp: Date.now() });
        break;
      default:
        this.emitOutput({ type: 'system', data: json as unknown as SystemData, timestamp: Date.now() });
    }
  }
}
