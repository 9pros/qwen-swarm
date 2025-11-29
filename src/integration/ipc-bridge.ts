import { EventEmitter } from 'events';
import { createServer, Server as NetServer, Socket } from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

export interface IPCMessage {
  id: string;
  type: string;
  source: 'cli' | 'gui';
  target?: 'cli' | 'gui' | 'all';
  payload: any;
  timestamp: Date;
  expectsResponse?: boolean;
  responseTo?: string;
}

export interface IPCClient {
  id: string;
  type: 'cli' | 'gui';
  socket: Socket;
  lastSeen: Date;
  metadata?: any;
}

export interface IPCEvents {
  'client:connected': IPCClient;
  'client:disconnected': IPCClient;
  'message:received': IPCMessage;
  'message:sent': IPCMessage;
  'response:received': IPCMessage;
  'error': { error: Error; clientId?: string };
}

export class IPCBridge extends EventEmitter {
  private server: NetServer | null = null;
  private clients: Map<string, IPCClient> = new Map();
  private pendingResponses: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private socketPath: string;
  private logger: Logger;
  private isShuttingDown = false;

  constructor(socketPath?: string) {
    super();
    this.socketPath = socketPath || this.getDefaultSocketPath();
    this.logger = new Logger().withContext({ component: 'IPCBridge' });
  }

