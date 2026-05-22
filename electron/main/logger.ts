import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private logDir: string;
  private logFile: string;
  private stream: fs.WriteStream | null = null;
  private level: LogLevel = 'info';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
    } catch {
      this.logDir = path.join(process.cwd(), '.nocodeflow', 'logs');
    }
    this.logFile = path.join(this.logDir, `nocodeflow-${this.getDateString()}.log`);
    this.ensureLogDir();
    this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(message: string, context?: string, data?: unknown) {
    this.log('debug', message, context, data);
  }

  info(message: string, context?: string, data?: unknown) {
    this.log('info', message, context, data);
  }

  warn(message: string, context?: string, data?: unknown) {
    this.log('warn', message, context, data);
  }

  error(message: string, context?: string, data?: unknown) {
    this.log('error', message, context, data);
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown) {
    if (this.levelPriority[level] < this.levelPriority[this.level]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
    };

    const line = JSON.stringify(entry);

    // Console output in dev
    if (process.env.NODE_ENV !== 'production') {
      const prefix = context ? `[${context}]` : '';
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn(`${entry.timestamp} ${level.toUpperCase()} ${prefix} ${message}`, data ?? '');
    }

    this.stream?.write(line + '\n');
  }

  private ensureLogDir() {
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private getDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getLogDir(): string {
    return this.logDir;
  }

  dispose() {
    this.stream?.end();
    this.stream = null;
  }
}

export const logger = new Logger();
