import { WebSocketServer, WebSocket } from 'ws';
import { createServer, Server as HTTPServer } from 'http';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface WSMessage {
  id: string;
  type: string;
  source: string;
  target?: string | string[];
  payload: any;
  timestamp: Date;
  expectsResponse?: boolean;
  responseTo?: string;
  metadata?: any;
}

export interface WSClient {
  id: string;
  socket: WebSocket;
  type: 'cli' | 'gui' | 'agent' | 'system';
  authenticated: boolean;
  lastPing: Date;
  subscriptions: Set<string>;
  metadata?: any;
}

export interface WSBridgeEvents {
  'client:connected': WSClient;
  'client:disconnected': WSClient;
  'message:received': WSMessage;
  'message:sent': WSMessage;
  'message:broadcasted': WSMessage;
  'subscription:added': { clientId: string; topic: string };
  'subscription:removed': { clientId: string; topic: string };
  'error': { error: Error; clientId?: string };
}

export class WebSocketBridge extends EventEmitter {
  private server: HTTPServer;
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> client IDs
  private pendingResponses: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private logger: Logger;
  private port: number;
  private heartbeatInterval: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(port: number = 3004) {
    super();
    this.port = port;
    this.logger = new Logger().withContext({ component: 'WebSocketBridge' });
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  /**
   * Start the WebSocket bridge
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        this.logger.info('WebSocket bridge started', { port: this.port });
        resolve();
      });

      this.server.on('error', (error) => {
        this.logger.error('WebSocket bridge server error', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the WebSocket bridge
   */
  async stop(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.info('Stopping WebSocket bridge');

    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close();
    }
    this.clients.clear();

    // Close pending responses
    for (const [id, response] of this.pendingResponses.entries()) {
      clearTimeout(response.timeout);
      response.reject(new Error('WebSocket bridge is shutting down'));
    }
    this.pendingResponses.clear();

    // Close server
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          this.logger.info('WebSocket bridge stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Send a message to a specific client
   */
  async sendToClient(clientId: string, message: Omit<WSMessage, 'id' | 'timestamp'>): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (client.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`Client socket not open: ${clientId}`);
    }

    const fullMessage: WSMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    this.sendMessageToSocket(client.socket, fullMessage);
    this.emit('message:sent', fullMessage);
  }

  /**
   * Send a message to multiple clients
   */
  async sendToClients(clientIds: string[], message: Omit<WSMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: WSMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    for (const clientId of clientIds) {
      try {
        await this.sendToClient(clientId, fullMessage);
      } catch (error) {
        this.logger.warn('Failed to send message to client', {
          clientId,
          error: error instanceof Error ? error.message : error
        });
      }
    }
  }

