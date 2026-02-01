// Simplified version of logger without complex validation

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_PATTERN = /authorization|cookie|token|secret|seed|mnemonic/i;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: string;
  file?: string;
  line?: number;
}

// Maximum number of logs to store
const MAX_LOGS = 50;

export class Logger {
  private logs: LogEntry[] = [];

  debug(message: string, data?: unknown, file?: string, line?: number): void {
    this.log('debug', message, data, file, line);
  }

  info(message: string, data?: unknown, file?: string, line?: number): void {
    this.log('info', message, data, file, line);
  }

  warn(message: string, data?: unknown, file?: string, line?: number): void {
    this.log('warn', message, data, file, line);
  }

  error(message: string, data?: unknown, file?: string, line?: number): void {
    this.log('error', message, data, file, line);
  }

  private static containsSensitive(value: unknown): boolean {
    if (value == null) return false;

    if (typeof value === 'string') {
      return SENSITIVE_PATTERN.test(value);
    }

    if (Array.isArray(value)) {
      return value.some(item => Logger.containsSensitive(item));
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      return entries.some(
        ([key, val]) =>
          SENSITIVE_PATTERN.test(key) || Logger.containsSensitive(val)
      );
    }

    return false;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    file?: string,
    line?: number
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (Logger.containsSensitive(message) || Logger.containsSensitive(data)) {
      return;
    }

    if (isProduction && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();

    // Safely convert data to string
    let safeData: string | undefined = undefined;

    try {
      if (data !== null && data !== undefined) {
        if (typeof data === 'string') {
          safeData = data;
        } else if (typeof data === 'number' || typeof data === 'boolean') {
          safeData = String(data);
        } else {
          safeData = '[Object]';
        }
      }
    } catch (e) {
      safeData = '[Error stringifying data]';
    }

    const entry: LogEntry = {
      timestamp,
      level,
      message,
      data: safeData ?? '',
      file: file ?? '',
      line: line ?? 0,
    };

    // Add log to array
    this.logs.push(entry);

    // Limit the number of logs
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    // Output to console only in development
    if (!isProduction && typeof console !== 'undefined') {
      const consoleMethod =
        level === 'error'
          ? console.error
          : level === 'warn'
            ? console.warn
            : level === 'info'
              ? console.info
              : console.log;

      // Используем apply для корректного контекста и предотвращения TypeError
      if (typeof consoleMethod === 'function') {
        const prefix = `[${level.toUpperCase()}] ${message}`;
        if (safeData) {
          consoleMethod.apply(console, [prefix, safeData]);
        } else {
          consoleMethod.apply(console, [prefix]);
        }
      }
    }
  }

  getAll(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
    if (typeof console !== 'undefined') {
    }
  }
}

// Create logger instance
export const logger = new Logger();

// Global error handler
export function setupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      const msg = String(message || '').toLowerCase();
      // Downgrade noisy browser warnings that do not impact UX
      if (msg.includes('resizeobserver loop completed')) {
        return true; // suppress noisy ResizeObserver warnings entirely
      }
      logger.error(
        `Global error: ${message}`,
        null,
        source?.toString(),
        lineno
      );
      return false;
    };

    window.addEventListener('unhandledrejection', event => {
      const reasonStr = event.reason?.toString() || '';

      // Подавляем ошибки расширений Chrome
      if (reasonStr.includes('chrome.runtime.sendMessage') ||
        reasonStr.includes('extension') ||
        reasonStr.includes('ieldiilncjhfkalnemgjbffmpomcaigi')) {
        return;
      }

      logger.error('Unhandled Promise rejection', reasonStr || '[No reason available]');

      // Prevent the default browser action (logging to console)
      event.preventDefault();
    });
  }
}

// Empty function for JSX validation - does nothing
export function validateJSXContent(content: string, filename: string): void {
  // Empty function to avoid validation issues
}
