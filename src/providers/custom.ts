import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderCapability } from './manager';

export class CustomProvider extends BaseProvider {
  private handler: ((request: ProviderRequest) => Promise<ProviderResponse>) | null = null;
  private streamingHandler: ((request: ProviderRequest, onChunk: (chunk: string) => void) => Promise<ProviderResponse>) | null = null;

  constructor(id: string, config: any) {
    super(id, config);
  }

  public async initialize(): Promise<void> {
    try {
      if (this.config.handler) {
        if (typeof this.config.handler === 'function') {
          this.handler = this.config.handler;
        } else if (typeof this.config.handler === 'string') {
          const module = await import(this.config.handler);
          this.handler = module.default || module.handler;
        }
      }

      if (this.config.streamingHandler) {
        if (typeof this.config.streamingHandler === 'function') {
          this.streamingHandler = this.config.streamingHandler;
        } else if (typeof this.config.streamingHandler === 'string') {
          const module = await import(this.config.streamingHandler);
          this.streamingHandler = module.default || module.streamingHandler;
        }
      }

      if (!this.handler) {
        throw new Error('Custom provider requires a handler function');
      }

      this.isConnected = true;
      this.logger.info('Custom provider initialized', { hasHandler: !!this.handler, hasStreamingHandler: !!this.streamingHandler });
    } catch (error) {
      this.logger.error('Failed to initialize custom provider', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isConnected = false;
    this.handler = null;
    this.streamingHandler = null;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.handler) {
      return false;
    }

    try {
      const testRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'health check' }],
        maxTokens: 10
      };
      await this.handler(testRequest);
      return true;
    } catch (error) {
      this.logger.error('Custom provider health check failed', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public getCapabilities(): ProviderCapability[] {
    return this.config.capabilities || [
      {
        type: 'chat',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: this.config.inputLimit || 4096,
        outputLimit: this.config.outputLimit || 2048,
        features: this.config.features || []
      }
    ];
  }

  public async executeRequest(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.handler) {
      throw new Error('No handler configured for custom provider');
    }

    return this.executeWithMetrics(
      async () => {
        const response = await this.handler!(request);
        return this.validateResponse(response);
      },
      (response: ProviderResponse) => response.usage.totalTokens
    );
  }

  public async executeStreamingRequest(
    request: ProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    if (!this.streamingHandler) {
      throw new Error('No streaming handler configured for custom provider');
    }

    return this.executeWithMetrics(
      async () => {
        const response = await this.streamingHandler!(request, onChunk);
        return this.validateResponse(response);
      },
      (response: ProviderResponse) => response.usage.totalTokens
    );
  }

  private validateResponse(response: any): ProviderResponse {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format from custom provider');
    }

    if (typeof response.content !== 'string') {
      throw new Error('Response must have a content string');
    }

    return {
      content: response.content,
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0
      },
      finishReason: response.finishReason || 'stop',
      model: response.model || this.config.model || 'custom-model',
      timestamp: response.timestamp || new Date(),
      metadata: response.metadata
    };
  }

  public setHandler(handler: (request: ProviderRequest) => Promise<ProviderResponse>): void {
    this.handler = handler;
  }

  public setStreamingHandler(handler: (request: ProviderRequest, onChunk: (chunk: string) => void) => Promise<ProviderResponse>): void {
    this.streamingHandler = handler;
  }

  public updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
  }
}