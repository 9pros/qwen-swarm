import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderCapability } from './manager';

export class LocalProvider extends BaseProvider {
  private model: any;
  private modelPath: string;

  constructor(id: string, config: any) {
    super(id, config);
    this.modelPath = config.modelPath || './models/local';
  }

  public async initialize(): Promise<void> {
    try {
      await this.loadLocalModel();
      this.isConnected = true;
      this.logger.info('Local provider initialized', { modelPath: this.modelPath });
    } catch (error) {
      this.logger.error('Failed to initialize local provider', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isConnected = false;
    if (this.model) {
      try {
        await this.model.dispose?.();
      } catch (error) {
        this.logger.error('Error disposing local model', error instanceof Error ? error : new Error(String(error)));
      }
    }
    this.model = null;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.model) {
      return false;
    }

    try {
      const testRequest: ProviderRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 10
      };
      await this.executeRequest(testRequest);
      return true;
    } catch (error) {
      this.logger.error('Local provider health check failed', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'chat',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 4096,
        outputLimit: 2048,
        features: ['streaming']
      },
      {
        type: 'completion',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 4096,
        outputLimit: 2048
      }
    ];
  }

  public async executeRequest(request: ProviderRequest): Promise<ProviderResponse> {
    return this.executeWithMetrics(
      async () => {
        const prompt = this.buildPrompt(request);
        const response = await this.generateResponse(prompt);
        return this.parseResponse(response, request);
      },
      () => 0
    );
  }

  public async executeStreamingRequest(
    request: ProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    return this.executeWithMetrics(
      async () => {
        const prompt = this.buildPrompt(request);
        const response = await this.generateStreamingResponse(prompt, onChunk);
        return this.parseResponse(response, request);
      },
      () => 0
    );
  }

  private async loadLocalModel(): Promise<void> {
    this.logger.info('Loading local model', { modelPath: this.modelPath });

    try {
      this.model = {
        generate: async (prompt: string, options: any = {}) => {
          return await this.mockLocalGeneration(prompt, options);
        },
        generateStream: async function* (prompt: string, options: any = {}) {
          const chunks = ['Hello', ' from', ' local', ' model'];
          for (const chunk of chunks) {
            yield chunk;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to load local model: ${error}`);
    }
  }

  private buildPrompt(request: ProviderRequest): string {
    return request.messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  private async generateResponse(prompt: string): Promise<any> {
    try {
      const response = await this.model.generate(prompt, {
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });
      return response;
    } catch (error) {
      this.logger.error('Local model generation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async generateStreamingResponse(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<any> {
    try {
      let fullContent = '';
      for await (const chunk of this.model.generateStream(prompt, {
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })) {
        fullContent += chunk;
        onChunk(chunk);
      }
      return { content: fullContent };
    } catch (error) {
      this.logger.error('Local model streaming generation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private parseResponse(response: any, request: ProviderRequest): ProviderResponse {
    const content = response.content || response.text || 'Generated response from local model';

    return {
      content,
      usage: {
        promptTokens: this.estimateTokens(this.buildPrompt(request)),
        completionTokens: this.estimateTokens(content),
        totalTokens: this.estimateTokens(this.buildPrompt(request) + content)
      },
      finishReason: 'stop',
      model: this.config.model || 'local-model',
      timestamp: new Date()
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async mockLocalGeneration(prompt: string, options: any = {}): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      content: 'This is a response from the local model. In a real implementation, this would be generated by an actual local LLM.',
      usage: {
        prompt_tokens: this.estimateTokens(prompt),
        completion_tokens: 20,
        total_tokens: this.estimateTokens(prompt) + 20
      }
    };
  }
}