import { EventEmitter } from 'events';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { WebSocketBridge } from './websocket-bridge';
import { Logger } from '../utils/logger';

export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  ignorePaths: string[];
  debounceMs: number;
  extensions: string[];
  restartPatterns: string[];
  reloadPatterns: string[];
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
  extension: string;
  size?: number;
  timestamp: Date;
}

export interface ReloadEvent {
  type: 'restart' | 'reload' | 'config' | 'style';
  component: string;
  files: FileChangeEvent[];
  reason: string;
  timestamp: Date;
}

export interface HotReloadEvents {
  'file:changed': FileChangeEvent;
  'reload:triggered': ReloadEvent;
  'restart:triggered': ReloadEvent;
  'config:changed': FileChangeEvent[];
  'style:changed': FileChangeEvent[];
  'watcher:started': { paths: string[] };
  'watcher:error': { error: Error };
}

export class HotReloader extends EventEmitter {
  private wsBridge: WebSocketBridge;
  private config: HotReloadConfig;
  private logger: Logger;
  private watcher: chokidar.FSWatcher | null = null;
  private fileChangeBuffer: Map<string, FileChangeEvent[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isActive = false;

  constructor(wsBridge: WebSocketBridge, config: Partial<HotReloadConfig> = {}) {
    super();
    this.wsBridge = wsBridge;
    this.config = {
      enabled: true,
      watchPaths: [
        'src/**/*',
        'frontend/src/**/*',
        'config/**/*',
        'public/**/*'
      ],
      ignorePaths: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/logs/**',
        '**/*.log'
      ],
      debounceMs: 300,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html'],
      restartPatterns: [
        'src/index.ts',
        'src/main.ts',
        'src/server.ts',
        'src/api/**',
        'src/core/**',
        'package.json',
        'tsconfig.json'
      ],
      reloadPatterns: [
        'frontend/src/**/*',
        'public/**/*',
        '**/*.css',
        '**/*.scss',
        '**/*.html'
      ],
      ...config
    };
    this.logger = new Logger().withContext({ component: 'HotReloader' });
  }

  /**
   * Start hot reload monitoring
   */
  async start(): Promise<void> {
    if (this.isActive || !this.config.enabled) {
      return;
    }

    this.logger.info('Starting hot reload monitoring');

    try {
      // Setup file watcher
      await this.setupFileWatcher();

      // Setup WebSocket integration
      this.setupWebSocketIntegration();

      this.isActive = true;
      this.logger.info('Hot reload monitoring started', {
        watchPaths: this.config.watchPaths,
        ignorePaths: this.config.ignorePaths
      });

    } catch (error) {
      this.logger.error('Failed to start hot reload monitoring', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Stop hot reload monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.logger.info('Stopping hot reload monitoring');

    this.isActive = false;

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Clear buffer
    this.fileChangeBuffer.clear();

    this.logger.info('Hot reload monitoring stopped');
  }

  /**
   * Add a watch path
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);

      if (this.isActive && this.watcher) {
        this.watcher.add(watchPath);
      }

      this.logger.info('Watch path added', { watchPath });
    }
  }

  /**
   * Remove a watch path
   */
  removeWatchPath(watchPath: string): void {
    const index = this.config.watchPaths.indexOf(watchPath);
    if (index > -1) {
      this.config.watchPaths.splice(index, 1);

      if (this.isActive && this.watcher) {
        this.watcher.unwatch(watchPath);
      }

      this.logger.info('Watch path removed', { watchPath });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HotReloadConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.isActive) {
      // Restart monitoring with new config
      this.stop().then(() => this.start());
    }

    this.logger.info('Hot reload configuration updated');
  }

  /**
   * Get current statistics
   */
  getStatistics(): {
    isActive: boolean;
    watchedPaths: string[];
    bufferedChanges: number;
    debounceTimers: number;
  } {
    return {
      isActive: this.isActive,
      watchedPaths: this.config.watchPaths,
      bufferedChanges: Array.from(this.fileChangeBuffer.values()).reduce((sum, changes) => sum + changes.length, 0),
      debounceTimers: this.debounceTimers.size
    };
  }

  /**
   * Setup file watcher
   */
  private async setupFileWatcher(): Promise<void> {
    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: this.config.ignorePaths,
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: undefined,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    this.watcher
      .on('all', (eventType, filePath) => {
        this.handleFileChange(eventType as 'add' | 'change' | 'unlink', filePath);
      })
      .on('error', (error) => {
        this.logger.error('File watcher error', error);
        this.emit('watcher:error', { error });
      })
      .on('ready', () => {
        this.logger.info('File watcher ready');
        this.emit('watcher:started', { paths: this.config.watchPaths });
      });
  }

  /**
   * Handle file change event
   */
  private handleFileChange(type: 'add' | 'change' | 'unlink', filePath: string): void {
    const relativePath = path.relative(process.cwd(), filePath);
    const extension = path.extname(filePath);

    // Check if file extension is watched
    if (!this.config.extensions.includes(extension)) {
      return;
    }

    const fileChangeEvent: FileChangeEvent = {
      type,
      path: filePath,
      relativePath,
      extension,
      timestamp: new Date()
    };

    // Get file size if file exists
    if (type !== 'unlink') {
      try {
        const fs = require('fs');
        const stats = fs.statSync(filePath);
        fileChangeEvent.size = stats.size;
      } catch (error) {
        // File might be deleted or inaccessible
      }
    }

    this.emit('file:changed', fileChangeEvent);

    // Buffer the change for debounced processing
    this.bufferFileChange(fileChangeEvent);
  }

  /**
   * Buffer file change for debounced processing
   */
  private bufferFileChange(change: FileChangeEvent): void {
    // Group changes by component
    const component = this.determineComponent(change.relativePath);

    if (!this.fileChangeBuffer.has(component)) {
      this.fileChangeBuffer.set(component, []);
    }

    this.fileChangeBuffer.get(component)!.push(change);

    // Debounce processing
    const existingTimer = this.debounceTimers.get(component);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.processBufferedChanges(component);
    }, this.config.debounceMs);

    this.debounceTimers.set(component, timer);
  }

