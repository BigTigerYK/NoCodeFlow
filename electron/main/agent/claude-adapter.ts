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
  private killTimer: ReturnType<typeof setTimeout> | null = null;
  private stoppedByUser = false;
  private sendReject: ((reason: Error) => void) | null = null;

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

    this.stoppedByUser = false;
    this.setStatus('starting');

    const args = ['-p', '--output-format', 'stream-json', '--verbose'];

    // In -p (non-interactive) mode, CLI cannot prompt for permissions.
    // Skip CLI's permission system — our app's PermissionManager handles the real checks.
    args.push('--dangerously-skip-permissions');

    // Session resumption disabled to ensure fresh responses each time
    // if (this.sessionId) {
    //   args.push('--resume', this.sessionId);
    // }


    this.currentProcess = spawn(getClaudeCommand(), args, {
      cwd: this.options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: this.buildEnv(),
    });

    // Write message to stdin and close — CLI reads prompt from stdin in -p mode
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
          const json = JSON.parse(line);
          this.handleStreamEvent(json);
        } catch {
          this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: line } }, timestamp: Date.now() });
        }
      }
    });

    this.currentProcess.stderr?.on('data', (data: Buffer) => {
      if (this.stoppedByUser) return;
      const msg = data.toString().trim();
      // Filter out non-critical warnings (e.g. stdin, deprecation notices)
      if (!msg || msg.startsWith('Warning:') || msg.includes('proceeding without')) {
        return;
      }
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

        // Discard any remaining buffer
        outputBuffer = '';

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

  async stop(): Promise<void> {
    this.stoppedByUser = true;

    // Unblock the pending send() promise so AGENT_SEND IPC can return
    if (this.sendReject) {
      const reject = this.sendReject;
      this.sendReject = null;
      reject(new Error('Agent stopped by user'));
    }

    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }

    if (this.currentProcess) {
      const proc = this.currentProcess;
      this.currentProcess = null;

      return new Promise<void>((resolve) => {
        proc.on('close', () => {
          this.setStatus('idle');
          resolve();
        });

        proc.kill('SIGTERM');

        this.killTimer = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* already dead */ }
          this.killTimer = null;
        }, AGENT_SIGKILL_DELAY_MS);
      });
    }

    this.setStatus('idle');
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  resetSession(): void {
    this.sessionId = null;
  }

  destroy(): void {
    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }
    if (this.currentProcess) {
      this.currentProcess.kill('SIGKILL');
      this.currentProcess = null;
    }
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
      case 'system':
        // Init/system events — forward for debugging
        this.emitOutput({ type: 'system', data: json as unknown as SystemData, timestamp: Date.now() });
        break;

      case 'assistant': {
        // Assistant message — extract content blocks (text, tool_use, thinking)
        const message = json.message as Record<string, unknown> | undefined;
        const content = message?.content as Array<Record<string, unknown>> | undefined;
        if (!content) break;

        for (const block of content) {
          const blockType = block.type as string;

          if (blockType === 'text' && typeof block.text === 'string') {
            this.emitOutput({
              type: 'text',
              data: { delta: { type: 'text_delta', text: block.text } } as TextDeltaData,
              timestamp: Date.now(),
            });
          } else if (blockType === 'tool_use') {
            this.emitOutput({
              type: 'tool_use',
              data: {
                id: block.id as string,
                name: block.name as string,
                input: block.input,
              } as ToolUseData,
              timestamp: Date.now(),
            });
          }
          // thinking blocks are ignored — not displayed in chat
        }
        break;
      }

      case 'result': {
        // Final result event
        const isError = json.is_error === true || json.subtype === 'error';
        if (isError) {
          this.emitOutput({
            type: 'error',
            data: { error: (json.result as string) || (json.error as string) || 'Unknown error' } as ErrorData,
            timestamp: Date.now(),
          });
        } else {
          this.emitOutput({
            type: 'result',
            data: {
              result: json.result as string,
              session_id: json.session_id as string,
            } as ResultData,
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'tool_result':
        this.emitOutput({ type: 'tool_result', data: json as unknown as ToolResultData, timestamp: Date.now() });
        break;

      case 'error':
        this.emitOutput({ type: 'error', data: json as unknown as ErrorData, timestamp: Date.now() });
        break;

      default:
        // Forward unknown events as system events
        this.emitOutput({ type: 'system', data: json as unknown as SystemData, timestamp: Date.now() });
    }
  }
}
