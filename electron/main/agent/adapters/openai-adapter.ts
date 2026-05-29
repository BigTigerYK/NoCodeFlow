import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import type { AgentAdapter, AgentAdapterOptions } from './types';
import type { AgentStatus, AgentOutputEvent, TokenUsage } from '@shared/types/agent';
import { logger } from '../../logger';

// ─── OpenAI function calling 工具定义 ───

const TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'Read',
      description: 'Read the contents of a file. Use this when you need to examine code, config files, or documents.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Absolute or relative path to the file to read' },
        },
        required: ['file_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'Write',
      description: 'Write content to a file, creating it if it doesn\'t exist or overwriting if it does.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to write' },
          content: { type: 'string', description: 'The content to write to the file' },
        },
        required: ['file_path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'Edit',
      description: 'Edit an existing file by replacing old_string with new_string.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file to edit' },
          old_string: { type: 'string', description: 'The exact string to find and replace' },
          new_string: { type: 'string', description: 'The string to replace old_string with' },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'Bash',
      description: 'Execute a shell command in the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to execute' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'Glob',
      description: 'Find files matching a glob pattern in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern, e.g. "**/*.ts", "src/**/*.tsx"' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'Grep',
      description: 'Search for a pattern in files within the workspace. Returns matching lines with file paths.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Text or regex pattern to search for' },
          glob: { type: 'string', description: 'Optional file glob filter, e.g. "*.ts"' },
        },
        required: ['pattern'],
      },
    },
  },
];

// 递归 glob 匹配
function globMatch(dir: string, pattern: string, cwd: string, depth: number = 0): string[] {
  if (depth > 10) return [];
  const results: string[] = [];
  const parts = pattern.split('/');
  const currentPart = parts[0];
  const remainingParts = parts.slice(1).join('/');

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.next', '__pycache__', 'dist-electron', '.nocodeflow']);

  if (currentPart === '**') {
    // ** 匹配任意深度目录
    if (remainingParts) {
      // ** 后面还有模式，递归匹配所有子目录
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
          results.push(...globMatch(fullPath, remainingParts, cwd, depth + 1));
        }
      }
      // 也尝试在当前目录匹配剩余模式
      results.push(...globMatch(dir, remainingParts, cwd, depth));
    } else {
      // ** 作为最后一段，匹配所有文件
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          results.push(path.relative(cwd, fullPath));
        } else if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
          results.push(...globMatch(fullPath, '**', cwd, depth + 1));
        }
      }
    }
  } else if (currentPart.includes('*')) {
    // 通配符匹配
    const regex = new RegExp('^' + currentPart.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && regex.test(entry.name)) {
        if (remainingParts === '') {
          results.push(path.relative(cwd, fullPath));
        }
      } else if (entry.isDirectory() && !ignoreDirs.has(entry.name) && regex.test(entry.name)) {
        if (remainingParts) {
          results.push(...globMatch(fullPath, remainingParts, cwd, depth + 1));
        }
      }
    }
    // 也尝试跳过当前段继续匹配（支持 *.ts 匹配 a/b.ts）
    if (remainingParts === '') {
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
          results.push(...globMatch(fullPath, pattern, cwd, depth + 1));
        }
      }
    }
  } else {
    // 精确匹配目录名
    const targetDir = path.join(dir, currentPart);
    if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
      if (remainingParts) {
        results.push(...globMatch(targetDir, remainingParts, cwd, depth + 1));
      }
    }
  }

  return results;
}