  /**
   * Process buffered file changes
   */
  private processBufferedChanges(component: string): void {
    const changes = this.fileChangeBuffer.get(component) || [];
    this.fileChangeBuffer.delete(component);
    this.debounceTimers.delete(component);

    if (changes.length === 0) {
      return;
    }

    this.logger.debug('Processing buffered file changes', {
      component,
      changeCount: changes.length
    });

    // Determine action based on file patterns
    const action = this.determineAction(changes);

    const reloadEvent: ReloadEvent = {
      type: action,
      component,
      files: changes,
      reason: this.generateReason(action, changes),
      timestamp: new Date()
    };

    // Execute action
    switch (action) {
      case 'restart':
        this.handleRestart(reloadEvent);
        break;
      case 'reload':
        this.handleReload(reloadEvent);
        break;
      case 'config':
        this.handleConfigChange(changes);
        break;
      case 'style':
        this.handleStyleChange(changes);
        break;
    }

    // Emit appropriate event
    if (action === 'restart') {
      this.emit('restart:triggered', reloadEvent);
    } else {
      this.emit('reload:triggered', reloadEvent);
    }
  }

  /**
   * Determine component from file path
   */
  private determineComponent(relativePath: string): string {
    if (relativePath.startsWith('frontend/src')) {
      return 'frontend';
    } else if (relativePath.startsWith('src/api')) {
      return 'api';
    } else if (relativePath.startsWith('src/core')) {
      return 'core';
    } else if (relativePath.startsWith('src/integration')) {
      return 'integration';
    } else if (relativePath.startsWith('config')) {
      return 'config';
    } else if (relativePath.startsWith('src/cli')) {
      return 'cli';
    } else if (relativePath.endsWith('.json')) {
      return 'config';
    } else {
      return 'backend';
    }
  }

  /**
   * Determine action based on file changes
   */
  private determineAction(changes: FileChangeEvent[]): 'restart' | 'reload' | 'config' | 'style' {
    // Check for restart patterns
    for (const change of changes) {
      if (this.matchesPatterns(change.relativePath, this.config.restartPatterns)) {
        return 'restart';
      }
    }

    // Check for configuration changes
    if (changes.some(change => change.extension === '.json' || change.relativePath.startsWith('config/'))) {
      return 'config';
    }

    // Check for style changes
    if (changes.some(change => ['.css', '.scss', '.less'].includes(change.extension))) {
      return 'style';
    }

    // Check for reload patterns
    for (const change of changes) {
      if (this.matchesPatterns(change.relativePath, this.config.reloadPatterns)) {
        return 'reload';
      }
    }

    // Default to restart for backend changes
    return changes.some(change => !change.relativePath.startsWith('frontend/')) ? 'restart' : 'reload';
  }

