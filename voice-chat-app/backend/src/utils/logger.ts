import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function formatMessage(level: LogLevel, tag: string, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `${timestamp} [${level.toUpperCase()}] [${tag}] ${message}${dataStr}`;
}

function log(level: LogLevel, tag: string, message: string, data?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
    return;
  }

  const formatted = formatMessage(level, tag, message, data);
  
  // Write to file
  logStream.write(formatted + '\n');
  
  // Also write to console with colors
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}${formatted}${reset}`);
}

export const logger = {
  debug: (tag: string, message: string, data?: Record<string, unknown>) => log('debug', tag, message, data),
  info: (tag: string, message: string, data?: Record<string, unknown>) => log('info', tag, message, data),
  warn: (tag: string, message: string, data?: Record<string, unknown>) => log('warn', tag, message, data),
  error: (tag: string, message: string, data?: Record<string, unknown>) => log('error', tag, message, data),
};
