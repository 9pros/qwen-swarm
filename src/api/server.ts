import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import type { SwarmOrchestrator, SystemConfig } from '@/types';
import { Logger } from '@/utils/logger';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { validationMiddleware } from './middleware/validation';
import { errorHandler } from './middleware/error-handler';
import { agentsRouter } from './routes/agents';
import { tasksRouter } from './routes/tasks';
import { providersRouter } from './routes/providers';
import { consensusRouter } from './routes/consensus';
import { systemRouter } from './routes/system';
import { communicationRouter } from './routes/communication';

export class APIServer {
  private app: Application;
  private server: any;
  private wss: WebSocketServer;
  private orchestrator: SwarmOrchestrator;
  private config: SystemConfig;
  private logger: Logger;

  constructor(orchestrator: SwarmOrchestrator, config: SystemConfig) {
    this.orchestrator = orchestrator;
    this.config = config;
    this.logger = new Logger().withContext({ component: 'APIServer' });
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({
          port: this.config.websocket.port,
          path: this.config.websocket.path
        });

        this.setupWebSocket();

        this.server.listen(this.config.api.port, this.config.api.host, () => {
          this.logger.info('API server started', {
            port: this.config.api.port,
            host: this.config.api.host,
            environment: this.config.system.environment
          });
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.logger.error('API server error', error);
          reject(error);
        });

      } catch (error) {
        this.logger.error('Failed to start API server', error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }

      if (this.wss) {
        this.wss.close();
      }
    });
  }

  private setupMiddleware(): void {
    this.app.use(helmet());

    if (this.config.api.cors) {
      this.app.use(cors({
        origin: this.config.security.allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
      }));
    }

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.id);

      this.logger.debug('API request', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.info('API response', {
          requestId: req.id,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration
        });
      });

      next();
    });

    this.app.use(rateLimitMiddleware(this.config.api.rateLimit));
    this.app.use(authMiddleware(this.config.security, this.orchestrator));
    this.app.use(validationMiddleware);
  }

  private setupRoutes(): void {
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/metrics', this.getMetrics.bind(this));

    this.app.use('/api/v1/agents', agentsRouter(this.orchestrator));
    this.app.use('/api/v1/tasks', tasksRouter(this.orchestrator));
    this.app.use('/api/v1/providers', providersRouter(this.orchestrator));
    this.app.use('/api/v1/consensus', consensusRouter(this.orchestrator));
    this.app.use('/api/v1/system', systemRouter(this.orchestrator));
    this.app.use('/api/v1/communication', communicationRouter(this.orchestrator));

    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        requestId: req.id
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const agentId = req.headers['x-agent-id'] as string;
      const sessionId = req.headers['x-session-id'] as string;

      this.logger.info('WebSocket connection established', {
        agentId,
        sessionId,
        ip: req.socket.remoteAddress
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message, agentId, sessionId);
        } catch (error) {
          this.logger.error('WebSocket message error', error instanceof Error ? error : new Error(String(error)));
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        this.logger.info('WebSocket connection closed', { agentId });
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', error, { agentId });
      });

      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      }));
    });
  }

  private async handleWebSocketMessage(
    ws: any,
    message: any,
    agentId: string,
    sessionId: string
  ): Promise<void> {
    switch (message.type) {
      case 'heartbeat':
        ws.send(JSON.stringify({
          type: 'heartbeat_response',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'status_update':
        await this.handleStatusUpdate(agentId, message.data);
        break;

      case 'task_result':
        await this.handleTaskResult(agentId, message.data);
        break;

      default:
        this.logger.warn('Unknown WebSocket message type', { type: message.type, agentId });
    }
  }

  private async handleStatusUpdate(agentId: string, data: any): Promise<void> {
    this.logger.debug('Status update received', { agentId, data });
  }

  private async handleTaskResult(agentId: string, data: any): Promise<void> {
    this.logger.debug('Task result received', { agentId, data });
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.orchestrator.getSystemHealth();

      res.status(health.overall === 'healthy' ? 200 : 503).json({
        status: health.overall,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: this.config.system.version,
        health
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      const state = this.orchestrator.getSystemState();
      const isReady = state.status === 'running' && state.metrics.activeAgents > 0;

      res.status(isReady ? 200 : 503).json({
        ready: isReady,
        status: state.status,
        timestamp: new Date().toISOString(),
        agents: state.metrics.activeAgents
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const systemMetrics = this.orchestrator.getSystemState();
      const providerMetrics = this.orchestrator.getProviderMetrics();
      const communicationMetrics = this.orchestrator.getCommunicationMetrics();
      const consensusMetrics = this.orchestrator.getConsensusMetrics();

      const metrics = {
        system: systemMetrics.metrics,
        agents: {
          total: systemMetrics.metrics.agentCount,
          active: systemMetrics.metrics.activeAgents,
          taskQueue: systemMetrics.metrics.taskQueue
        },
        providers: Object.fromEntries(providerMetrics),
        communication: communicationMetrics,
        consensus: consensusMetrics,
        process: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        },
        timestamp: new Date().toISOString()
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: string;
        sessionId: string;
        permissions: string[];
      };
    }
  }
}