  /**
   * Check if path matches any pattern
   */
  private matchesPatterns(path: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      return regex.test(path);
    });
  }

  /**
   * Generate reason for reload
   */
  private generateReason(action: 'restart' | 'reload' | 'config' | 'style', changes: FileChangeEvent[]): string {
    const changeCount = changes.length;
    const fileNames = changes.map(c => path.basename(c.path)).slice(0, 3).join(', ');
    const moreText = changes.length > 3 ? ` and ${changes.length - 3} more` : '';

    switch (action) {
      case 'restart':
        return `Restart required: ${changeCount} files changed (${fileNames}${moreText})`;
      case 'reload':
        return `Reload triggered: ${changeCount} files changed (${fileNames}${moreText})`;
      case 'config':
        return `Configuration updated: ${changeCount} files changed`;
      case 'style':
        return `Styles updated: ${changeCount} files changed`;
      default:
        return `${changeCount} files changed`;
    }
  }

  /**
   * Handle component restart
   */
  private handleRestart(event: ReloadEvent): void {
    this.logger.info('Component restart triggered', {
      component: event.component,
      reason: event.reason
    });

    // Send restart command via WebSocket
    this.wsBridge.sendToTopic('system:control', {
      type: 'restart',
      payload: {
        component: event.component,
        reason: event.reason,
        files: event.files.map(f => f.relativePath)
      },
      source: 'hot_reloader'
    });
  }

  /**
   * Handle component reload
   */
  private handleReload(event: ReloadEvent): void {
    this.logger.info('Component reload triggered', {
      component: event.component,
      reason: event.reason
    });

    // Send reload command via WebSocket
    this.wsBridge.sendToTopic('system:control', {
      type: 'reload',
      payload: {
        component: event.component,
        reason: event.reason,
        files: event.files.map(f => f.relativePath)
      },
      source: 'hot_reloader'
    });
  }

  /**
   * Handle configuration change
   */
  private handleConfigChange(changes: FileChangeEvent[]): void {
    this.logger.info('Configuration change detected', {
      files: changes.map(c => c.relativePath)
    });

    this.emit('config:changed', changes);

    // Send config change notification
    this.wsBridge.sendToTopic('config:change', {
      type: 'config_updated',
      payload: {
        files: changes.map(c => ({
          path: c.relativePath,
          type: c.type,
          timestamp: c.timestamp
        }))
      },
      source: 'hot_reloader'
    });
  }

  /**
   * Handle style change
   */
  private handleStyleChange(changes: FileChangeEvent[]): void {
    this.logger.info('Style change detected', {
      files: changes.map(c => c.relativePath)
    });

    this.emit('style:changed', changes);

    // Send style update to frontend clients
    this.wsBridge.sendToClients(
      this.wsBridge.getClientsByType('gui').map(c => c.id),
      {
        type: 'style_update',
        payload: {
          files: changes.map(c => c.relativePath),
          timestamp: new Date().toISOString()
        },
        source: 'hot_reloader'
      }
    );
  }

  /**
   * Setup WebSocket integration
   */
  private setupWebSocketIntegration(): void {
    // Listen for hot reload commands
    this.wsBridge.on('message:received', async (message) => {
      if (message.type === 'hot_reload:control') {
        const { action, component } = message.payload;

        switch (action) {
          case 'enable':
            if (!this.config.enabled) {
              this.config.enabled = true;
              await this.start();
            }
            break;

          case 'disable':
            if (this.config.enabled) {
              await this.stop();
              this.config.enabled = false;
            }
            break;

          case 'restart_component':
            this.handleRestart({
              type: 'restart',
              component,
              files: [],
              reason: 'Manual restart requested',
              timestamp: new Date()
            });
            break;

          case 'reload_component':
            this.handleReload({
              type: 'reload',
              component,
              files: [],
              reason: 'Manual reload requested',
              timestamp: new Date()
            });
            break;
        }
      }

      if (message.type === 'hot_reload:status') {
        // Send current status
        await this.wsBridge.sendToClient(message.source, {
          type: 'hot_reload:status_response',
          target: message.source,
          payload: {
            enabled: this.config.enabled,
            active: this.isActive,
            statistics: this.getStatistics()
          },
          responseTo: message.id
        });
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
  }
}