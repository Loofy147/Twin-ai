/**
 * Structured logging service with environment-aware levels
 * Integrates with external services (Sentry, LogRocket, etc.) in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  environment: string;
  version: string;
  session_id?: string;
  user_id?: string;
}

class Logger {
  private environment: string;
  private version: string;
  private sessionId: string;
  private userId?: string;
  private minLevel: LogLevel;
  private buffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.environment = import.meta.env.MODE || 'development';
    this.version = import.meta.env.VITE_APP_VERSION || '0.1.0';
    this.sessionId = this.generateSessionId();
    this.minLevel = this.getMinLevel();

    // Flush buffer periodically in production
    if (this.environment === 'production') {
      setInterval(() => this.flushBuffer(), 10000); // 10 seconds
    }

    // Flush buffer before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushBuffer());
    }
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  clearUserId() {
    this.userId = undefined;
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);

    // Send to error tracking service in production
    if (this.environment === 'production' && typeof window !== 'undefined') {
      this.sendToErrorTracking(message, context);
    }
  }

  /**
   * Core logging function with structured output
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
      environment: this.environment,
      version: this.version,
      session_id: this.sessionId,
      user_id: this.userId
    };

    // Console output in development
    if (this.environment === 'development') {
      this.consoleOutput(entry);
    }

    // Buffer for production
    this.buffer.push(entry);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Console output with color coding
   */
  private consoleOutput(entry: LogEntry) {
    const colors = {
      debug: 'color: #6366f1',
      info: 'color: #06b6d4',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold'
    };

    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    const style = colors[entry.level];

    if (entry.context) {
      console.log(`%c${prefix} ${entry.message}`, style, entry.context);
    } else {
      console.log(`%c${prefix} ${entry.message}`, style);
    }
  }

  /**
   * Determine if log should be emitted based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Get minimum log level from environment
   */
  private getMinLevel(): LogLevel {
    const envLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    if (envLevel && validLevels.includes(envLevel as LogLevel)) {
      return envLevel as LogLevel;
    }

    // Default levels by environment
    return this.environment === 'production' ? 'info' : 'debug';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];

    // Recursively sanitize nested objects
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result: any = Array.isArray(obj) ? [] : {};

      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

        if (isSensitive) {
          result[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          result[key] = sanitizeObject(obj[key]);
        } else {
          result[key] = obj[key];
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Flush log buffer to external service
   */
  private async flushBuffer() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    // In production, send to logging service
    if (this.environment === 'production') {
      try {
        await this.sendToLogService(logs);
      } catch (error) {
        // Fallback: store in localStorage
        this.storeLogsLocally(logs);
      }
    }
  }

  /**
   * Send logs to external logging service (implement based on chosen service)
   */
  private async sendToLogService(logs: LogEntry[]) {
    // TODO: Implement based on chosen service (e.g., Logtail, Datadog, etc.)
    // Example with generic endpoint:
    const endpoint = import.meta.env.VITE_LOGGING_ENDPOINT;

    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_LOGGING_API_KEY || ''
        },
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      console.error('Failed to send logs to service', error);
      throw error;
    }
  }

  /**
   * Send critical errors to error tracking service
   */
  private sendToErrorTracking(message: string, context?: LogContext) {
    // TODO: Integrate with Sentry, Rollbar, or similar
    // Example Sentry integration:
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(message), {
        extra: context,
        tags: {
          environment: this.environment,
          version: this.version,
          session_id: this.sessionId,
          user_id: this.userId
        }
      });
    }
  }

  /**
   * Store logs locally as fallback
   */
  private storeLogsLocally(logs: LogEntry[]) {
    try {
      const existingLogs = localStorage.getItem('twin_ai_logs');
      const parsed = existingLogs ? JSON.parse(existingLogs) : [];
      const combined = [...parsed, ...logs];

      // Keep only last 500 entries
      const trimmed = combined.slice(-500);
      localStorage.setItem('twin_ai_logs', JSON.stringify(trimmed));
    } catch (error) {
      // LocalStorage full or unavailable
      console.error('Failed to store logs locally', error);
    }
  }

  /**
   * Performance tracking
   */
  startTimer(label: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.info(`Timer: ${label}`, {
        duration_ms: Math.round(duration),
        duration_readable: `${duration.toFixed(2)}ms`
      });
    };
  }

  /**
   * Track user actions
   */
  trackAction(action: string, properties?: LogContext) {
    this.info(`Action: ${action}`, {
      action_type: 'user_action',
      ...properties
    });

    // Send to analytics service
    if (this.environment === 'production' && typeof window !== 'undefined') {
      this.sendToAnalytics(action, properties);
    }
  }

  /**
   * Send to analytics service
   */
  private sendToAnalytics(action: string, properties?: LogContext) {
    // TODO: Integrate with analytics (PostHog, Mixpanel, etc.)
    if ((window as any).posthog) {
      (window as any).posthog.capture(action, properties);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel, LogContext, LogEntry };
