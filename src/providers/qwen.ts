import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderCapability } from './manager';

export class QwenProvider extends BaseProvider {
  private client: any;
  private models: Map<string, ModelInfo> = new Map();

  constructor(id: string, config: any) {
    super(id, config);
    this.initializeModels();
  }

  public async initialize(): Promise<void> {
    try {
      if (this.config.type === 'local') {
        await this.initializeLocalModel();
      } else {
        await this.initializeCloudModel();
      }
      this.isConnected = true;
      this.logger.info('Qwen provider initialized', { model: this.config.model });
    } catch (error) {
      this.logger.error('Failed to initialize Qwen provider', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isConnected = false;
    if (this.client) {
      try {
        await this.client.close?.();
      } catch (error) {
        this.logger.error('Error closing Qwen client', error instanceof Error ? error : new Error(String(error)));
      }
    }
    this.client = null;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const testRequest: ProviderRequest = {
        messages: [
          {
            role: 'user',
            content: 'Hello, are you working?'
          }
        ],
        maxTokens: 10
      };

      await this.executeRequest(testRequest);
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  public getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'chat',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 32000,
        outputLimit: 4000,
        features: ['streaming', 'function_calling', 'multi_turn']
      },
      {
        type: 'completion',
        supported: true,
        maxTokens: this.config.maxTokens,
        inputLimit: 32000,
        outputLimit: 4000
      },
      {
        type: 'embedding',
        supported: true,
        inputLimit: 2048,
        outputLimit: 1536
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

  private async initializeCloudModel(): Promise<void> {
    if (this.config.endpoint) {
      this.client = await this.createCustomClient();
    } else {
      this.client = await this.createOfficialClient();
    }
  }

  private async initializeLocalModel(): Promise<void> {
    try {
      const { createClient } = await import('@qwen/ai');
      this.client = createClient({
        modelPath: this.config.modelPath || './models/qwen',
        device: this.config.device || 'cpu',
        threads: this.config.threads || 4
      });
    } catch (error) {
      this.logger.error('Failed to initialize local Qwen model', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async createOfficialClient(): Promise<any> {
    const { Qwen } = await import('@qwen/api');
    return new Qwen({
      apiKey: this.config.apiKey,
      baseURL: this.config.endpoint,
      timeout: this.config.timeout
    });
  }

  private async createCustomClient(): Promise<any> {
    const { QwenCustom } = await import('@qwen/custom');
    return new QwenCustom({
      endpoint: this.config.endpoint,
      apiKey: this.config.apiKey,
      model: this.config.model,
      timeout: this.config.timeout
    });
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
      metadata: request.metadata
    };
  }

  private async makeRequest(payload: any): Promise<any> {
    try {
      if (this.config.type === 'local') {
        return await this.client.completions.create(payload);
      } else {
        const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'Qwen-Swarm/1.0.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      }
    } catch (error) {
      this.logger.error('Request failed', error instanceof Error ? error : new Error(String(error)));
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

      if (this.config.type === 'local') {
        const stream = await this.client.completions.create(payload);

        for await (const chunk of stream) {
          if (chunk.choices?.[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            fullContent += content;
            onChunk(content);
          }

          if (chunk.usage) {
            usage = chunk.usage;
          }

          if (chunk.choices?.[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason;
          }

          if (chunk.model) {
            model = chunk.model;
          }
        }
      } else {
        const response = await fetch(`${this.config.endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'Qwen-Swarm/1.0.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const chunk = JSON.parse(data);
                if (chunk.choices?.[0]?.delta?.content) {
                  const content = chunk.choices[0].delta.content;
                  fullContent += content;
                  onChunk(content);
                }

                if (chunk.usage) {
                  usage = chunk.usage;
                }

                if (chunk.choices?.[0]?.finish_reason) {
                  finishReason = chunk.choices[0].finish_reason;
                }

                if (chunk.model) {
                  model = chunk.model;
                }
              } catch (parseError) {
                this.logger.warn('Failed to parse streaming chunk', parseError instanceof Error ? parseError : new Error(String(parseError)));
              }
            }
          }
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
      this.logger.error('Streaming request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private parseResponse(response: any): ProviderResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error('No choice in response');
    }

    return {
      content: choice.message?.content || choice.text || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      },
      finishReason: choice.finish_reason || 'stop',
      model: response.model || this.config.model,
      timestamp: new Date(),
      metadata: response.metadata
    };
  }

  private initializeModels(): void {
    this.models.set('qwen-max', {
      name: 'Qwen Max',
      contextLength: 32768,
      maxOutput: 4000,
      supportsStreaming: true,
      supportsFunctions: true,
      costPerInputToken: 0.0001,
      costPerOutputToken: 0.0003
    });

    this.models.set('qwen-plus', {
      name: 'Qwen Plus',
      contextLength: 32768,
      maxOutput: 4000,
      supportsStreaming: true,
      supportsFunctions: true,
      costPerInputToken: 0.00005,
      costPerOutputToken: 0.00015
    });

    this.models.set('qwen-turbo', {
      name: 'Qwen Turbo',
      contextLength: 8192,
      maxOutput: 2000,
      supportsStreaming: true,
      supportsFunctions: false,
      costPerInputToken: 0.00002,
      costPerOutputToken: 0.00006
    });
  }

  public getModelInfo(modelName: string): ModelInfo | undefined {
    return this.models.get(modelName);
  }

  public async listModels(): Promise<string[]> {
    try {
      if (this.config.type === 'local') {
        return Array.from(this.models.keys());
      }

      const response = await fetch(`${this.config.endpoint}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'Qwen-Swarm/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      this.logger.error('Failed to list models', error instanceof Error ? error : new Error(String(error)));
      return Array.from(this.models.keys());
    }
  }

  public async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.config.endpoint}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'Qwen-Swarm/1.0.0'
        },
        body: JSON.stringify({
          model: this.config.model.includes('embed') ? this.config.model : 'text-embedding-ada-002',
          input: texts
        }),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((item: any) => item.embedding) || [];
    } catch (error) {
      this.logger.error('Failed to get embeddings', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

interface ModelInfo {
  name: string;
  contextLength: number;
  maxOutput: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  costPerInputToken: number;
  costPerOutputToken: number;
}