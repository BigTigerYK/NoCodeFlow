import { spawn, ChildProcess } from 'child_process';
import type { AgentStatus, AgentOutputEvent, ClaudeAdapterOptions, AvailabilityResult } from './types';

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
      maxTurns: options.maxTurns ?? 100,
      timeoutMs: options.timeoutMs ?? 5 * 60 * 1000,
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
      const proc = spawn('claude', ['--version'], { shell: true, timeout: 5000, env: this.buildEnv() });
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

    this.currentProcess = spawn('claude', args, {
      cwd: this.options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
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
          this.emitOutput({ type: 'text', data: line, timestamp: Date.now() });
        }
      }
    });

    this.currentProcess.stderr?.on('data', (data: Buffer) => {
      this.emitOutput({ type: 'error', data: data.toString(), timestamp: Date.now() });
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
            this.emitOutput({ type: 'text', data: outputBuffer, timestamp: Date.now() });
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
      }, 3000);

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
        this.emitOutput({ type: 'text', data: json, timestamp: Date.now() });
        break;
      case 'tool_use':
        this.emitOutput({ type: 'tool_use', data: json, timestamp: Date.now() });
        break;
      case 'tool_result':
        this.emitOutput({ type: 'tool_result', data: json, timestamp: Date.now() });
        break;
      case 'error':
        this.emitOutput({ type: 'error', data: json, timestamp: Date.now() });
        break;
      case 'result':
        this.emitOutput({ type: 'result', data: json, timestamp: Date.now() });
        break;
      default:
        this.emitOutput({ type: 'system', data: json, timestamp: Date.now() });
    }
  }
}
