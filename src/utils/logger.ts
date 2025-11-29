import winston from 'winston';
import type { SystemConfig } from '@/config';

export interface LogContext {
  agentId?: string;
  taskId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export class Logger {
  private logger: winston.Logger;
  private context: LogContext = {};

  constructor(config?: SystemConfig['system']) {
    const logLevel = config?.logLevel || 'info';

    const format = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const contextString = Object.keys(meta).length > 0
          ? ` ${JSON.stringify(meta)}`
          : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${contextString}`;
      })
    );

    this.logger = winston.createLogger({
      level: logLevel,
      format,
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            format
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],
      handleExceptions: true,
      handleRejections: true
    });
  }

  public withContext(context: LogContext): Logger {
    const newLogger = new Logger();
    newLogger.logger = this.logger;
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }

  private formatMessage(message: string, meta: Record<string, unknown> = {}): object {
    return {
      message,
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString()
    };
  }

  public debug(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.debug(this.formatMessage(message, meta));
  }

  public info(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.info(this.formatMessage(message, meta));
  }

  public warn(message: string, meta: Record<string, unknown> = {}): void {
    this.logger.warn(this.formatMessage(message, meta));
  }

  public error(message: string, error?: Error | unknown, meta: Record<string, unknown> = {}): void {
    const errorMeta = error instanceof Error
      ? {
          error: error.message,
          stack: error.stack,
          ...meta
        }
      : { error, ...meta };

    this.logger.error(this.formatMessage(message, errorMeta));
  }

  public critical(message: string, error?: Error | unknown, meta: Record<string, unknown> = {}): void {
    this.error(message, error, { severity: 'critical', ...meta });
  }

  public logPerformance(operation: string, duration: number, meta: Record<string, unknown> = {}): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      performance: true,
      ...meta
    });
  }

  public logAgentLifecycle(agentId: string, event: string, meta: Record<string, unknown> = {}): void {
    this.info(`Agent Lifecycle: ${event}`, {
      agentId,
      event,
      lifecycle: true,
      ...meta
    });
  }

  public logTaskLifecycle(taskId: string, event: string, agentId?: string, meta: Record<string, unknown> = {}): void {
    this.info(`Task Lifecycle: ${event}`, {
      taskId,
      agentId,
      event,
      taskLifecycle: true,
      ...meta
    });
  }

  public logCommunication(from: string, to: string, type: string, meta: Record<string, unknown> = {}): void {
    this.debug(`Communication: ${type}`, {
      from,
      to,
      type,
      communication: true,
      ...meta
    });
  }

  public logConsensus(proposalId: string, event: string, meta: Record<string, unknown> = {}): void {
    this.info(`Consensus: ${event}`, {
      proposalId,
      event,
      consensus: true,
      ...meta
    });
  }

  public logSecurity(event: string, severity: string, meta: Record<string, unknown> = {}): void {
    this.warn(`Security: ${event}`, {
      event,
      severity,
      security: true,
      ...meta
    });
  }

  public logLearning(event: string, meta: Record<string, unknown> = {}): void {
    this.info(`Learning: ${event}`, {
      event,
      learning: true,
      ...meta
    });
  }

  public logHealth(component: string, status: string, metrics: Record<string, number> = {}): void {
    this.debug(`Health Check: ${component}`, {
      component,
      status,
      metrics,
      health: true
    });
  }

  public async audit(action: string, actor: string, resource: string, meta: Record<string, unknown> = {}): Promise<void> {
    this.info(`Audit: ${action}`, {
      action,
      actor,
      resource,
      timestamp: new Date().toISOString(),
      audit: true,
      ...meta
    });
  }

  public createChildLogger(context: LogContext): Logger {
    return this.withContext(context);
  }

  public setLogLevel(level: string): void {
    this.logger.level = level;
  }

  public getLogLevel(): string {
    return this.logger.level;
  }

  public profile(id: string): void {
    this.logger.profile(id);
  }

  public stream(): NodeJS.ReadableStream {
    return this.logger.stream();
  }

  public query(options: winston.QueryOptions, callback?: (err: Error, results: any) => void): any {
    return this.logger.query(options, callback);
  }
}

export const logger = new Logger();

export function createLogger(context: LogContext): Logger {
  return logger.withContext(context);
}

export class PerformanceLogger {
  private logger: Logger;
  private operations: Map<string, number> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  public start(operation: string, context?: LogContext): void {
    const id = this.generateOperationId(operation, context);
    this.operations.set(id, Date.now());
    this.logger.debug(`Performance: Started ${operation}`, {
      operation,
      id,
      performance: true,
      ...context
    });
  }

  public end(operation: string, context?: LogContext): number {
    const id = this.generateOperationId(operation, context);
    const startTime = this.operations.get(id);

    if (!startTime) {
      this.logger.warn(`Performance: No start time found for ${operation}`, {
        operation,
        id,
        performance: true,
        ...context
      });
      return 0;
    }

    const duration = Date.now() - startTime;
    this.operations.delete(id);

    this.logger.logPerformance(operation, duration, {
      id,
      ...context
    });

    return duration;
  }

  public async measure<T>(
    operation: string,
    fn: () => Promise<T> | T,
    context?: LogContext
  ): Promise<T> {
    this.start(operation, context);
    try {
      const result = await fn();
      this.end(operation, context);
      return result;
    } catch (error) {
      this.end(operation, context);
      throw error;
    }
  }

  private generateOperationId(operation: string, context?: LogContext): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${operation}:${contextStr}`;
  }
}

export const performanceLogger = new PerformanceLogger();