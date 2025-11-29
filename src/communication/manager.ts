import EventEmitter from 'eventemitter3';
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { Message, MessageType, MessagePriority } from '@/types';
import { Logger } from '@/utils/logger';

export interface CommunicationEvents {
  'message:sent': (message: Message) => void;
  'message:received': (message: Message) => void;
  'message:delivered': (messageId: string, recipientId: string) => void;
  'message:failed': (messageId: string, error: Error) => void;
  'connection:established': (agentId: string) => void;
  'connection:lost': (agentId: string) => void;
  'broadcast:sent': (message: Message) => void;
  'multicast:sent': (message: Message, recipients: string[]) => void;
}

export interface MessageRoute {
  pattern: string | RegExp;
  handler: (message: Message) => Promise<Message | void>;
  priority: number;
  middleware?: Array<(message: Message, next: () => Promise<void>) => Promise<void>>;
}

export interface CommunicationMetrics {
  messagesSent: number;
  messagesReceived: number;
  messagesDelivered: number;
  messagesFailed: number;
  averageLatency: number;
  totalBytesTransferred: number;
  activeConnections: number;
  lastActivity: Date;
}

export class CommunicationManager extends EventEmitter<CommunicationEvents> {
  private agentId: string;
  private connections: Map<string, WebSocket> = new Map();
  private messageQueue: Map<string, Message[]> = new Map();
  private routes: MessageRoute[] = [];
  private metrics: CommunicationMetrics;
  private logger: Logger;
  private wsServer: WebSocketServer | null = null;
  private messageHandlers: Map<string, (message: Message) => Promise<void>> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries: number = 3;

  constructor(agentId: string, port?: number) {
    super();
    this.agentId = agentId;
    this.logger = new Logger().withContext({ component: 'CommunicationManager', agentId });
    this.metrics = this.initializeMetrics();

    if (port) {
      this.startServer(port);
    }
  }

