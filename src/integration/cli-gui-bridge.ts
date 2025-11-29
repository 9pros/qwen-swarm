import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createServer, Server as HTTPServer } from 'http';
import { WebSocketServer } from 'ws';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './logger';

export interface ProcessConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  autoRestart?: boolean;
  healthCheck?: {
    endpoint: string;
    interval: number;
    timeout: number;
  };
}

export interface ProcessStatus {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error' | 'restarting';
  pid?: number;
  startTime?: Date;
  restartCount: number;
  lastError?: string;
  health?: 'healthy' | 'unhealthy' | 'unknown';
  ports?: number[];
  logs: string[];
}

export interface CLIGUIBridgeEvents {
  'process:started': ProcessStatus;
  'process:stopped': ProcessStatus;
  'process:error': ProcessStatus;
  'process:restart': ProcessStatus;
  'process:health': ProcessStatus;
  'process:log': { processId: string; log: string; level: 'info' | 'warn' | 'error' };
  'gui:opened': { url: string };
  'gui:closed': void;
  'shutdown': void;
}

export class CLIGUIBridge extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private processConfigs: Map<string, ProcessConfig> = new Map();
  private processStatuses: Map<string, ProcessStatus> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private httpServer: HTTPServer | null = null;
  private wsServer: WebSocketServer | null = null;
  private wsClients: Set<any> = new Set();
  private isShuttingDown = false;
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'CLIGUIBridge' });
    this.setupGracefulShutdown();
  }

  /**
   * Initialize the CLI-GUI bridge
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing CLI-GUI Bridge');

    // Setup HTTP server for GUI communication
    await this.setupHTTPServer();

    // Setup WebSocket server for real-time communication
    await this.setupWebSocketServer();

    this.logger.info('CLI-GUI Bridge initialized successfully');
  }

  /**
   * Register a process configuration
   */
  registerProcess(config: ProcessConfig): void {
    this.processConfigs.set(config.id, config);

    // Initialize process status
    this.processStatuses.set(config.id, {
      id: config.id,
      name: config.name,
      status: 'stopped',
      restartCount: 0,
      logs: []
    });

    this.logger.info('Process registered', { config });
  }

  /**
   * Start a registered process
   */
  async startProcess(processId: string): Promise<void> {
    const config = this.processConfigs.get(processId);
    if (!config) {
      throw new Error(`Process configuration not found: ${processId}`);
    }

    const status = this.processStatuses.get(processId)!;

    if (status.status === 'running') {
      this.logger.warn('Process already running', { processId });
      return;
    }

    this.logger.info('Starting process', { processId, command: config.command });

    try {
      await this.startProcessInternal(config);
    } catch (error) {
      this.logger.error('Failed to start process', error instanceof Error ? error : new Error(String(error)), { processId });
      status.status = 'error';
      status.lastError = error instanceof Error ? error.message : String(error);
      this.emit('process:error', status);
      throw error;
    }
  }

  /**
   * Stop a running process
   */
  async stopProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    const status = this.processStatuses.get(processId);

    if (!process || !status || status.status !== 'running') {
      this.logger.warn('Process not running', { processId });
      return;
    }

    this.logger.info('Stopping process', { processId });

    // Clear health check
    const healthInterval = this.healthCheckIntervals.get(processId);
    if (healthInterval) {
      clearInterval(healthInterval);
      this.healthCheckIntervals.delete(processId);
    }

    return new Promise((resolve) => {
      process.on('exit', (code) => {
        this.logger.info('Process stopped', { processId, code });
        status.status = 'stopped';
        this.emit('process:stopped', status);
        this.processes.delete(processId);
        resolve();
      });

      process.kill('SIGTERM');

      // Force kill if doesn't stop within 10 seconds
      setTimeout(() => {
        if (process && !process.killed) {
          this.logger.warn('Force killing process', { processId });
          process.kill('SIGKILL');
        }
      }, 10000);
    });
  }

  /**
   * Restart a process
   */
  async restartProcess(processId: string): Promise<void> {
    const config = this.processConfigs.get(processId);
    if (!config) {
      throw new Error(`Process configuration not found: ${processId}`);
    }

    this.logger.info('Restarting process', { processId });

    const status = this.processStatuses.get(processId)!;
    status.status = 'restarting';
    status.restartCount++;
    this.emit('process:restart', status);

    await this.stopProcess(processId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await this.startProcess(processId);
  }

  /**
   * Get the status of all processes
   */
  getProcessStatuses(): ProcessStatus[] {
    return Array.from(this.processStatuses.values());
  }

  /**
   * Get status of a specific process
   */
  getProcessStatus(processId: string): ProcessStatus | undefined {
    return this.processStatuses.get(processId);
  }

  /**
   * Open GUI in default browser
   */
  async openGUI(port: number = 5173): Promise<void> {
    const url = `http://localhost:${port}`;

    try {
      // Check if GUI is already running
      const response = await fetch(url, { method: 'HEAD' }).catch(() => null);

      if (!response) {
        // Start GUI if not running
        await this.startProcess('gui');
      }

      // Open in browser
      const start = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open';

      const browserProcess = spawn(start, [url], { detached: true, stdio: 'ignore' });
      browserProcess.unref();

      this.logger.info('GUI opened in browser', { url });
      this.emit('gui:opened', { url });

    } catch (error) {
      this.logger.error('Failed to open GUI', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Setup HTTP server for GUI communication
   */
  private async setupHTTPServer(): Promise<void> {
    this.httpServer = createServer((req, res) => {
      this.handleHTTPRequest(req, res);
    });

    return new Promise((resolve) => {
      this.httpServer!.listen(3002, () => {
        this.logger.info('CLI-GUI bridge HTTP server started', { port: 3002 });
        resolve();
      });
    });
  }

  /**
   * Setup WebSocket server for real-time communication
   */
  private async setupWebSocketServer(): Promise<void> {
    this.wsServer = new WebSocketServer({ port: 3003 });

    this.wsServer.on('connection', (ws, req) => {
      this.logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });
      this.wsClients.add(ws);

      ws.on('close', () => {
        this.logger.info('WebSocket client disconnected');
        this.wsClients.delete(ws);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          this.logger.error('Invalid WebSocket message', error instanceof Error ? error : new Error(String(error)));
        }
      });

      // Send current process status
      ws.send(JSON.stringify({
        type: 'process_statuses',
        data: this.getProcessStatuses()
      }));
    });

    this.logger.info('CLI-GUI bridge WebSocket server started', { port: 3003 });
  }

  /**
   * Handle HTTP requests
   */
  private handleHTTPRequest(req: any, res: any): void {
    const url = new URL(req.url, `http://localhost:3002`);

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const routeHandlers: Record<string, (req: any, res: any, url: URL) => void> = {
      '/api/status': this.handleStatusRequest.bind(this),
      '/api/processes': this.handleProcessesRequest.bind(this),
      '/api/processes/start': this.handleStartProcessRequest.bind(this),
      '/api/processes/stop': this.handleStopProcessRequest.bind(this),
      '/api/processes/restart': this.handleRestartProcessRequest.bind(this),
      '/api/gui/open': this.handleOpenGUIRequest.bind(this),
    };

    const handler = routeHandlers[url.pathname];
    if (handler) {
      handler(req, res, url);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(ws: any, message: any): void {
    switch (message.type) {
      case 'get_status':
        ws.send(JSON.stringify({
          type: 'status_response',
          data: this.getProcessStatuses()
        }));
        break;

      case 'start_process':
        this.startProcess(message.processId).catch((error) => {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        });
        break;

      case 'stop_process':
        this.stopProcess(message.processId).catch((error) => {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        });
        break;

      case 'restart_process':
        this.restartProcess(message.processId).catch((error) => {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        });
        break;
    }
  }

  /**
   * Start process implementation
   */
  private async startProcessInternal(config: ProcessConfig): Promise<void> {
    const status = this.processStatuses.get(config.id)!;
    status.status = 'starting';
    status.lastError = undefined;

    const process = spawn(config.command, config.args, {
      cwd: config.cwd || process.cwd(),
      env: { ...process.env, ...config.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.processes.set(config.id, process);

    process.stdout?.on('data', (data) => {
      const log = data.toString();
      status.logs.push(`[STDOUT] ${log.trim()}`);
      if (status.logs.length > 1000) status.logs = status.logs.slice(-1000); // Keep last 1000 logs

      this.broadcastWebSocketMessage({
        type: 'process_log',
        data: {
          processId: config.id,
          log: log.trim(),
          level: 'info'
        }
      });

      this.emit('process:log', { processId: config.id, log: log.trim(), level: 'info' });
    });

    process.stderr?.on('data', (data) => {
      const log = data.toString();
      status.logs.push(`[STDERR] ${log.trim()}`);
      if (status.logs.length > 1000) status.logs = status.logs.slice(-1000);

      this.broadcastWebSocketMessage({
        type: 'process_log',
        data: {
          processId: config.id,
          log: log.trim(),
          level: 'error'
        }
      });

      this.emit('process:log', { processId: config.id, log: log.trim(), level: 'error' });
    });

    process.on('spawn', () => {
      this.logger.info('Process started', { processId: config.id, pid: process.pid });
      status.status = 'running';
      status.pid = process.pid;
      status.startTime = new Date();

      this.emit('process:started', status);
      this.broadcastWebSocketMessage({
        type: 'process_started',
        data: status
      });

      // Setup health check if configured
      if (config.healthCheck) {
        this.setupHealthCheck(config);
      }
    });

    process.on('exit', (code) => {
      this.logger.info('Process exited', { processId: config.id, code });
      this.processes.delete(config.id);

      // Clear health check
      const healthInterval = this.healthCheckIntervals.get(config.id);
      if (healthInterval) {
        clearInterval(healthInterval);
        this.healthCheckIntervals.delete(config.id);
      }

      if (status.status !== 'stopped' && config.autoRestart && !this.isShuttingDown) {
        this.logger.info('Auto-restarting process', { processId: config.id });
        setTimeout(() => {
          this.startProcessInternal(config).catch((error) => {
            this.logger.error('Auto-restart failed', error);
          });
        }, 5000);
      } else {
        status.status = code === 0 ? 'stopped' : 'error';
        status.lastError = code !== 0 ? `Process exited with code ${code}` : undefined;

        this.broadcastWebSocketMessage({
          type: 'process_stopped',
          data: status
        });

        this.emit('process:stopped', status);
      }
    });

    process.on('error', (error) => {
      this.logger.error('Process error', error, { processId: config.id });
      status.status = 'error';
      status.lastError = error.message;

      this.broadcastWebSocketMessage({
        type: 'process_error',
        data: status
      });

      this.emit('process:error', status);
    });
  }

  /**
   * Setup health check for a process
   */
  private setupHealthCheck(config: ProcessConfig): void {
    if (!config.healthCheck) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(config.healthCheck!.endpoint, {
          timeout: config.healthCheck!.timeout
        });

        const status = this.processStatuses.get(config.id)!;
        status.health = response.ok ? 'healthy' : 'unhealthy';

        this.broadcastWebSocketMessage({
          type: 'process_health',
          data: status
        });

        this.emit('process:health', status);

      } catch (error) {
        const status = this.processStatuses.get(config.id)!;
        status.health = 'unhealthy';

        this.broadcastWebSocketMessage({
          type: 'process_health',
          data: status
        });

        this.emit('process:health', status);
      }
    }, config.healthCheck.interval);

    this.healthCheckIntervals.set(config.id, interval);
  }

  /**
   * Broadcast message to all WebSocket clients
   */
  private broadcastWebSocketMessage(message: any): void {
    const messageStr = JSON.stringify(message);
    this.wsClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(messageStr);
      }
    });
  }

  /**
   * HTTP request handlers
   */
  private handleStatusRequest(req: any, res: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      processes: this.getProcessStatuses(),
      guiClients: this.wsClients.size
    }));
  }

  private handleProcessesRequest(req: any, res: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(this.getProcessStatuses()));
  }

  private async handleStartProcessRequest(req: any, res: any): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      await this.startProcess(body.processId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  }

  private async handleStopProcessRequest(req: any, res: any): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      await this.stopProcess(body.processId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  }

  private async handleRestartProcessRequest(req: any, res: any): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      await this.restartProcess(body.processId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  }

  private async handleOpenGUIRequest(req: any, res: any): Promise<void> {
    try {
      await this.openGUI();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  }

  private parseRequestBody(req: any): Promise<any> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(JSON.parse(body)));
    });
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      this.logger.info('Shutting down CLI-GUI Bridge');
      this.emit('shutdown');

      // Stop all processes
      const stopPromises = Array.from(this.processes.keys()).map(processId =>
        this.stopProcess(processId).catch(() => {}) // Ignore errors during shutdown
      );
      await Promise.all(stopPromises);

      // Close servers
      if (this.httpServer) {
        this.httpServer.close();
      }
      if (this.wsServer) {
        this.wsServer.close();
      }

      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}