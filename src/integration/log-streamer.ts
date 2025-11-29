import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, Readable } from 'fs';
import { WebSocketBridge } from './websocket-bridge';
import { Logger } from '../utils/logger';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  component?: string;
  metadata?: any;
  formatted: string;
}

export interface LogStreamOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
  bufferSize?: number;
  flushInterval?: number;
  enableFileLogging?: boolean;
  logDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

export interface LogStreamerEvents {
  'log:received': LogEntry;
  'log:buffered': LogEntry[];
  'log:flushed': { count: number; destination: string };
  'stream:started': { source: string };
  'stream:stopped': { source: string };
  'stream:error': { error: Error; source: string };
  'filter:changed': { level: string; source?: string };
}

export class LogStreamer extends EventEmitter {
  private wsBridge: WebSocketBridge;
  private buffer: LogEntry[] = [];
  private options: Required<LogStreamOptions>;
  private logger: Logger;
  private activeStreams: Map<string, Readable> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private logFiles: Map<string, fs.WriteStream> = new Map();
  private isStreaming = false;
  private filters: Set<string> = new Set();

  constructor(wsBridge: WebSocketBridge, options: LogStreamOptions = {}) {
    super();
    this.wsBridge = wsBridge;
    this.options = {
      level: 'info',
      format: 'json',
      bufferSize: 1000,
      flushInterval: 5000,
      enableFileLogging: true,
      logDir: './logs',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      ...options
    };
    this.logger = new Logger().withContext({ component: 'LogStreamer' });
    this.setupWebSocketIntegration();
    this.startFlushTimer();
  }