  /**
   * Broadcast a message to all clients or filtered by type
   */
  async broadcast(message: Omit<WSMessage, 'id' | 'timestamp'>, clientType?: 'cli' | 'gui' | 'agent' | 'system'): Promise<void> {
    const targetClients = Array.from(this.clients.values())
      .filter(client => !clientType || client.type === clientType)
      .filter(client => client.socket.readyState === WebSocket.OPEN);

    if (targetClients.length === 0) {
      this.logger.debug('No target clients for broadcast', { clientType });
      return;
    }

    const fullMessage: WSMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    for (const client of targetClients) {
      try {
        this.sendMessageToSocket(client.socket, fullMessage);
      } catch (error) {
        this.logger.warn('Failed to broadcast to client', {
          clientId: client.id,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    this.emit('message:broadcasted', fullMessage);
    this.logger.debug('Message broadcasted', {
      clientType,
      clientCount: targetClients.length,
      messageType: message.type
    });
  }

  /**
   * Send a message to subscribers of a topic
   */
  async sendToTopic(topic: string, message: Omit<WSMessage, 'id' | 'timestamp'>): Promise<void> {
    const subscriberIds = this.subscriptions.get(topic);
    if (!subscriberIds || subscriberIds.size === 0) {
      this.logger.debug('No subscribers for topic', { topic });
      return;
    }

    const fullMessage: WSMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message,
      metadata: { ...message.metadata, topic }
    };

    for (const clientId of subscriberIds) {
      try {
        await this.sendToClient(clientId, fullMessage);
      } catch (error) {
        this.logger.warn('Failed to send message to topic subscriber', {
          topic,
          clientId,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    this.logger.debug('Message sent to topic', { topic, subscriberCount: subscriberIds.size });
  }

  /**
   * Send a request and wait for response
   */
  async request(message: Omit<WSMessage, 'id' | 'timestamp' | 'expectsResponse'>, timeout: number = 5000): Promise<any> {
    const fullMessage: WSMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      expectsResponse: true,
      ...message
    };

    return new Promise((resolve, reject) => {
      // Setup response handler
      const timeoutHandle = setTimeout(() => {
        this.pendingResponses.delete(fullMessage.id);
        reject(new Error(`Request timeout: ${message.type}`));
      }, timeout);

      this.pendingResponses.set(fullMessage.id, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      // Send the message
      if (message.target && typeof message.target === 'string') {
        this.sendToClient(message.target, fullMessage).catch((error) => {
          this.pendingResponses.delete(fullMessage.id);
          clearTimeout(timeoutHandle);
          reject(error);
        });
      } else {
        this.broadcast(message).catch((error) => {
          this.pendingResponses.delete(fullMessage.id);
          clearTimeout(timeoutHandle);
          reject(error);
        });
      }
    });
  }

  /**
   * Subscribe a client to a topic
   */
  subscribe(clientId: string, topic: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    // Add to client subscriptions
    client.subscriptions.add(topic);

    // Add to topic subscriptions
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(clientId);

    this.logger.debug('Client subscribed to topic', { clientId, topic });
    this.emit('subscription:added', { clientId, topic });
  }

  /**
   * Unsubscribe a client from a topic
   */
  unsubscribe(clientId: string, topic: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from client subscriptions
    client.subscriptions.delete(topic);

    // Remove from topic subscriptions
    const topicSubs = this.subscriptions.get(topic);
    if (topicSubs) {
      topicSubs.delete(clientId);
      if (topicSubs.size === 0) {
        this.subscriptions.delete(topic);
      }
    }

    this.logger.debug('Client unsubscribed from topic', { clientId, topic });
    this.emit('subscription:removed', { clientId, topic });
  }

  /**
   * Get connected clients
   */
  getClients(): WSClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get clients by type
   */
  getClientsByType(type: 'cli' | 'gui' | 'agent' | 'system'): WSClient[] {
    return Array.from(this.clients.values()).filter(client => client.type === type);
  }

  /**
   * Get topic subscribers
   */
  getTopicSubscribers(topic: string): WSClient[] {
    const subscriberIds = this.subscriptions.get(topic);
    if (!subscriberIds) return [];

    return Array.from(subscriberIds)
      .map(id => this.clients.get(id))
      .filter((client): client is WSClient => client !== undefined);
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, req) => {
      this.handleClientConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
      this.emit('error', { error });
    });
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(ws: WebSocket, req: any): void {
    const clientId = this.generateClientId();
    let clientType: 'cli' | 'gui' | 'agent' | 'system' | null = null;
    let isAuthenticated = false;

    const client: WSClient = {
      id: clientId,
      socket: ws,
      type: 'system', // Default type, will be updated after authentication
      authenticated: false,
      lastPing: new Date(),
      subscriptions: new Set()
    };

    this.clients.set(clientId, client);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        this.handleMessage(clientId, message);
      } catch (error) {
        this.logger.error('Invalid message from client', error instanceof Error ? error : new Error(String(error)), { clientId });
        this.sendError(clientId, 'Invalid message format');
      }
    });

    ws.on('close', (code, reason) => {
      this.logger.info('Client disconnected', { clientId, code, reason: reason.toString() });
      this.handleClientDisconnection(clientId);
    });

    ws.on('error', (error) => {
      this.logger.error('Client socket error', error, { clientId });
      this.emit('error', { error, clientId });
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = new Date();
      }
    });

    // Send welcome message
    this.sendWelcomeMessage(clientId);

    // Set authentication timeout
    setTimeout(() => {
      const client = this.clients.get(clientId);
      if (client && !client.authenticated) {
        this.logger.warn('Client authentication timeout', { clientId });
        ws.close(1008, 'Authentication timeout');
      }
    }, 10000);
  }

  /**
   * Handle received message
   */
  private handleMessage(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Handle authentication
    if (message.type === 'auth' && !client.authenticated) {
      this.handleAuthentication(clientId, message);
      return;
    }

    // Require authentication for all other messages
    if (!client.authenticated) {
      this.sendError(clientId, 'Authentication required');
      return;
    }

    // Update client type if provided
    if (message.metadata?.clientType) {
      client.type = message.metadata.clientType;
    }

    // Check if this is a response to a pending request
    if (message.responseTo && this.pendingResponses.has(message.responseTo)) {
      const response = this.pendingResponses.get(message.responseTo)!;
      this.pendingResponses.delete(message.responseTo);
      clearTimeout(response.timeout);

      if (message.payload.error) {
        response.reject(new Error(message.payload.error));
      } else {
        response.resolve(message.payload);
      }
      return;
    }

    // Handle subscription messages
    if (message.type === 'subscribe') {
      this.subscribe(clientId, message.payload.topic);
      return;
    }

    if (message.type === 'unsubscribe') {
      this.unsubscribe(clientId, message.payload.topic);
      return;
    }

    // Add source to message
    message.source = clientId;

    // Handle topic-based routing
    if (message.metadata?.topic) {
      this.sendToTopic(message.metadata.topic, message);
      return;
    }

    // Handle direct messaging
    if (message.target && typeof message.target === 'string') {
      this.sendToClient(message.target, message);
    } else if (message.target && Array.isArray(message.target)) {
      this.sendToClients(message.target, message);
    } else {
      // Broadcast to all
      this.broadcast({ ...message, source: clientId });
    }

    this.emit('message:received', message);
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { token, clientType } = message.payload;

    // Simple authentication - in production, use proper JWT validation
    if (token && clientType) {
      client.authenticated = true;
      client.type = clientType as 'cli' | 'gui' | 'agent' | 'system';
      client.metadata = message.payload.metadata;

      this.logger.info('Client authenticated', {
        clientId,
        clientType,
        metadata: client.metadata
      });

      this.sendToClient(clientId, {
        type: 'auth_success',
        target: clientId,
        payload: { clientId, clientType }
      });

      this.emit('client:connected', client);
    } else {
      this.sendError(clientId, 'Invalid authentication credentials');
      client.socket.close(1008, 'Authentication failed');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    for (const topic of client.subscriptions) {
      this.unsubscribe(clientId, topic);
    }

    // Remove client
    this.clients.delete(clientId);
    this.emit('client:disconnected', client);
  }

  /**
   * Send welcome message
   */
  private sendWelcomeMessage(clientId: string): void {
    this.sendToClient(clientId, {
      type: 'welcome',
      target: clientId,
      payload: {
        message: 'Welcome to Qwen Swarm WebSocket Bridge',
        bridgeVersion: '1.0.0',
        serverTime: new Date().toISOString()
      }
    });
  }

  /**
   * Send error message
   */
  private sendError(clientId: string, error: string): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) return;

    this.sendMessageToSocket(client.socket, {
      id: this.generateMessageId(),
      type: 'error',
      source: 'bridge',
      target: clientId,
      payload: { error },
      timestamp: new Date()
    });
  }

  /**
   * Send message to socket
   */
  private sendMessageToSocket(socket: WebSocket, message: WSMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error('Socket is not open');
    }

    const messageData = JSON.stringify(message);
    socket.send(messageData);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        if (client.socket.readyState === WebSocket.OPEN) {
          // Send ping
          client.socket.ping();

          // Check for timeout (no pong for 30 seconds)
          const timeSinceLastPing = Date.now() - client.lastPing.getTime();
          if (timeSinceLastPing > 30000) {
            this.logger.warn('Client timeout, closing connection', {
              clientId: client.id,
              timeSinceLastPing
            });
            client.socket.close(1000, 'Timeout');
          }
        }
      }
    }, 15000); // Send ping every 15 seconds
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `ws_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}