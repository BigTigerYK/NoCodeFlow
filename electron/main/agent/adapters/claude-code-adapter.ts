import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import path from 'path';
import type { AgentAdapter, AgentAdapterOptions } from './types';
import type { AgentStatus, AgentOutputEvent } from '@shared/types/agent';
import { AGENT_DEFAULT_TIMEOUT_MS, AGENT_DEFAULT_MAX_TURNS, AGENT_CLI_VERSION_TIMEOUT_MS, AGENT_SIGKILL_DELAY_MS } from '@shared/constants';
import { logger } from '../../logger';
import { envManager } from '../../env/environment-manager';


function getClaudeCommand(cliDir?: string): string {
  if (cliDir) {
    return path.join(cliDir, platform() === 'win32' ? 'claude.cmd' : 'claude');
  }
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
      cliDir: options.cliDir ?? '',
    };
  }

  private buildEnv(): NodeJS.ProcessEnv {
    // 使用统一的环境管理器构建基础环境（bundled node + CLI 路径 + shell）
    const env = envManager.buildEnv();

    // 叠加 API 配置
    if (this.options.apiBaseUrl) {
      env.ANTHROPIC_BASE_URL = this.options.apiBaseUrl;
      logger.info(`[adapter] ANTHROPIC_BASE_URL = ${this.options.apiBaseUrl}`);
    }
    if (this.options.apiKey) {
      env.ANTHROPIC_API_KEY = this.options.apiKey;
      logger.info(`[adapter] ANTHROPIC_API_KEY = ${this.options.apiKey.substring(0, 10)}...`);
    }

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
      const cmd = getClaudeCommand(this.options.cliDir);
      logger.info(`[adapter] checkAvailability: ${cmd} --version`);
      const proc = spawn(cmd, ['--version'], { timeout: AGENT_CLI_VERSION_TIMEOUT_MS, env: this.buildEnv(), shell: true });
      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => { stdout += d.toString(); });
      proc.stderr?.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true, version: stdout.trim() });
        } else if (stdout.trim()) {
          // CLI 存在但返回了非 0 退出码（比如配置问题），仍然标记为可用
          logger.info(`[adapter] claude --version returned ${code} but CLI exists, proceeding`);
          resolve({ available: true, version: stdout.trim() });
        } else {
          const err = stderr.trim() || `Claude CLI 不可用：exit code ${code}`;
          logger.warn(`[adapter] checkAvailability failed: ${err} (cmd: ${cmd})`);
          resolve({ available: false, error: err });
        }
      });
      proc.on('error', (err) => {
        logger.error(`[adapter] checkAvailability spawn error: ${err.message} (cmd: ${cmd})`);
        resolve({ available: false, error: `Claude CLI not found: ${err.message}` });
      });
    });
  }

  async send(message: string): Promise<void> {
    if (this.status === 'running') throw new Error('Agent is already running');
    this.stoppedByUser = false;
    this.setStatus('starting');

    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions'];
    const cmd = getClaudeCommand(this.options.cliDir);

    this.currentProcess = spawn(cmd, args, {
      cwd: this.options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: this.buildEnv(),
      shell: true,
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
    const ts = Date.now();
    switch (json.type) {
      case 'text':
      case 'content_block_delta':
        if (json.delta?.text || json.delta?.type === 'text_delta') {
          this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: json.delta.text || '' } }, timestamp: ts });
        }
        break;
      case 'assistant':
        this.emitAssistantContent(json, ts);
        break;
      case 'tool_use':
        this.emitOutput({ type: 'tool_use', data: { id: json.id, name: json.name, input: json.input }, timestamp: ts });
        break;
      case 'tool_result':
        this.emitOutput({ type: 'tool_result', data: { tool_use_id: json.tool_use_id, content: json.content, is_error: json.is_error }, timestamp: ts });
        break;
      case 'error':
        this.emitOutput({ type: 'error', data: { error: json.error?.message || json.message || 'Unknown error' }, timestamp: ts });
        break;
      case 'result': {
        let usage;
        if (json.usage && typeof json.usage === 'object') {
          usage = {
            input_tokens: json.usage.input_tokens ?? 0,
            output_tokens: json.usage.output_tokens ?? 0,
            cache_creation_input_tokens: json.usage.cache_creation_input_tokens,
            cache_read_input_tokens: json.usage.cache_read_input_tokens,
          };
        }
        this.emitOutput({ type: 'result', data: { result: json.result || json.content, duration_ms: json.duration_ms, num_turns: json.num_turns, usage }, timestamp: ts });
        break;
      }
      case 'system':
        if (json.subtype === 'init') this.sessionId = json.session_id || null;
        this.emitOutput({ type: 'system', data: { subtype: json.subtype, session_id: json.session_id, model: json.model, tools: json.tools }, timestamp: ts });
        break;
      case 'user':
        break;
      default:
        break;
    }
  }

  private emitAssistantContent(json: any, ts: number) {
    const content = json.message?.content;
    if (!Array.isArray(content)) return;
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        this.emitOutput({ type: 'text', data: { delta: { type: 'text_delta', text: block.text } }, timestamp: ts });
      }
    }
  }
}