  /**
   * Start streaming logs from various sources
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      this.logger.warn('Log streaming already active');
      return;
    }

    this.logger.info('Starting log streaming');

    try {
      // Ensure log directory exists
      if (this.options.enableFileLogging) {
        await fs.promises.mkdir(this.options.logDir, { recursive: true });
      }

      // Start streaming from different sources
      await this.startApplicationLogStreaming();
      await this.startProcessLogStreaming();
      await this.startSystemLogStreaming();

      this.isStreaming = true;
      this.logger.info('Log streaming started successfully');

    } catch (error) {
      this.logger.error('Failed to start log streaming', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop log streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    this.logger.info('Stopping log streaming');

    this.isStreaming = false;

    // Close all active streams
    for (const [source, stream] of this.activeStreams.entries()) {
      try {
        stream.destroy();
        this.emit('stream:stopped', { source });
      } catch (error) {
        this.logger.warn('Failed to close stream', { source, error });
      }
    }
    this.activeStreams.clear();

    // Close all log files
    for (const [source, fileStream] of this.logFiles.entries()) {
      try {
        fileStream.end();
      } catch (error) {
        this.logger.warn('Failed to close log file', { source, error });
      }
    }
    this.logFiles.clear();

    // Flush remaining buffer
    await this.flushBuffer();

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.logger.info('Log streaming stopped');
  }

  /**
   * Add a log entry
   */
  addLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp' | 'formatted'>): void {
    const fullEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      formatted: this.formatLogEntry(entry),
      ...entry
    };

    // Apply filters
    if (!this.shouldProcessLog(fullEntry)) {
      return;
    }

    // Add to buffer
    this.buffer.push(fullEntry);

    // Emit event
    this.emit('log:received', fullEntry);

    // Send to WebSocket clients
    this.broadcastLogEntry(fullEntry);

    // Write to file if enabled
    if (this.options.enableFileLogging) {
      this.writeToLogFile(fullEntry);
    }

    // Flush buffer if it's full
    if (this.buffer.length >= this.options.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Set log level filter
   */
  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error', source?: string): void {
    const filterKey = source ? `${source}:${level}` : level;
    this.filters.add(filterKey);

    this.logger.info('Log level filter set', { level, source });
    this.emit('filter:changed', { level, source });
  }

  /**
   * Remove log level filter
   */
  removeLogLevelFilter(level: string, source?: string): void {
    const filterKey = source ? `${source}:${level}` : level;
    this.filters.delete(filterKey);

    this.logger.info('Log level filter removed', { level, source });
    this.emit('filter:changed', { level, source });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.buffer.slice(-count);
  }

  /**
   * Get logs by source
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.buffer.filter(entry => entry.source === source);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    return this.buffer.filter(entry => entry.level === level);
  }

  /**
   * Search logs
   */
  searchLogs(query: string, field?: 'message' | 'source' | 'component'): LogEntry[] {
    return this.buffer.filter(entry => {
      if (field) {
        return entry[field]?.toLowerCase().includes(query.toLowerCase());
      }
      return (
        entry.message.toLowerCase().includes(query.toLowerCase()) ||
        entry.source.toLowerCase().includes(query.toLowerCase()) ||
        entry.component?.toLowerCase().includes(query.toLowerCase())
      );
    });
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsBySource: Record<string, number>;
    bufferSize: number;
    activeStreams: number;
    activeFiles: number;
  } {
    const logsByLevel: Record<string, number> = {};
    const logsBySource: Record<string, number> = {};

    for (const entry of this.buffer) {
      logsByLevel[entry.level] = (logsByLevel[entry.level] || 0) + 1;
      logsBySource[entry.source] = (logsBySource[entry.source] || 0) + 1;
    }

    return {
      totalLogs: this.buffer.length,
      logsByLevel,
      logsBySource,
      bufferSize: this.buffer.length,
      activeStreams: this.activeStreams.size,
      activeFiles: this.logFiles.size
    };
  }

  /**
   * Setup WebSocket integration
   */
  private setupWebSocketIntegration(): void {
    // Subscribe to log-related messages
    this.wsBridge.subscribe('bridge', 'logs');

    // Handle log subscription requests
    this.wsBridge.on('message:received', async (message) => {
      if (message.type === 'logs:subscribe') {
        const { level, source } = message.payload;
        this.setLogLevel(level || this.options.level, source);
      }

      if (message.type === 'logs:unsubscribe') {
        const { level, source } = message.payload;
        this.removeLogLevelFilter(level || this.options.level, source);
      }

      if (message.type === 'logs:get') {
        const { count, source, level } = message.payload;
        let logs = this.getRecentLogs(count || 100);

        if (source) {
          logs = logs.filter(entry => entry.source === source);
        }
        if (level) {
          logs = logs.filter(entry => entry.level === level);
        }

        await this.wsBridge.sendToClient(message.source, {
          type: 'logs:response',
          target: message.source,
          payload: { logs },
          responseTo: message.id
        });
      }

      if (message.type === 'logs:search') {
        const { query, field } = message.payload;
        const logs = this.searchLogs(query, field);

        await this.wsBridge.sendToClient(message.source, {
          type: 'logs:search_response',
          target: message.source,
          payload: { logs },
          responseTo: message.id
        });
      }

      if (message.type === 'logs:stats') {
        const stats = this.getStatistics();

        await this.wsBridge.sendToClient(message.source, {
          type: 'logs:stats_response',
          target: message.source,
          payload: { stats },
          responseTo: message.id
        });
      }
    });
  }

  /**
   * Start streaming application logs
   */
  private async startApplicationLogStreaming(): Promise<void> {
    // Stream from the main application log file
    const appLogPath = path.join(this.options.logDir, 'app.log');

    try {
      if (fs.existsSync(appLogPath)) {
        await this.streamLogFile(appLogPath, 'application');
      }
    } catch (error) {
      this.logger.warn('Failed to start application log streaming', { error });
    }
  }

  /**
   * Start streaming process logs
   */
  private async startProcessLogStreaming(): Promise<void> {
    // Monitor process log directory
    const processLogDir = path.join(this.options.logDir, 'processes');

    try {
      if (fs.existsSync(processLogDir)) {
        const files = await fs.promises.readdir(processLogDir);

        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(processLogDir, file);
            const source = file.replace('.log', '');
            await this.streamLogFile(filePath, source);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to start process log streaming', { error });
    }
  }

  /**
   * Start streaming system logs
   */
  private async startSystemLogStreaming(): Promise<void> {
    // Monitor system logs based on platform
    if (process.platform === 'darwin' || process.platform === 'linux') {
      try {
        const systemLogPath = process.platform === 'darwin' ? '/var/log/system.log' : '/var/log/syslog';

        // Check if we have permission to read system logs
        await fs.promises.access(systemLogPath, fs.constants.R_OK);
        await this.streamLogFile(systemLogPath, 'system');
      } catch (error) {
        this.logger.debug('Cannot access system logs (permission expected)', { error });
      }
    }
  }

  /**
   * Stream from a log file
   */
  private async streamLogFile(filePath: string, source: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, {
        encoding: 'utf8',
        start: 0, // Start from beginning, in production you might want to start from end
        flags: 'r'
      });

      this.activeStreams.set(source, stream);

      let buffer = '';

      stream.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const entry = this.parseLogLine(line, source);
              if (entry) {
                this.addLogEntry(entry);
              }
            } catch (error) {
              // Try to treat as plain text
              this.addLogEntry({
                level: 'info',
                message: line,
                source,
                formatted: line
              });
            }
          }
        }
      });

      stream.on('error', (error) => {
        this.logger.error('Log stream error', error, { source });
        this.emit('stream:error', { error, source });
        this.activeStreams.delete(source);
        reject(error);
      });

      stream.on('end', () => {
        this.logger.info('Log stream ended', { source });
        this.emit('stream:stopped', { source });
        this.activeStreams.delete(source);
        resolve();
      });

      // Handle incomplete buffer on stream end
      stream.on('close', () => {
        if (buffer.trim()) {
          try {
            const entry = this.parseLogLine(buffer, source);
            if (entry) {
              this.addLogEntry(entry);
            }
          } catch (error) {
            this.addLogEntry({
              level: 'info',
              message: buffer,
              source,
              formatted: buffer
            });
          }
        }
      });

      this.emit('stream:started', { source });
    });
  }

  /**
   * Parse a log line into a log entry
   */
  private parseLogLine(line: string, source: string): Omit<LogEntry, 'id' | 'timestamp' | 'formatted'> | null {
    // Try to parse as JSON first
    if (line.startsWith('{')) {
      try {
        const parsed = JSON.parse(line);
        return {
          level: parsed.level || 'info',
          message: parsed.message || line,
          source: source,
          component: parsed.component,
          metadata: parsed.metadata
        };
      } catch (error) {
        // Not valid JSON, continue to other parsing methods
      }
    }

    // Try to parse common log formats
    // Example: [2023-12-01T10:30:00.000Z] INFO: message
    const timestampMatch = line.match(/^\[([^\]]+)\]\s*(\w+):\s*(.*)$/);
    if (timestampMatch) {
      return {
        level: timestampMatch[2].toLowerCase() as 'debug' | 'info' | 'warn' | 'error',
        message: timestampMatch[3],
        source
      };
    }

    // Example: ERROR: message
    const levelMatch = line.match(/^(DEBUG|INFO|WARN|ERROR):\s*(.*)$/i);
    if (levelMatch) {
      return {
        level: levelMatch[1].toLowerCase() as 'debug' | 'info' | 'warn' | 'error',
        message: levelMatch[2],
        source
      };
    }

    // If no format matches, treat as info level
    return {
      level: 'info',
      message: line,
      source
    };
  }

  /**
   * Format a log entry
   */
  private formatLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp' | 'formatted'>): string {
    const timestamp = new Date().toISOString();
    const level = entry.level.toUpperCase();

    if (this.options.format === 'json') {
      return JSON.stringify({
        timestamp,
        level: entry.level,
        message: entry.message,
        source: entry.source,
        component: entry.component,
        metadata: entry.metadata
      });
    }

    // Text format
    const component = entry.component ? `[${entry.component}] ` : '';
    return `[${timestamp}] ${level}: ${component}${entry.message}`;
  }

  /**
   * Check if log should be processed based on filters
   */
  private shouldProcessLog(entry: LogEntry): boolean {
    // Check level filter
    const levelFilter = Array.from(this.filters).find(filter => !filter.includes(':'));
    if (levelFilter && !this.isLogLevelAllowed(entry.level, levelFilter as any)) {
      return false;
    }

    // Check source-specific filters
    const sourceFilter = Array.from(this.filters).find(filter => filter.includes(`${entry.source}:`));
    if (sourceFilter && !this.isLogLevelAllowed(entry.level, sourceFilter.split(':')[1] as any)) {
      return false;
    }

    return true;
  }

  /**
   * Check if log level is allowed
   */
  private isLogLevelAllowed(entryLevel: string, filterLevel: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const entryIndex = levels.indexOf(entryLevel);
    const filterIndex = levels.indexOf(filterLevel);

    return entryIndex >= filterIndex;
  }

  /**
   * Broadcast log entry to WebSocket clients
   */
  private broadcastLogEntry(entry: LogEntry): void {
    this.wsBridge.sendToTopic('logs', {
      type: 'log_entry',
      payload: entry,
      source: 'log_streamer'
    });
  }

  /**
   * Write log entry to file
   */
  private writeToLogFile(entry: LogEntry): void {
    const logFilePath = path.join(this.options.logDir, `${entry.source}.log`);

    if (!this.logFiles.has(entry.source)) {
      const fileStream = fs.createWriteStream(logFilePath, { flags: 'a' });
      this.logFiles.set(entry.source, fileStream);
    }

    const fileStream = this.logFiles.get(entry.source)!;
    fileStream.write(entry.formatted + '\n');
  }

  /**
   * Flush buffer to storage
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entriesToFlush = this.buffer.splice(0);

    try {
      // Write to aggregated log file
      const aggregatedLogPath = path.join(this.options.logDir, 'aggregated.log');
      await fs.promises.appendFile(
        aggregatedLogPath,
        entriesToFlush.map(entry => entry.formatted).join('\n') + '\n'
      );

      this.emit('log:flushed', { count: entriesToFlush.length, destination: 'aggregated.log' });
    } catch (error) {
      this.logger.error('Failed to flush log buffer', error);
      // Add entries back to buffer
      this.buffer.unshift(...entriesToFlush);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBuffer();
    }, this.options.flushInterval);
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopStreaming();
  }
}