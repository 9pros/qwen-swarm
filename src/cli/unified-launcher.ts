import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

export interface LaunchConfig {
  backend?: {
    port: number;
    host: string;
    env: 'development' | 'production' | 'staging';
    autoRestart: boolean;
  };
  gui?: {
    port: number;
    autoOpen: boolean;
    env: 'development' | 'production';
  };
  integration?: {
    enabled: boolean;
    bridgePort: number;
    wsPort: number;
    ipcPath?: string;
  };
  development?: {
    hotReload: boolean;
    debug: boolean;
    watchMode: boolean;
  };
}

export interface ProcessStatus {
  name: string;
  pid?: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startTime?: Date;
  restartCount: number;
  lastError?: string;
  port?: number;
  health?: 'healthy' | 'unhealthy' | 'unknown';
}

export interface LaunchEvents {
  'process:started': ProcessStatus;
  'process:stopped': ProcessStatus;
  'process:error': ProcessStatus;
  'system:ready': { components: string[] };
  'system:error': { error: string };
  'shutdown:complete': void;
}

export class UnifiedLauncher extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private processStatuses: Map<string, ProcessStatus> = new Map();
  private config: LaunchConfig;
  private logger: Logger;
  private isShuttingDown = false;

  constructor(config: LaunchConfig = {}) {
    super();
    this.config = this.mergeWithDefaults(config);
    this.logger = new Logger().withContext({ component: 'UnifiedLauncher' });
    this.setupGracefulShutdown();
  }

  /**
   * Launch the complete system
   */
  async launch(): Promise<void> {
    this.logger.info('Launching unified Qwen Swarm system');

    try {
      const components: string[] = [];

      // 1. Check prerequisites
      await this.checkPrerequisites();

      // 2. Start backend
      if (await this.shouldStartBackend()) {
        await this.startBackend();
        components.push('backend');
      }

      // 3. Start GUI
      if (this.config.gui && await this.shouldStartGUI()) {
        await this.startGUI();
        components.push('gui');
      }

      // 4. Start integration services
      if (this.config.integration?.enabled) {
        await this.startIntegrationServices();
        components.push('integration');
      }

      // 5. Wait for health checks
      await this.waitForHealthCheck();

      // 6. Auto-open GUI if configured
      if (this.config.gui?.autoOpen && components.includes('gui')) {
        await this.openGUIInBrowser();
      }

      this.emit('system:ready', { components });

      this.logger.info('Qwen Swarm system launched successfully', {
        components,
        backendPort: this.config.backend?.port,
        guiPort: this.config.gui?.port
      });

    } catch (error) {
      this.logger.error('Failed to launch system', error instanceof Error ? error : new Error(String(error)));
      this.emit('system:error', { error: error instanceof Error ? error.message : String(error) });
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Launch in development mode
   */
  async launchDevelopment(): Promise<void> {
    this.logger.info('Launching Qwen Swarm in development mode');

    // Override config for development
    this.config.development = {
      hotReload: true,
      debug: true,
      watchMode: true,
      ...this.config.development
    };

    if (this.config.backend) {
      this.config.backend.env = 'development';
    }
    if (this.config.gui) {
      this.config.gui.env = 'development';
    }

    await this.launch();

    this.logger.info('Development environment ready', {
      hotReload: this.config.development.hotReload,
      debug: this.config.development.debug,
      watchMode: this.config.development.watchMode
    });
  }

  /**
   * Get status of all processes
   */
  getProcessStatuses(): ProcessStatus[] {
    return Array.from(this.processStatuses.values());
  }

  /**
   * Get status of a specific process
   */
  getProcessStatus(name: string): ProcessStatus | undefined {
    return this.processStatuses.get(name);
  }

  /**
   * Restart a specific process
   */
  async restartProcess(name: string): Promise<void> {
    this.logger.info('Restarting process', { name });

    const status = this.processStatuses.get(name);
    if (!status) {
      throw new Error(`Process not found: ${name}`);
    }

    // Stop the process
    await this.stopProcess(name);

    // Brief delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Restart based on process type
    switch (name) {
      case 'backend':
        await this.startBackend();
        break;
      case 'gui':
        await this.startGUI();
        break;
      default:
        throw new Error(`Unknown process type: ${name}`);
    }
  }

  /**
   * Shutdown all processes
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.info('Shutting down Qwen Swarm system');

    const shutdownPromises = Array.from(this.processes.keys()).map(name =>
      this.stopProcess(name).catch((error) => {
        this.logger.warn('Error stopping process', { name, error: error instanceof Error ? error.message : error });
      })
    );

    await Promise.all(shutdownPromises);

    this.emit('shutdown:complete');
    this.logger.info('Qwen Swarm system shutdown complete');
  }

  /**
   * Check prerequisites
   */
  private async checkPrerequisites(): Promise<void> {
    this.logger.info('Checking prerequisites');

    // Check if directories exist
    const requiredDirs = ['dist', 'frontend/node_modules'];
    for (const dir of requiredDirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        throw new Error(`Required directory not found: ${dir}. Please run 'npm run build' and 'npm run install:frontend'`);
      }
    }

    // Check if required files exist
    const requiredFiles = ['dist/index.js', 'frontend/package.json'];
    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        throw new Error(`Required file not found: ${file}. Please ensure the project is properly built.`);
      }
    }

    this.logger.info('Prerequisites check passed');
  }

  /**
   * Determine if backend should be started
   */
  private async shouldStartBackend(): Promise<boolean> {
    if (!this.config.backend) return false;

    // Check if backend is already running on the configured port
    try {
      const response = await fetch(`http://localhost:${this.config.backend.port}/health`, {
        method: 'HEAD',
        timeout: 2000
      });
      return !response.ok;
    } catch (error) {
      return true; // Not running, should start
    }
  }

  /**
   * Determine if GUI should be started
   */
  private async shouldStartGUI(): Promise<boolean> {
    if (!this.config.gui) return false;

    // Check if GUI is already running on the configured port
    try {
      const response = await fetch(`http://localhost:${this.config.gui.port}`, {
        method: 'HEAD',
        timeout: 2000
      });
      return !response.ok;
    } catch (error) {
      return true; // Not running, should start
    }
  }

  /**
   * Start the backend process
   */
  private async startBackend(): Promise<void> {
    const status: ProcessStatus = {
      name: 'backend',
      status: 'starting',
      restartCount: 0
    };

    this.processStatuses.set('backend', status);

    const env = {
      ...process.env,
      NODE_ENV: this.config.backend?.env || 'development',
      PORT: this.config.backend?.port?.toString() || '3000',
      ...(this.config.development?.debug && { DEBUG: 'true' })
    };

    const process = spawn('node', ['dist/index.js'], {
      cwd: process.cwd(),
      env,
      stdio: this.config.development?.debug ? 'inherit' : 'pipe'
    });

    this.processes.set('backend', process);
    status.pid = process.pid;
    status.port = this.config.backend?.port;

    process.on('spawn', () => {
      this.logger.info('Backend process started', { pid: process.pid });
      status.status = 'running';
      status.startTime = new Date();
      this.emit('process:started', status);
    });

    process.on('exit', (code) => {
      this.logger.info('Backend process exited', { code });
      status.status = code === 0 ? 'stopped' : 'error';
      this.processes.delete('backend');
      this.emit('process:stopped', status);

      // Auto-restart if configured
      if (code !== 0 && this.config.backend?.autoRestart && !this.isShuttingDown) {
        status.restartCount++;
        this.logger.info('Auto-restarting backend', { restartCount: status.restartCount });
        setTimeout(() => this.startBackend(), 3000);
      }
    });

    process.on('error', (error) => {
      this.logger.error('Backend process error', error);
      status.status = 'error';
      status.lastError = error.message;
      this.emit('process:error', status);
    });

    if (!this.config.development?.debug) {
      this.setupProcessLogging(process, 'backend');
    }
  }

  /**
   * Start the GUI process
   */
  private async startGUI(): Promise<void> {
    const status: ProcessStatus = {
      name: 'gui',
      status: 'starting',
      restartCount: 0
    };

    this.processStatuses.set('gui', status);

    const command = this.config.gui?.env === 'development' ? 'npm' : 'npm';
    const args = this.config.gui?.env === 'development'
      ? ['run', 'dev']
      : ['run', 'preview'];

    const env = {
      ...process.env,
      PORT: this.config.gui?.port?.toString() || '5173',
      VITE_API_URL: `http://localhost:${this.config.backend?.port || 3000}`
    };

    const process = spawn(command, args, {
      cwd: path.join(process.cwd(), 'frontend'),
      env,
      stdio: this.config.development?.debug ? 'inherit' : 'pipe'
    });

    this.processes.set('gui', process);
    status.pid = process.pid;
    status.port = this.config.gui?.port;

    process.on('spawn', () => {
      this.logger.info('GUI process started', { pid: process.pid });
      status.status = 'running';
      status.startTime = new Date();
      this.emit('process:started', status);
    });

    process.on('exit', (code) => {
      this.logger.info('GUI process exited', { code });
      status.status = code === 0 ? 'stopped' : 'error';
      this.processes.delete('gui');
      this.emit('process:stopped', status);

      // Auto-restart if configured
      if (code !== 0 && this.config.backend?.autoRestart && !this.isShuttingDown) {
        status.restartCount++;
        this.logger.info('Auto-restarting GUI', { restartCount: status.restartCount });
        setTimeout(() => this.startGUI(), 3000);
      }
    });

    process.on('error', (error) => {
      this.logger.error('GUI process error', error);
      status.status = 'error';
      status.lastError = error.message;
      this.emit('process:error', status);
    });

    if (!this.config.development?.debug) {
      this.setupProcessLogging(process, 'gui');
    }
  }

  /**
   * Start integration services
   */
  private async startIntegrationServices(): Promise<void> {
    this.logger.info('Starting integration services');

    // In a real implementation, you would start the CLI-GUI bridge,
    // IPC bridge, and other integration services here
    this.logger.info('Integration services started');
  }

  /**
   * Wait for health checks
   */
  private async waitForHealthCheck(): Promise<void> {
    this.logger.info('Waiting for health checks');

    const healthChecks = [];

    if (this.config.backend) {
      healthChecks.push(this.checkHealth(`http://localhost:${this.config.backend.port}/health`));
    }

    if (this.config.gui) {
      healthChecks.push(this.checkHealth(`http://localhost:${this.config.gui.port}`));
    }

    try {
      await Promise.all(healthChecks);
      this.logger.info('All health checks passed');
    } catch (error) {
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Check health of a service
   */
  private async checkHealth(url: string): Promise<void> {
    const maxAttempts = 30;
    const delay = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, { method: 'GET', timeout: 5000 });
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }

      if (attempt === maxAttempts) {
        throw new Error(`Health check failed for ${url} after ${maxAttempts} attempts`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Open GUI in default browser
   */
  private async openGUIInBrowser(): Promise<void> {
    if (!this.config.gui?.port) return;

    const url = `http://localhost:${this.config.gui.port}`;
    const start = process.platform === 'darwin' ? 'open' :
                 process.platform === 'win32' ? 'start' : 'xdg-open';

    const browserProcess = spawn(start, [url], { detached: true, stdio: 'ignore' });
    browserProcess.unref();

    this.logger.info('GUI opened in browser', { url });
  }

  /**
   * Stop a specific process
   */
  private async stopProcess(name: string): Promise<void> {
    const process = this.processes.get(name);
    const status = this.processStatuses.get(name);

    if (!process || !status) {
      this.logger.warn('Process not found for stopping', { name });
      return;
    }

    return new Promise((resolve) => {
      process.on('exit', () => {
        this.processes.delete(name);
        resolve();
      });

      process.kill('SIGTERM');

      // Force kill if doesn't stop within 10 seconds
      setTimeout(() => {
        if (process && !process.killed) {
          this.logger.warn('Force killing process', { name });
          process.kill('SIGKILL');
        }
      }, 10000);
    });
  }

  /**
   * Setup logging for a process
   */
  private setupProcessLogging(process: ChildProcess, name: string): void {
    process.stdout?.on('data', (data) => {
      this.logger.info(`[${name.toUpperCase()}] ${data.toString().trim()}`);
    });

    process.stderr?.on('data', (data) => {
      this.logger.error(`[${name.toUpperCase()}] ${data.toString().trim()}`);
    });
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: LaunchConfig): LaunchConfig {
    return {
      backend: {
        port: 3000,
        host: 'localhost',
        env: 'development',
        autoRestart: true,
        ...config.backend
      },
      gui: {
        port: 5173,
        autoOpen: false,
        env: 'development',
        ...config.gui
      },
      integration: {
        enabled: true,
        bridgePort: 3002,
        wsPort: 3003,
        ...config.integration
      },
      development: {
        hotReload: false,
        debug: false,
        watchMode: false,
        ...config.development
      }
    };
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      if (!this.isShuttingDown) {
        await this.shutdown();
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}