  public async sendMessage(
    to: string | string[],
    type: MessageType,
    payload: unknown,
    priority: MessagePriority = MessagePriority.NORMAL,
    options: {
      encrypted?: boolean;
      timeout?: number;
      retries?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const messageId = uuidv4();
    const message: Message = {
      id: messageId,
      from: this.agentId,
      to,
      type,
      payload,
      timestamp: new Date(),
      priority,
      encrypted: options.encrypted || false,
      metadata: options.metadata || {}
    };

    try {
      await this.routeMessage(message);
      this.updateMetrics('sent', message);
      this.emit('message:sent', message);
      this.logger.debug('Message sent', { messageId, to, type });

      return messageId;
    } catch (error) {
      this.updateMetrics('failed', message);
      this.emit('message:failed', messageId, error instanceof Error ? error : new Error(String(error)));
      this.logger.error('Failed to send message', error instanceof Error ? error : new Error(String(error)), { messageId, to, type });
      throw error;
    }
  }

  public async broadcastMessage(
    type: MessageType,
    payload: unknown,
    priority: MessagePriority = MessagePriority.NORMAL,
    excludeSelf: boolean = true
  ): Promise<string[]> {
    const recipients = Array.from(this.connections.keys()).filter(
      id => !excludeSelf || id !== this.agentId
    );

    if (recipients.length === 0) {
      this.logger.debug('No recipients for broadcast');
      return [];
    }

    const messageId = uuidv4();
    const message: Message = {
      id: messageId,
      from: this.agentId,
      to: recipients,
      type,
      payload,
      timestamp: new Date(),
      priority,
      encrypted: false,
      metadata: { broadcast: true }
    };

    try {
      await this.deliverToMultiple(message, recipients);
      this.updateMetrics('sent', message);
      this.emit('broadcast:sent', message);
      this.logger.debug('Broadcast sent', { messageId, recipientCount: recipients.length, type });

      return recipients.map(recipient => `${messageId}:${recipient}`);
    } catch (error) {
      this.updateMetrics('failed', message);
      this.emit('message:failed', messageId, error instanceof Error ? error : new Error(String(error)));
      this.logger.error('Failed to broadcast message', error instanceof Error ? error : new Error(String(error)), { messageId });
      throw error;
    }
  }

  public async multicastMessage(
    recipients: string[],
    type: MessageType,
    payload: unknown,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<string[]> {
    const messageId = uuidv4();
    const message: Message = {
      id: messageId,
      from: this.agentId,
      to: recipients,
      type,
      payload,
      timestamp: new Date(),
      priority,
      encrypted: false,
      metadata: { multicast: true }
    };

    try {
      await this.deliverToMultiple(message, recipients);
      this.updateMetrics('sent', message);
      this.emit('multicast:sent', message, recipients);
      this.logger.debug('Multicast sent', { messageId, recipients, type });

      return recipients.map(recipient => `${messageId}:${recipient}`);
    } catch (error) {
      this.updateMetrics('failed', message);
      this.emit('message:failed', messageId, error instanceof Error ? error : new Error(String(error)));
      this.logger.error('Failed to multicast message', error instanceof Error ? error : new Error(String(error)), { messageId });
      throw error;
    }
  }

  public async connectToAgent(agentId: string, endpoint: string): Promise<void> {
    if (this.connections.has(agentId)) {
      this.logger.warn('Already connected to agent', { agentId });
      return;
    }

    try {
      const ws = new WebSocket(endpoint);
      await this.setupWebSocketConnection(agentId, ws);

      this.connections.set(agentId, ws);
      this.emit('connection:established', agentId);
      this.logger.info('Connected to agent', { agentId, endpoint });
    } catch (error) {
      this.logger.error('Failed to connect to agent', error instanceof Error ? error : new Error(String(error)), { agentId, endpoint });
      throw error;
    }
  }

  public disconnectFromAgent(agentId: string): void {
    const ws = this.connections.get(agentId);
    if (ws) {
      ws.close();
      this.connections.delete(agentId);
      this.messageQueue.delete(agentId);
      this.emit('connection:lost', agentId);
      this.logger.info('Disconnected from agent', { agentId });
    }
  }

  public addRoute(pattern: string | RegExp, handler: (message: Message) => Promise<Message | void>, priority: number = 0): void {
    this.routes.push({ pattern, handler, priority });
    this.routes.sort((a, b) => b.priority - a.priority);
    this.logger.debug('Route added', { pattern: pattern.toString(), priority });
  }

  public addMiddleware(
    pattern: string | RegExp,
    middleware: (message: Message, next: () => Promise<void>) => Promise<void>
  ): void {
    const route = this.routes.find(r => r.pattern === pattern);
    if (route) {
      if (!route.middleware) {
        route.middleware = [];
      }
      route.middleware.push(middleware);
      this.logger.debug('Middleware added', { pattern: pattern.toString() });
    } else {
      this.logger.warn('Route not found for middleware', { pattern: pattern.toString() });
    }
  }

  public registerMessageHandler(type: MessageType, handler: (message: Message) => Promise<void>): void {
    this.messageHandlers.set(type, handler);
    this.logger.debug('Message handler registered', { type });
  }

  public getConnectedAgents(): string[] {
    return Array.from(this.connections.keys());
  }

  public isAgentConnected(agentId: string): boolean {
    return this.connections.has(agentId) &&
           this.connections.get(agentId)?.readyState === WebSocket.OPEN;
  }

  public getMetrics(): CommunicationMetrics {
    this.metrics.activeConnections = this.getConnectedAgents().length;
    return { ...this.metrics };
  }

  public getConnectionStatus(agentId: string): 'connected' | 'connecting' | 'disconnected' | 'error' {
    const ws = this.connections.get(agentId);
    if (!ws) return 'disconnected';

    switch (ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'error';
    }
  }

  public async retryFailedMessage(messageId: string): Promise<void> {
    const retries = this.retryAttempts.get(messageId) || 0;
    if (retries >= this.maxRetries) {
      this.logger.error('Max retries exceeded for message', { messageId });
      return;
    }

    this.retryAttempts.set(messageId, retries + 1);
    this.logger.info('Retrying message', { messageId, attempt: retries + 1 });

    const queuedMessage = this.findQueuedMessage(messageId);
    if (queuedMessage) {
      try {
        await this.routeMessage(queuedMessage);
        this.retryAttempts.delete(messageId);
        this.logger.info('Message retry successful', { messageId });
      } catch (error) {
        this.logger.error('Message retry failed', error instanceof Error ? error : new Error(String(error)), { messageId });
      }
    }
  }

  private async routeMessage(message: Message): Promise<void> {
    for (const route of this.routes) {
      if (this.matchesPattern(message.type, route.pattern)) {
        try {
          await this.executeMiddleware(message, route.middleware);
          const result = await route.handler(message);
          if (result) {
            await this.routeMessage(result);
          }
          return;
        } catch (error) {
          this.logger.error('Route handler failed', error instanceof Error ? error : new Error(String(error)), { messageId: message.id, route: route.pattern.toString() });
          throw error;
        }
      }
    }

    if (typeof message.to === 'string') {
      await this.deliverMessage(message, message.to);
    } else {
      await this.deliverToMultiple(message, message.to);
    }
  }

  private async executeMiddleware(
    message: Message,
    middleware?: Array<(message: Message, next: () => Promise<void>) => Promise<void>>
  ): Promise<void> {
    if (!middleware || middleware.length === 0) {
      return;
    }

    for (const mw of middleware) {
      await new Promise<void>((resolve, reject) => {
        mw(message, async () => {
          try {
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }

  private async deliverMessage(message: Message, recipientId: string): Promise<void> {
    const ws = this.connections.get(recipientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      await this.queueMessage(message, recipientId);
      return;
    }

    try {
      const serializedMessage = JSON.stringify(message);
      ws.send(serializedMessage);
      this.updateMetrics('delivered', message);
      this.emit('message:delivered', message.id, recipientId);
    } catch (error) {
      await this.queueMessage(message, recipientId);
      throw error;
    }
  }

  private async deliverToMultiple(message: Message, recipients: string[]): Promise<void> {
    const deliveryPromises = recipients.map(async (recipientId) => {
      try {
        await this.deliverMessage(message, recipientId);
      } catch (error) {
        this.logger.error('Failed to deliver to recipient', error instanceof Error ? error : new Error(String(error)), { messageId: message.id, recipientId });
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  private async queueMessage(message: Message, recipientId: string): Promise<void> {
    if (!this.messageQueue.has(recipientId)) {
      this.messageQueue.set(recipientId, []);
    }
    this.messageQueue.get(recipientId)!.push(message);
    this.logger.debug('Message queued', { messageId: message.id, recipientId });
  }

  private async setupWebSocketConnection(agentId: string, ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.processQueuedMessages(agentId);
        resolve();
      });

      ws.on('message', async (data) => {
        try {
          const message: Message = JSON.parse(data.toString());
          await this.handleIncomingMessage(message);
        } catch (error) {
          this.logger.error('Failed to parse incoming message', error instanceof Error ? error : new Error(String(error)));
        }
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        this.connections.delete(agentId);
        this.emit('connection:lost', agentId);
        this.logger.info('Connection closed', { agentId });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logger.error('WebSocket error', error, { agentId });
        reject(error);
      });
    });
  }

  private async handleIncomingMessage(message: Message): Promise<void> {
    this.updateMetrics('received', message);
    this.emit('message:received', message);

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        this.logger.error('Message handler failed', error instanceof Error ? error : new Error(String(error)), { messageId: message.id, type: message.type });
      }
    }

    if (message.type === MessageType.HEARTBEAT) {
      await this.handleHeartbeat(message);
    }
  }

  private async handleHeartbeat(message: Message): Promise<void> {
    const response: Message = {
      id: uuidv4(),
      from: this.agentId,
      to: message.from,
      type: MessageType.HEARTBEAT,
      payload: { timestamp: new Date(), status: 'alive' },
      timestamp: new Date(),
      priority: MessagePriority.NORMAL,
      encrypted: false
    };

    await this.sendMessage(response.to, response.type, response.payload, response.priority);
  }

  private async processQueuedMessages(agentId: string): Promise<void> {
    const queue = this.messageQueue.get(agentId);
    if (!queue || queue.length === 0) {
      return;
    }

    this.logger.debug('Processing queued messages', { agentId, queueLength: queue.length });

    const messages = queue.splice(0);
    for (const message of messages) {
      try {
        await this.deliverMessage(message, agentId);
      } catch (error) {
        this.logger.error('Failed to deliver queued message', error instanceof Error ? error : new Error(String(error)), { messageId: message.id, agentId });
        queue.push(message);
      }
    }

    if (queue.length > 0) {
      this.messageQueue.set(agentId, queue);
    }
  }

  private startServer(port: number): void {
    this.wsServer = new WebSocketServer({ port });

    this.wsServer.on('connection', (ws, req) => {
      const agentId = req.headers['x-agent-id'] as string || `unknown-${uuidv4()}`;
      this.setupWebSocketConnection(agentId, ws).then(() => {
        this.connections.set(agentId, ws);
        this.emit('connection:established', agentId);
        this.logger.info('Incoming connection established', { agentId });
      }).catch(error => {
        this.logger.error('Failed to setup incoming connection', error instanceof Error ? error : new Error(String(error)), { agentId });
        ws.close();
      });
    });

    this.logger.info('WebSocket server started', { port });
  }

  private matchesPattern(type: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(type);
    }
    return type === pattern;
  }

  private updateMetrics(action: 'sent' | 'received' | 'delivered' | 'failed', message: Message): void {
    const messageSize = JSON.stringify(message).length;

    this.metrics.lastActivity = new Date();
    this.metrics.totalBytesTransferred += messageSize;

    switch (action) {
      case 'sent':
        this.metrics.messagesSent++;
        break;
      case 'received':
        this.metrics.messagesReceived++;
        break;
      case 'delivered':
        this.metrics.messagesDelivered++;
        break;
      case 'failed':
        this.metrics.messagesFailed++;
        break;
    }

    this.updateAverageLatency();
  }

  private updateAverageLatency(): void {
    const totalMessages = this.metrics.messagesSent + this.metrics.messagesReceived;
    if (totalMessages > 0) {
      this.metrics.averageLatency = this.metrics.totalBytesTransferred / totalMessages;
    }
  }

  private initializeMetrics(): CommunicationMetrics {
    return {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageLatency: 0,
      totalBytesTransferred: 0,
      activeConnections: 0,
      lastActivity: new Date()
    };
  }

  private findQueuedMessage(messageId: string): Message | undefined {
    for (const queue of this.messageQueue.values()) {
      const message = queue.find(m => m.id === messageId);
      if (message) {
        return message;
      }
    }
    return undefined;
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Communication Manager');

    for (const [agentId, ws] of this.connections) {
      try {
        ws.close();
      } catch (error) {
        this.logger.error('Error closing connection', error instanceof Error ? error : new Error(String(error)), { agentId });
      }
    }

    this.connections.clear();
    this.messageQueue.clear();
    this.routes = [];
    this.messageHandlers.clear();

    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    this.logger.info('Communication Manager shutdown complete');
  }
}