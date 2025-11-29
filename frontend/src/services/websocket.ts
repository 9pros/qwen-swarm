import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '@/types';

class WebSocketService {
  private socket: Socket | null = null;
  private subscribers: Map<string, Set<(message: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  connect(url: string = 'ws://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, {
          transports: ['websocket'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnected = false;

          if (reason === 'io server disconnect') {
            // Server disconnected, reconnect manually
            setTimeout(() => {
              this.connect(url);
            }, this.reconnectDelay);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.reconnectAttempts++;

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to WebSocket server'));
          }
        });

        // Handle incoming messages
        this.socket.on('message', (message: WebSocketMessage) => {
          this.handleMessage(message);
        });

        // Handle specific event types
        this.socket.on('agent_status_update', (data) => {
          this.handleMessage({
            type: 'agent_status_update',
            payload: data,
            timestamp: new Date().toISOString(),
          });
        });

        this.socket.on('task_update', (data) => {
          this.handleMessage({
            type: 'task_update',
            payload: data,
            timestamp: new Date().toISOString(),
          });
        });

        this.socket.on('system_metrics', (data) => {
          this.handleMessage({
            type: 'system_metrics',
            payload: data,
            timestamp: new Date().toISOString(),
          });
        });

        this.socket.on('consensus_update', (data) => {
          this.handleMessage({
            type: 'consensus_update',
            payload: data,
            timestamp: new Date().toISOString(),
          });
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.handleMessage({
            type: 'error',
            payload: error,
            timestamp: new Date().toISOString(),
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.subscribers.clear();
  }

  private handleMessage(message: WebSocketMessage): void {
    const typeSubscribers = this.subscribers.get(message.type);
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => callback(message));
    }

    // Also notify general message subscribers
    const generalSubscribers = this.subscribers.get('*');
    if (generalSubscribers) {
      generalSubscribers.forEach(callback => callback(message));
    }
  }

  subscribe(messageType: string, callback: (message: any) => void): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }

    this.subscribers.get(messageType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(messageType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(messageType);
        }
      }
    };
  }

  send(message: WebSocketMessage): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('message', message);
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  // Specific message sending methods
  sendHeartbeat(): void {
    this.send({
      type: 'heartbeat',
      payload: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }

  subscribeToAgent(agentId: string): void {
    this.send({
      type: 'subscribe_agent',
      payload: { agentId },
      timestamp: new Date().toISOString(),
    });
  }

  unsubscribeFromAgent(agentId: string): void {
    this.send({
      type: 'unsubscribe_agent',
      payload: { agentId },
      timestamp: new Date().toISOString(),
    });
  }

  subscribeToTask(taskId: string): void {
    this.send({
      type: 'subscribe_task',
      payload: { taskId },
      timestamp: new Date().toISOString(),
    });
  }

  unsubscribeFromTask(taskId: string): void {
    this.send({
      type: 'unsubscribe_task',
      payload: { taskId },
      timestamp: new Date().toISOString(),
    });
  }

  subscribeToSystemMetrics(): void {
    this.send({
      type: 'subscribe_system_metrics',
      payload: {},
      timestamp: new Date().toISOString(),
    });
  }

  unsubscribeFromSystemMetrics(): void {
    this.send({
      type: 'unsubscribe_system_metrics',
      payload: {},
      timestamp: new Date().toISOString(),
    });
  }

  subscribeToConsensusUpdates(): void {
    this.send({
      type: 'subscribe_consensus',
      payload: {},
      timestamp: new Date().toISOString(),
    });
  }

  unsubscribeFromConsensusUpdates(): void {
    this.send({
      type: 'unsubscribe_consensus',
      payload: {},
      timestamp: new Date().toISOString(),
    });
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    if (!this.socket) return 'disconnected';

    switch (this.socket.connected) {
      case true:
        return 'connected';
      case false:
        return this.reconnectAttempts > 0 ? 'reconnecting' : 'disconnected';
      default:
        return 'connecting';
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // Batch operations
  subscribeToMultiple(messageTypes: string[], callback: (message: any) => void): () => void {
    const unsubscribers = messageTypes.map(type =>
      this.subscribe(type, callback)
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  // Request-response pattern
  request<T = any>(message: WebSocketMessage, timeout: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requestMessage = {
        ...message,
        id: requestId,
      };

      const unsubscribe = this.subscribe('response', (response) => {
        if (response.id === requestId) {
          unsubscribe();
          clearTimeout(timeoutId);

          if (response.payload.error) {
            reject(new Error(response.payload.error));
          } else {
            resolve(response.payload);
          }
        }
      });

      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error('Request timeout'));
      }, timeout);

      this.send(requestMessage);
    });
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;