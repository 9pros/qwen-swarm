import EventEmitter from 'eventemitter3';
import type { ProviderConfig } from '@/types';
import { Logger } from '@/utils/logger';
import { QwenProvider } from './qwen';
import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { LocalProvider } from './local';
import { CustomProvider } from './custom';

export interface ProviderResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  model: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ProviderRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProviderCapability {
  type: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'function_calling';
  supported: boolean;
  maxTokens?: number;
  inputLimit?: number;
  outputLimit?: number;
  features?: string[];
}

export interface ProviderMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  totalTokensUsed: number;
  lastRequestTime: Date;
  errorRate: number;
  uptime: number;
}

export interface ProviderEvents {
  'provider:connected': (providerId: string) => void;
  'provider:disconnected': (providerId: string) => void;
  'provider:error': (providerId: string, error: Error) => void;
  'provider:metrics-updated': (providerId: string, metrics: ProviderMetrics) => void;
  'request:started': (requestId: string, providerId: string) => void;
  'request:completed': (requestId: string, providerId: string, response: ProviderResponse) => void;
  'request:failed': (requestId: string, providerId: string, error: Error) => void;
}

export abstract class BaseProvider extends EventEmitter {
  public readonly id: string;
  public readonly config: ProviderConfig;
  protected logger: Logger;
  protected metrics: ProviderMetrics;
  protected isConnected: boolean = false;

  constructor(id: string, config: ProviderConfig) {
    super();
    this.id = id;
    this.config = config;
    this.logger = new Logger().withContext({
      component: 'Provider',
      providerId: id,
      providerType: config.type
    });
    this.metrics = this.initializeMetrics();
  }

  public abstract initialize(): Promise<void>;
  public abstract shutdown(): Promise<void>;
  public abstract healthCheck(): Promise<boolean>;
  public abstract getCapabilities(): ProviderCapability[];
  public abstract executeRequest(request: ProviderRequest): Promise<ProviderResponse>;
  public abstract executeStreamingRequest(
    request: ProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse>;

  protected initializeMetrics(): ProviderMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageLatency: 0,
      totalTokensUsed: 0,
      lastRequestTime: new Date(),
      errorRate: 0,
      uptime: Date.now()
    };
  }

  protected updateMetrics(success: boolean, latency: number, tokensUsed: number): void {
    this.metrics.requestCount++;
    this.metrics.lastRequestTime = new Date();

    if (success) {
      this.metrics.successCount++;
      this.metrics.totalTokensUsed += tokensUsed;
    } else {
      this.metrics.errorCount++;
    }

    this.metrics.errorRate = this.metrics.errorCount / this.metrics.requestCount;

    const totalLatency = this.metrics.averageLatency * (this.metrics.requestCount - 1) + latency;
    this.metrics.averageLatency = totalLatency / this.metrics.requestCount;

    this.emit('provider:metrics-updated', this.id, this.metrics);
  }

  protected async executeWithMetrics<T>(
    operation: () => Promise<T>,
    tokensExtractor?: (result: T) => number
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const latency = Date.now() - startTime;
      const tokensUsed = tokensExtractor ? tokensExtractor(result) : 0;

      this.updateMetrics(true, latency, tokensUsed);
      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(false, latency, 0);
      this.logger.error('Provider operation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  public getConfig(): ProviderConfig {
    return { ...this.config };
  }

  public isHealthy(): boolean {
    return this.isConnected && this.metrics.errorRate < 0.1;
  }

  public getEffectiveRateLimit(): {
    requestsPerSecond: number;
    tokensPerSecond: number;
    backoffTime: number;
  } {
    const errorRate = this.metrics.errorRate;
    const baseRequests = this.config.rateLimit.requestsPerSecond;
    const baseTokens = this.config.rateLimit.tokensPerSecond;

    if (errorRate > 0.1) {
      return {
        requestsPerSecond: baseRequests * 0.5,
        tokensPerSecond: baseTokens * 0.5,
        backoffTime: this.config.rateLimit.retryAfter
      };
    }

    return {
      requestsPerSecond: baseRequests,
      tokensPerSecond: baseTokens,
      backoffTime: 0
    };
  }
}