export class OpenAIAdapter implements AgentAdapter {
  readonly name = 'OpenAI';
  private options: Required<AgentAdapterOptions>;
  private onOutputCallback: ((event: AgentOutputEvent) => void) | null = null;
  private onStatusCallback: ((status: AgentStatus) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private aborted = false;

  // 对话历史（跨 send() 保持，实现多轮上下文）
  private conversationMessages: any[] = [];
  // 文件读取缓存（避免重复读取同一文件）
  private fileCache: Map<string, string> = new Map();
  // 对话历史最大保留条数（防止 token 溢出）
  private static readonly MAX_HISTORY = 60;

  constructor(options: AgentAdapterOptions) {
    this.options = {
      workspacePath: options.workspacePath,
      model: options.model ?? 'gpt-4o',
      maxTurns: options.maxTurns ?? 30,
      timeoutMs: options.timeoutMs ?? 300000,
      apiBaseUrl: options.apiBaseUrl ?? 'https://api.openai.com',
      apiKey: options.apiKey ?? '',
      cliDir: options.cliDir ?? '',
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
      if (resp.ok || resp.status === 404 || resp.status === 405) return { available: true };
      return { available: false, error: `HTTP ${resp.status}` };
    } catch (err: any) {
      return { available: true };
    }
  }

  async send(message: string): Promise<void> {
    this.aborted = false;
    this.setStatus('starting');
    this.setStatus('running');
    const startTime = Date.now();

    // 首次对话：添加系统提示
    if (this.conversationMessages.length === 0) {
      this.conversationMessages.push({
        role: 'system',
        content: [
          'You are a coding assistant. Rules:',
          '- For general knowledge questions (weather, facts, math, translation, etc.), answer directly WITHOUT using any tools.',
          '- Only use tools when the user explicitly asks about their code, files, or needs you to run commands.',
          '- If you need to explore a project, use Glob first, then Read specific files. Do NOT run unrelated commands.',
          '- Be concise.',
        ].join('\n'),
      });
    }

    // 添加用户消息
    this.conversationMessages.push({ role: 'user', content: message });

    // 限制历史长度
    this.trimHistory();

    try {
      await this.agentLoop(startTime);
      this.setStatus('completed');
    } catch (err: any) {
      if (this.aborted) { this.setStatus('idle'); return; }
      this.emitOutput({ type: 'error', data: { error: err.message }, timestamp: Date.now() });
      this.setStatus('error');
      this.onErrorCallback?.(err);
    }
  }

  /**
   * Agent 循环：发送请求 → 检查工具调用 → 执行工具 → 添加结果 → 重复
   */
  private async agentLoop(startTime: number): Promise<void> {
    const baseUrl = this.options.apiBaseUrl.replace(/\/$/, '');
    let turn = 0;
    let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
    const turnTimeout = 30000;

    while (turn < 5 && !this.aborted) {
      turn++;
      const t0 = Date.now();

      const body: any = {
        model: this.options.model,
        messages: this.conversationMessages,
        max_tokens: 2048,
        tools: TOOLS,
      };

      logger.info(`[openai] Turn ${turn}: ${this.conversationMessages.length} msgs`);

      const timeout = turnTimeout;
      logger.info(`[openai] Turn ${turn}: sending ${this.conversationMessages.length} messages (timeout ${timeout}ms)`);

      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`API error ${resp.status}: ${errBody}`);
      }

      const data = await resp.json() as any;
      const elapsed = Date.now() - t0;
      logger.info(`[openai] Turn ${turn}: API responded in ${elapsed}ms`);

      const choice = data.choices?.[0];
      if (!choice) throw new Error('API returned no choices');

      // 累计 token 用量（含缓存命中）
      if (data.usage) {
        const u = this.normalizeUsage(data.usage);
        totalUsage.input_tokens += u.input_tokens;
        totalUsage.output_tokens += u.output_tokens;
        if (u.cache_read_input_tokens) {
          totalUsage.cache_read_input_tokens = (totalUsage.cache_read_input_tokens || 0) + u.cache_read_input_tokens;
        }
      }

      const assistantMsg = choice.message;

      // 发送文本内容
      if (assistantMsg?.content) {
        this.emitOutput({
          type: 'text',
          data: { delta: { type: 'text_delta', text: assistantMsg.content } },
          timestamp: Date.now(),
        });
      }

      // 检查工具调用
      const toolCalls = assistantMsg?.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // 没有工具调用，对话结束
        this.conversationMessages.push(assistantMsg);
        const totalMs = Date.now() - startTime;
        logger.info(`[openai] Done: ${totalMs}ms, ${turn} turns, ${totalUsage.input_tokens}/${totalUsage.output_tokens} tokens`);
        this.emitOutput({
          type: 'result',
          data: { result: assistantMsg?.content || '', duration_ms: totalMs, num_turns: turn, usage: totalUsage },
          timestamp: Date.now(),
        });
        return;
      }

      // 有工具调用，添加 assistant 消息（含 tool_calls）到历史
      this.conversationMessages.push(assistantMsg);