  /**
   * Initialize the IPC bridge
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing IPC bridge', { socketPath: this.socketPath });

    try {
      // Clean up existing socket file if it exists
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }

      // Create Unix socket server
      this.server = createServer((socket) => {
        this.handleClientConnection(socket);
      });

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.socketPath, () => {
          this.logger.info('IPC server started', { socketPath: this.socketPath });
          resolve();
        });

        this.server!.on('error', (error) => {
          this.logger.error('IPC server error', error);
          reject(error);
        });
      });

      // Setup cleanup on exit
      this.setupCleanup();

    } catch (error) {
      this.logger.error('Failed to initialize IPC bridge', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Send a message to a specific client
   */
  async sendToClient(clientId: string, message: Omit<IPCMessage, 'id' | 'timestamp'>): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const fullMessage: IPCMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    this.sendMessageToSocket(client.socket, fullMessage);
    this.emit('message:sent', fullMessage);
  }

  /**
   * Send a message to all clients or a specific type
   */
  async broadcast(message: Omit<IPCMessage, 'id' | 'timestamp'>, targetType?: 'cli' | 'gui'): Promise<void> {
    const targetClients = Array.from(this.clients.values())
      .filter(client => !targetType || client.type === targetType);

    if (targetClients.length === 0) {
      this.logger.warn('No target clients for broadcast', { targetType });
      return;
    }

    const fullMessage: IPCMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      ...message
    };

    for (const client of targetClients) {
      try {
        this.sendMessageToSocket(client.socket, fullMessage);
      } catch (error) {
        this.logger.error('Failed to send message to client', error instanceof Error ? error : new Error(String(error)), { clientId: client.id });
      }
    }

    this.emit('message:sent', fullMessage);
    this.logger.debug('Message broadcasted', { targetType, clientCount: targetClients.length });
  }

  /**
   * Send a message and wait for response
   */
  async request(message: Omit<IPCMessage, 'id' | 'timestamp' | 'expectsResponse'>, timeout: number = 5000): Promise<any> {
    const fullMessage: IPCMessage = {
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
      this.broadcast(message).catch((error) => {
        this.pendingResponses.delete(fullMessage.id);
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Get connected clients
   */
  getClients(): IPCClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get clients by type
   */
  getClientsByType(type: 'cli' | 'gui'): IPCClient[] {
    return Array.from(this.clients.values()).filter(client => client.type === type);
  }

  /**
   * Check if a specific client type is connected
   */
  hasClientType(type: 'cli' | 'gui'): boolean {
    return Array.from(this.clients.values()).some(client => client.type === type);
  }

  /**
   * Disconnect a specific client
   */
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.destroy();
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.info('Shutting down IPC bridge');

    // Disconnect all clients
    for (const client of this.clients.values()) {
      client.socket.destroy();
    }
    this.clients.clear();

    // Clear pending responses
    for (const [id, response] of this.pendingResponses.entries()) {
      clearTimeout(response.timeout);
      response.reject(new Error('IPC bridge is shutting down'));
    }
    this.pendingResponses.clear();

    // Close server
    if (this.server) {
      this.server.close();

      // Remove socket file
      try {
        if (fs.existsSync(this.socketPath)) {
          fs.unlinkSync(this.socketPath);
        }
      } catch (error) {
        this.logger.warn('Failed to remove socket file', { error, socketPath: this.socketPath });
      }
    }

    this.logger.info('IPC bridge shutdown complete');
  }

  /**
   * Handle new client connection
   */
  private handleClientConnection(socket: Socket): void {
    const clientId = this.generateClientId();
    let clientType: 'cli' | 'gui' | null = null;
    let clientMetadata: any = null;

    socket.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString()) as IPCMessage;

        // Handle authentication/hello message
        if (message.type === 'hello') {
          clientType = message.payload.type as 'cli' | 'gui';
          clientMetadata = message.payload.metadata;

          if (!clientType || !['cli', 'gui'].includes(clientType)) {
            socket.destroy();
            return;
          }

          const client: IPCClient = {
            id: clientId,
            type: clientType,
            socket,
            lastSeen: new Date(),
            metadata: clientMetadata
          };

          this.clients.set(clientId, client);
          this.logger.info('Client connected', { clientId, type: clientType });
          this.emit('client:connected', client);

          // Send welcome message
          this.sendMessageToSocket(socket, {
            id: this.generateMessageId(),
            type: 'welcome',
            source: 'bridge',
            target: clientType,
            payload: { clientId, bridgeVersion: '1.0.0' },
            timestamp: new Date()
          });

          return;
        }

        // Regular message handling
        if (clientType && this.clients.has(clientId)) {
          this.handleMessage(clientId, message);
        }

      } catch (error) {
        this.logger.error('Invalid message from client', error instanceof Error ? error : new Error(String(error)), { clientId });
      }
    });

    socket.on('close', () => {
      if (this.clients.has(clientId)) {
        const client = this.clients.get(clientId)!;
        this.logger.info('Client disconnected', { clientId, type: client.type });
        this.emit('client:disconnected', client);
        this.clients.delete(clientId);
      }
    });

    socket.on('error', (error) => {
      this.logger.error('Client socket error', error, { clientId });
      this.emit('error', { error, clientId });
    });

    // Set timeout for authentication
    setTimeout(() => {
      if (!clientType && this.clients.has(clientId)) {
        socket.destroy();
      }
    }, 5000);
  }

  /**
   * Handle received message
   */
  private handleMessage(clientId: string, message: IPCMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Update last seen
    client.lastSeen = new Date();

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

      this.emit('response:received', message);
      return;
    }

    // Forward message to target clients
    if (message.target && message.target !== 'all') {
      const targetClients = this.getClientsByType(message.target as 'cli' | 'gui');
      for (const targetClient of targetClients) {
        if (targetClient.id !== clientId) {
          this.sendMessageToSocket(targetClient.socket, message);
        }
      }
    } else if (message.target === 'all' || !message.target) {
      // Broadcast to all other clients
      for (const [id, targetClient] of this.clients.entries()) {
        if (id !== clientId) {
          this.sendMessageToSocket(targetClient.socket, message);
        }
      }
    }

    this.emit('message:received', message);
  }

  /**
   * Send message to specific socket
   */
  private sendMessageToSocket(socket: Socket, message: IPCMessage): void {
    if (socket.destroyed) {
      throw new Error('Socket is destroyed');
    }

    const messageData = JSON.stringify(message);
    socket.write(messageData);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default socket path based on platform
   */
  private getDefaultSocketPath(): string {
    const tmpDir = process.platform === 'win32' ? '\\\\.\\pipe\\' : '/tmp';
    const appName = 'qwen-swarm';
    return path.join(tmpDir, `${appName}.ipc`);
  }

  /**
   * Setup cleanup on process exit
   */
  private setupCleanup(): void {
    const cleanup = async () => {
      if (!this.isShuttingDown) {
        await this.shutdown();
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }
}

/**
 * IPC Client class for connecting to the bridge
 */
export class IPCClient {
  private socket: Socket | null = null;
  private clientId: string | null = null;
  private clientType: 'cli' | 'gui';
  private messageHandlers: Map<string, (message: IPCMessage) => void> = new Map();
  private logger: Logger;
  private socketPath: string;

  constructor(clientType: 'cli' | 'gui', socketPath?: string) {
    this.clientType = clientType;
    this.socketPath = socketPath || this.getDefaultSocketPath();
    this.logger = new Logger().withContext({ component: `IPCClient:${clientType}` });
  }

  /**
   * Connect to the IPC bridge
   */
  async connect(metadata?: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new Socket();

      this.socket.connect(this.socketPath, () => {
        this.logger.info('Connected to IPC bridge');

        // Send hello message
        this.sendMessage({
          type: 'hello',
          payload: { type: this.clientType, metadata }
        });

        resolve();
      });

      this.socket.on('data', (data) => {
        try {
          const message = JSON.parse(data.toString()) as IPCMessage;
          this.handleMessage(message);
        } catch (error) {
          this.logger.error('Invalid message received', error instanceof Error ? error : new Error(String(error)));
        }
      });

      this.socket.on('close', () => {
        this.logger.info('Disconnected from IPC bridge');
        this.socket = null;
        this.clientId = null;
      });

      this.socket.on('error', (error) => {
        this.logger.error('IPC client error', error);
        if (!this.clientId) {
          reject(error);
        }
      });
    });
  }

  /**
   * Disconnect from the IPC bridge
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
    }
  }

  /**
   * Send a message
   */
  sendMessage(message: Omit<IPCMessage, 'id' | 'timestamp' | 'source'>): void {
    if (!this.socket || !this.clientId) {
      throw new Error('Not connected to IPC bridge');
    }

    const fullMessage: IPCMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      source: this.clientType,
      ...message
    };

    this.socket.write(JSON.stringify(fullMessage));
  }

  /**
   * Send a request and wait for response
   */
  async request(message: Omit<IPCMessage, 'id' | 'timestamp' | 'source' | 'expectsResponse'>, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();

      // Setup response handler
      const handleResponse = (responseMessage: IPCMessage) => {
        if (responseMessage.responseTo === messageId) {
          this.messageHandlers.delete('response');

          if (responseMessage.payload.error) {
            reject(new Error(responseMessage.payload.error));
          } else {
            resolve(responseMessage.payload);
          }
        }
      };

      this.messageHandlers.set('response', handleResponse);

      // Set timeout
      setTimeout(() => {
        this.messageHandlers.delete('response');
        reject(new Error(`Request timeout: ${message.type}`));
      }, timeout);

      // Send the request
      this.sendMessage({
        ...message,
        expectsResponse: true
      });
    });
  }

  /**
   * Register a message handler
   */
  onMessage(type: string, handler: (message: IPCMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove a message handler
   */
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed && this.clientId !== null;
  }

  /**
   * Handle received message
   */
  private handleMessage(message: IPCMessage): void {
    // Handle welcome message
    if (message.type === 'welcome') {
      this.clientId = message.payload.clientId;
      this.logger.info('Authenticated with IPC bridge', { clientId: this.clientId });
      return;
    }

    // Call registered handler
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Also call general response handler
    const responseHandler = this.messageHandlers.get('response');
    if (responseHandler && message.responseTo) {
      responseHandler(message);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default socket path based on platform
   */
  private getDefaultSocketPath(): string {
    const tmpDir = process.platform === 'win32' ? '\\\\.\\pipe\\' : '/tmp';
    const appName = 'qwen-swarm';
    return path.join(tmpDir, `${appName}.ipc`);
  }
}