export class ProviderManager extends EventEmitter<ProviderEvents> {
  private providers: Map<string, BaseProvider> = new Map();
  private logger: Logger;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'ProviderManager' });
    this.startPeriodicHealthChecks();
  }

  public async registerProvider(
    providerId: string,
    config: ProviderConfig,
    fallbackProviders: string[] = []
  ): Promise<void> {
    try {
      const provider = this.createProvider(providerId, config);
      await provider.initialize();

      this.providers.set(providerId, provider);
      this.rateLimiters.set(providerId, new RateLimiter(config.rateLimit));

      if (fallbackProviders.length > 0) {
        this.fallbackChains.set(providerId, fallbackProviders);
      }

      this.setupProviderEvents(providerId, provider);

      this.logger.info('Provider registered successfully', {
        providerId,
        type: config.type,
        fallbackProviders
      });

      this.emit('provider:connected', providerId);

    } catch (error) {
      this.logger.error('Failed to register provider', error instanceof Error ? error : new Error(String(error)), { providerId });
      throw error;
    }
  }

  public async unregisterProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      await provider.shutdown();
      this.providers.delete(providerId);
      this.rateLimiters.delete(providerId);
      this.fallbackChains.delete(providerId);

      this.logger.info('Provider unregistered successfully', { providerId });
      this.emit('provider:disconnected', providerId);

    } catch (error) {
      this.logger.error('Failed to unregister provider', error instanceof Error ? error : new Error(String(error)), { providerId });
      throw error;
    }
  }

  public async executeRequest(
    providerId: string,
    request: ProviderRequest,
    useFallback: boolean = true
  ): Promise<ProviderResponse> {
    const requestId = this.generateRequestId();
    let attempt = 0;
    const maxAttempts = useFallback ? this.fallbackChains.get(providerId)?.length || 0 : 0;

    while (attempt <= maxAttempts) {
      const currentProviderId = attempt === 0 ? providerId : this.fallbackChains.get(providerId)?.[attempt - 1];

      if (!currentProviderId) {
        throw new Error(`No available provider for request ${requestId}`);
      }

      const provider = this.providers.get(currentProviderId);
      const rateLimiter = this.rateLimiters.get(currentProviderId);

      if (!provider || !rateLimiter) {
        attempt++;
        continue;
      }

      try {
        await rateLimiter.waitForSlot();
        this.emit('request:started', requestId, currentProviderId);

        const response = await provider.executeRequest(request);

        this.emit('request:completed', requestId, currentProviderId, response);
        this.logger.debug('Request completed successfully', {
          requestId,
          providerId: currentProviderId,
          tokens: response.usage.totalTokens
        });

        return response;

      } catch (error) {
        this.logger.warn('Request failed, trying fallback', {
          requestId,
          providerId: currentProviderId,
          error: error instanceof Error ? error.message : String(error),
          attempt
        });

        this.emit('request:failed', requestId, currentProviderId, error instanceof Error ? error : new Error(String(error)));

        if (attempt === maxAttempts) {
          throw error;
        }

        attempt++;
      }
    }

    throw new Error(`All providers failed for request ${requestId}`);
  }

  public async executeStreamingRequest(
    providerId: string,
    request: ProviderRequest,
    onChunk: (chunk: string) => void,
    useFallback: boolean = true
  ): Promise<ProviderResponse> {
    const requestId = this.generateRequestId();
    let attempt = 0;
    const maxAttempts = useFallback ? this.fallbackChains.get(providerId)?.length || 0 : 0;

    while (attempt <= maxAttempts) {
      const currentProviderId = attempt === 0 ? providerId : this.fallbackChains.get(providerId)?.[attempt - 1];

      if (!currentProviderId) {
        throw new Error(`No available provider for streaming request ${requestId}`);
      }

      const provider = this.providers.get(currentProviderId);
      const rateLimiter = this.rateLimiters.get(currentProviderId);

      if (!provider || !rateLimiter) {
        attempt++;
        continue;
      }

      try {
        await rateLimiter.waitForSlot();
        this.emit('request:started', requestId, currentProviderId);

        const response = await provider.executeStreamingRequest(request, onChunk);

        this.emit('request:completed', requestId, currentProviderId, response);
        this.logger.debug('Streaming request completed successfully', {
          requestId,
          providerId: currentProviderId,
          tokens: response.usage.totalTokens
        });

        return response;

      } catch (error) {
        this.logger.warn('Streaming request failed, trying fallback', {
          requestId,
          providerId: currentProviderId,
          error: error instanceof Error ? error.message : String(error),
          attempt
        });

        this.emit('request:failed', requestId, currentProviderId, error instanceof Error ? error : new Error(String(error)));

        if (attempt === maxAttempts) {
          throw error;
        }

        attempt++;
      }
    }

    throw new Error(`All providers failed for streaming request ${requestId}`);
  }

  public getProvider(providerId: string): BaseProvider | undefined {
    return this.providers.get(providerId);
  }

  public getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  public getHealthyProviders(): BaseProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isHealthy());
  }

  public getProviderMetrics(providerId: string): ProviderMetrics | undefined {
    const provider = this.providers.get(providerId);
    return provider?.getMetrics();
  }

  public getAllProviderMetrics(): Map<string, ProviderMetrics> {
    const metrics = new Map<string, ProviderMetrics>();

    for (const [providerId, provider] of this.providers) {
      metrics.set(providerId, provider.getMetrics());
    }

    return metrics;
  }

  public getProviderCapabilities(providerId: string): ProviderCapability[] {
    const provider = this.providers.get(providerId);
    return provider?.getCapabilities() || [];
  }

  public async healthCheck(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    try {
      return await provider.healthCheck();
    } catch (error) {
      this.logger.error('Provider health check failed', error instanceof Error ? error : new Error(String(error)), { providerId });
      return false;
    }
  }

  public async performAllHealthChecks(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    const healthChecks = Array.from(this.providers.keys()).map(async (providerId) => {
      const isHealthy = await this.healthCheck(providerId);
      results.set(providerId, isHealthy);
      return { providerId, isHealthy };
    });

    await Promise.allSettled(healthChecks);

    const healthyCount = Array.from(results.values()).filter(healthy => healthy).length;
    this.logger.info('Health checks completed', {
      totalProviders: this.providers.size,
      healthyCount,
      unhealthyCount: this.providers.size - healthyCount
    });

    return results;
  }

  public updateProviderConfig(providerId: string, updates: Partial<ProviderConfig>): void {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const newConfig = { ...provider.getConfig(), ...updates };
    const rateLimiter = this.rateLimiters.get(providerId);

    if (rateLimiter && updates.rateLimit) {
      rateLimiter.updateConfig(updates.rateLimit);
    }

    this.logger.info('Provider configuration updated', { providerId, updates });
  }

  private createProvider(providerId: string, config: ProviderConfig): BaseProvider {
    switch (config.type) {
      case 'qwen':
        return new QwenProvider(providerId, config);
      case 'openai':
        return new OpenAIProvider(providerId, config);
      case 'claude':
        return new ClaudeProvider(providerId, config);
      case 'local':
        return new LocalProvider(providerId, config);
      case 'custom':
        return new CustomProvider(providerId, config);
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  private setupProviderEvents(providerId: string, provider: BaseProvider): void {
    provider.on('error', (error: Error) => {
      this.logger.error('Provider error', error, { providerId });
      this.emit('provider:error', providerId, error);
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performAllHealthChecks();
    }, 60000);
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Provider Manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    const shutdownPromises = Array.from(this.providers.values()).map(provider =>
      provider.shutdown().catch(error => {
        this.logger.error('Error during provider shutdown', error instanceof Error ? error : new Error(String(error)));
      })
    );

    await Promise.allSettled(shutdownPromises);

    this.providers.clear();
    this.rateLimiters.clear();
    this.fallbackChains.clear();

    this.logger.info('Provider Manager shutdown complete');
  }
}

export class RateLimiter {
  private config: {
    requestsPerSecond: number;
    tokensPerSecond: number;
    burstLimit: number;
    retryAfter: number;
  };
  private requestQueue: Array<{ resolve: () => void; timestamp: number }> = [];
  private tokenBucket: number;
  private lastRequestTime: number = 0;
  private processing: boolean = false;

  constructor(rateLimit: {
    requestsPerSecond: number;
    tokensPerSecond: number;
    burstLimit: number;
    retryAfter: number;
  }) {
    this.config = rateLimit;
    this.tokenBucket = rateLimit.burstLimit;
    this.startProcessing();
  }

  public async waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      this.requestQueue.push({
        resolve: () => resolve(),
        timestamp: Date.now()
      });
    });
  }

  public updateConfig(newConfig: {
    requestsPerSecond: number;
    tokensPerSecond: number;
    burstLimit: number;
    retryAfter: number;
  }): void {
    this.config = newConfig;
    this.tokenBucket = Math.min(this.tokenBucket, newConfig.burstLimit);
  }

  private startProcessing(): void {
    setInterval(() => {
      this.processQueue();
      this.replenishTokens();
    }, 1000);
  }

  private processQueue(): void {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;
    const now = Date.now();
    const requestsToProcess = Math.min(
      this.config.requestsPerSecond,
      this.requestQueue.length
    );

    for (let i = 0; i < requestsToProcess; i++) {
      const request = this.requestQueue.shift();
      if (request) {
        request.resolve();
        this.lastRequestTime = now;
      }
    }

    this.processing = false;
  }

  private replenishTokens(): void {
    this.tokenBucket = Math.min(
      this.tokenBucket + this.config.tokensPerSecond,
      this.config.burstLimit
    );
  }

  public getAvailableTokens(): number {
    return this.tokenBucket;
  }

  public getQueueLength(): number {
    return this.requestQueue.length;
  }
}