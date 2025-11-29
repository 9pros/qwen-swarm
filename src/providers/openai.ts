import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderCapability } from './manager';

export class OpenAIProvider extends BaseProvider {
  private client: any;

  constructor(id: string, config: any) {
    super(id, config);
  }

  public async initialize(): Promise<void> {
    try {
      const { OpenAI } = await import('openai');
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.endpoint,
        timeout: this.config.timeout,
        maxRetries: 3
      });

      await this.testConnection();
      this.isConnected = true;
      this.logger.info('OpenAI provider initialized', { model: this.config.model });
    } catch (error) {
      this.logger.error('Failed to initialize OpenAI provider', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isConnected = false;
    if (this.client) {
      try {
        await this.client.close?.();
      } catch (error) {
        this.logger.error('Error closing OpenAI client', error instanceof Error ? error : new Error(String(error)));
      }
    }
    this.client = null;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      this.logger.error('OpenAI health check failed', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'chat',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 128000,
        outputLimit: 4000,
        features: ['streaming', 'function_calling', 'vision', 'multi_turn']
      },
      {
        type: 'completion',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 128000,
        outputLimit: 4000
      },
      {
        type: 'embedding',
        supported: true,
        inputLimit: 8192,
        outputLimit: 1536
      },
      {
        type: 'image',
        supported: true,
        features: ['generation', 'edit', 'variation']
      },
      {
        type: 'audio',
        supported: true,
        features: ['transcription', 'translation', 'speech']
      },
      {
        type: 'function_calling',
        supported: true,
        features: ['parallel_functions', 'auto_selection', 'json_mode']
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
      await this.client.models.list();
    } catch (error) {
      throw new Error(`OpenAI connection test failed: ${error}`);
    }
  }

  private buildRequestPayload(request: ProviderRequest, stream: boolean = false): any {
    return {
      model: this.config.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop,
      stream,
      response_format: request.metadata?.response_format,
      seed: request.metadata?.seed
    };
  }

  private async makeRequest(payload: any): Promise<any> {
    try {
      const response = await this.client.chat.completions.create(payload);
      return response;
    } catch (error) {
      this.logger.error('OpenAI request failed', error instanceof Error ? error : new Error(String(error)));
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
      let model = '';

      const stream = await this.client.chat.completions.create(payload);

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onChunk(delta.content);
        }

        if (chunk.usage) {
          usage = chunk.usage;
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        if (chunk.model) {
          model = chunk.model;
        }
      }

      return {
        content: fullContent,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        finishReason: finishReason || 'stop',
        model: model || this.config.model,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('OpenAI streaming request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private parseResponse(response: any): ProviderResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choice in response');
    }

    return {
      content: choice.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      finishReason: choice.finish_reason || 'stop',
      model: response.model || this.config.model,
      timestamp: new Date()
    };
  }

  public async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.model.includes('embed') ? this.config.model : 'text-embedding-3-small',
        input: texts
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('Failed to get embeddings', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async generateImage(prompt: string, options: any = {}): Promise<any> {
    try {
      const response = await this.client.images.generate({
        model: this.config.model.includes('dall') ? this.config.model : 'dall-e-3',
        prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        style: options.style || 'vivid'
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to generate image', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async transcribeAudio(audioFile: Buffer, options: any = {}): Promise<any> {
    try {
      const transcription = await this.client.audio.transcriptions.create({
        file: new File([audioFile], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: options.language,
        response_format: options.response_format || 'json'
      });

      return transcription;
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}