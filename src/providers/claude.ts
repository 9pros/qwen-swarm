import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderCapability } from './manager';

export class ClaudeProvider extends BaseProvider {
  private client: any;

  constructor(id: string, config: any) {
    super(id, config);
  }

  public async initialize(): Promise<void> {
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.endpoint,
        timeout: this.config.timeout
      });

      await this.testConnection();
      this.isConnected = true;
      this.logger.info('Claude provider initialized', { model: this.config.model });
    } catch (error) {
      this.logger.error('Failed to initialize Claude provider', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isConnected = false;
    this.client = null;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }]
      });
      return true;
    } catch (error) {
      this.logger.error('Claude health check failed', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'chat',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 100000,
        outputLimit: 4000,
        features: ['streaming', 'function_calling', 'vision', 'multi_turn']
      },
      {
        type: 'completion',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 100000,
        outputLimit: 4000
      },
      {
        type: 'function_calling',
        supported: true,
        features: ['parallel_functions', 'auto_selection']
      }
    ];
  }

  public async executeRequest(request: ProviderRequest): Promise<ProviderResponse> {
    return this.executeWithMetrics(
      async () => {
        const payload = this.buildRequestPayload(request);
        const response = await this.makeRequest(payload);
        return this.parseResponse(response);
      },
      (response: ProviderResponse) => response.usage.totalTokens
    );
  }

  public async executeStreamingRequest(
    request: ProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    return this.executeWithMetrics(
      async () => {
        const payload = this.buildRequestPayload(request, true);
        const response = await this.makeStreamingRequest(payload, onChunk);
        return response;
      },
      (response: ProviderResponse) => response.usage.totalTokens
    );
  }

  private async testConnection(): Promise<void> {
    try {
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
    } catch (error) {
      throw new Error(`Claude connection test failed: ${error}`);
    }
  }

  private buildRequestPayload(request: ProviderRequest, stream: boolean = false): any {
    return {
      model: this.config.model,
      messages: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      top_p: request.topP,
      stop_sequences: request.stop,
      stream
    };
  }

  private async makeRequest(payload: any): Promise<any> {
    try {
      const response = await this.client.messages.create(payload);
      return response;
    } catch (error) {
      this.logger.error('Claude request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async makeStreamingRequest(
    payload: any,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    try {
      let fullContent = '';
      let usage: any = {};
      let finishReason = '';

      const stream = await this.client.messages.create(payload);

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.text) {
          fullContent += chunk.delta.text;
          onChunk(chunk.delta.text);
        }

        if (chunk.type === 'message_stop') {
          finishReason = chunk.stop_reason || 'end_turn';
        }

        if (chunk.usage) {
          usage = chunk.usage;
        }
      }

      return {
        content: fullContent,
        usage: {
          promptTokens: usage.input_tokens || 0,
          completionTokens: usage.output_tokens || 0,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        },
        finishReason: finishReason || 'stop',
        model: this.config.model,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Claude streaming request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private parseResponse(response: any): ProviderResponse {
    const content = response.content?.[0]?.text || '';
    return {
      content,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      },
      finishReason: response.stop_reason || 'end_turn',
      model: response.model || this.config.model,
      timestamp: new Date()
    };
  }
}