      // 逐个执行工具
      for (const tc of toolCalls) {
        if (this.aborted) return;

        const toolName = tc.function?.name || 'Unknown';
        let toolInput: Record<string, unknown> = {};
        try {
          toolInput = JSON.parse(tc.function?.arguments || '{}');
        } catch { /* ignore */ }

        // 通知前端：工具开始执行
        this.emitOutput({
          type: 'tool_use',
          data: { id: tc.id, name: toolName, input: toolInput },
          timestamp: Date.now(),
        });

        // 执行工具
        const toolT0 = Date.now();
        const result = await this.executeTool(toolName, toolInput);
        logger.info(`[openai] Tool ${toolName}: ${Date.now() - toolT0}ms`);

        // 通知前端：工具执行完成
        this.emitOutput({
          type: 'tool_result',
          data: { tool_use_id: tc.id, content: result, is_error: false },
          timestamp: Date.now(),
        });

        // 添加工具结果到对话历史（限制长度防止 token 膨胀）
        let resultForHistory = result;
        if (resultForHistory.length > 8000) {
          resultForHistory = resultForHistory.slice(0, 8000) + '\n... (truncated)';
        }
        this.conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: resultForHistory,
        });
      }
    }

    // 达到最大轮次
    this.emitOutput({
      type: 'result',
      data: { result: '已达到最大对话轮次', duration_ms: 0, num_turns: turn, usage: totalUsage },
      timestamp: Date.now(),
    });
  }

  /**
   * 执行工具并返回结果文本
   */
  private async executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    const ws = this.options.workspacePath;

    switch (name) {
      case 'Read':
        return this.toolRead(ws, input);
      case 'Write':
        return this.toolWrite(ws, input);
      case 'Edit':
        return this.toolEdit(ws, input);
      case 'Bash':
        return this.toolBash(ws, input);
      case 'Glob':
        return this.toolGlob(ws, input);
      case 'Grep':
        return this.toolGrep(ws, input);
      default:
        return `Error: Unknown tool "${name}"`;
    }
  }

  // ─── 工具实现 ───

  private toolRead(ws: string, input: Record<string, unknown>): string {
    const filePath = this.resolvePath(ws, input.file_path as string);
    if (!filePath) return 'Error: file_path is required';

    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 1024 * 200) return `Error: File too large (${(stat.size / 1024).toFixed(0)}KB, max 200KB)`;

      const cacheKey = filePath;
      let content = this.fileCache.get(cacheKey);
      if (content === undefined) {
        content = fs.readFileSync(filePath, 'utf-8');
        this.fileCache.set(cacheKey, content);
      }

      const lines = content.split('\n');
      // 超过 300 行的文件截断显示
      if (lines.length > 300) {
        const head = lines.slice(0, 300).map((l, i) => `${String(i + 1).padStart(5)}\t${l}`).join('\n');
        return `File: ${path.relative(ws, filePath)} (${lines.length} lines, showing first 300)\n${head}\n... (file truncated, ${lines.length - 300} more lines)`;
      }
      const numbered = lines.map((l, i) => `${String(i + 1).padStart(5)}\t${l}`).join('\n');
      return `File: ${path.relative(ws, filePath)} (${lines.length} lines)\n${numbered}`;
    } catch (err: any) {
      return `Error reading file: ${err.message}`;
    }
  }

  private toolWrite(ws: string, input: Record<string, unknown>): string {
    const filePath = this.resolvePath(ws, input.file_path as string);
    if (!filePath) return 'Error: file_path is required';
    if (typeof input.content !== 'string') return 'Error: content is required';

    try {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      // 原子写入：先写临时文件再 rename
      const tmpPath = filePath + '.nocodeflow-tmp';
      fs.writeFileSync(tmpPath, input.content, 'utf-8');
      fs.renameSync(tmpPath, filePath);
      this.fileCache.set(filePath, input.content); // 更新缓存
      return `File written: ${path.relative(ws, filePath)} (${input.content.split('\n').length} lines)`;
    } catch (err: any) {
      return `Error writing file: ${err.message}`;
    }
  }

  private toolEdit(ws: string, input: Record<string, unknown>): string {
    const filePath = this.resolvePath(ws, input.file_path as string);
    if (!filePath) return 'Error: file_path is required';
    const oldStr = input.old_string as string;
    const newStr = input.new_string as string;
    if (!oldStr) return 'Error: old_string is required';
    if (newStr === undefined) return 'Error: new_string is required';

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const idx = content.indexOf(oldStr);
      if (idx === -1) return 'Error: old_string not found in file';
      // 检查是否有多处匹配
      const secondIdx = content.indexOf(oldStr, idx + 1);
      if (secondIdx !== -1) return 'Error: old_string matches multiple locations. Provide more context to make it unique.';
      content = content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
      const tmpPath = filePath + '.nocodeflow-tmp';
      fs.writeFileSync(tmpPath, content, 'utf-8');
      fs.renameSync(tmpPath, filePath);
      this.fileCache.set(filePath, content); // 更新缓存
      return `File edited: ${path.relative(ws, filePath)}`;
    } catch (err: any) {
      return `Error editing file: ${err.message}`;
    }
  }

  private toolBash(ws: string, input: Record<string, unknown>): Promise<string> {
    const cmd = input.command as string;
    if (!cmd) return Promise.resolve('Error: command is required');

    // 高危命令检测
    const dangerous = ['rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};:', 'chmod -R 777 /', '>()'];
    if (dangerous.some(d => cmd.includes(d))) {
      return Promise.resolve('Error: This command is blocked for safety reasons');
    }

    return new Promise((resolve) => {
      const proc = execFile(
        'cmd.exe', ['/d', '/s', '/c', cmd],
        {
          cwd: ws,
          timeout: 30000,
          maxBuffer: 1024 * 500,
          env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
        },
        (err, stdout, stderr) => {
          let result = '';
          if (stdout) result += stdout;
          if (stderr) result += (result ? '\n[stderr]\n' : '') + stderr;
          if (err && !result) result = `Error: ${err.message}`;
          // 限制输出长度
          if (result.length > 10000) {
            result = result.slice(0, 10000) + '\n... (output truncated)';
          }
          resolve(result || '(no output)');
        }
      );
    });
  }

  private toolGlob(ws: string, input: Record<string, unknown>): string {
    const pattern = input.pattern as string;
    if (!pattern) return 'Error: pattern is required';

    try {
      const matches = globMatch(ws, pattern, ws);
      if (matches.length === 0) return 'No files found matching pattern';
      const limit = matches.slice(0, 100);
      let result = `Found ${matches.length} file(s):\n${limit.join('\n')}`;
      if (matches.length > 100) result += `\n... and ${matches.length - 100} more`;
      return result;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }

  private toolGrep(ws: string, input: Record<string, unknown>): string {
    const pattern = input.pattern as string;
    if (!pattern) return 'Error: pattern is required';
    const globFilter = input.glob as string | undefined;

    try {
      const results: string[] = [];
      const searchDir = (dir: string, depth: number) => {
        if (depth > 8 || results.length > 200) return;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

        const ignoreDirs = new Set(['node_modules', '.git', 'dist', '.next', '__pycache__', 'dist-electron', '.nocodeflow']);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
            searchDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            // glob 过滤
            if (globFilter) {
              const regex = new RegExp('^' + globFilter.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
              if (!regex.test(entry.name)) continue;
            }
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(pattern)) {
                  results.push(`${path.relative(ws, fullPath)}:${i + 1}: ${lines[i].trim()}`);
                }
              }
            } catch { /* skip binary/unreadable files */ }
          }
        }
      };

      searchDir(ws, 0);
      if (results.length === 0) return 'No matches found';
      let result = `Found ${results.length} match(es):\n${results.slice(0, 100).join('\n')}`;
      if (results.length > 100) result += `\n... and ${results.length - 100} more`;
      return result;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }

  // ─── 工具方法 ───

  /** 解析路径，确保在 workspace 内 */
  private resolvePath(ws: string, filePath: string): string | null {
    if (!filePath) return null;
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(ws, filePath);
    // 安全检查：不允许访问 workspace 外的文件
    const rel = path.relative(ws, resolved);
    if (rel.startsWith('..')) {
      logger.warn(`[openai] Path outside workspace rejected: ${filePath}`);
      return null;
    }
    return resolved;
  }

  stop() {
    this.aborted = true;
    this.setStatus('idle');
  }

  /** 重置对话历史（用户点击"重置会话"时调用） */
  resetConversation(): void {
    this.conversationMessages = [];
    this.fileCache.clear();
  }

  /** 限制对话历史长度，防止 token 过多 */
  private trimHistory(): void {
    if (this.conversationMessages.length <= OpenAIAdapter.MAX_HISTORY) return;
    // 保留 system prompt（第一条）+ 最近的 N 条消息
    const systemMsg = this.conversationMessages[0];
    const recent = this.conversationMessages.slice(-(OpenAIAdapter.MAX_HISTORY - 1));
    this.conversationMessages = [systemMsg, ...recent];
  }

  private normalizeUsage(raw: any): TokenUsage {
    return {
      input_tokens: raw.input_tokens ?? raw.prompt_tokens ?? 0,
      output_tokens: raw.output_tokens ?? raw.completion_tokens ?? 0,
      cache_read_input_tokens: raw.cache_read_input_tokens ?? raw.prompt_tokens_details?.cached_tokens ?? 0,
    };
  }
}
