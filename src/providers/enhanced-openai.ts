import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderCapability } from './manager';
import type {
  ModelSpec,
  ModelType,
  ModelCapability,
  ModelQuality,
  HealthCheckConfig,
  LoadBalancingConfig,
  LoadBalancingStrategy
} from '@/types';
import { Logger } from '@/utils/logger';

interface OpenAIModelSpec extends ModelSpec {
  openaiId: string;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  supportsVision: boolean;
  contextWindow: number;
}

export class EnhancedOpenAIProvider extends BaseProvider {
  private clients: Map<string, any> = new Map();
  private modelSpecs: Map<string, OpenAIModelSpec> = new Map();
  private currentBaseUrlIndex: number = 0;
  private healthCheckConfig: HealthCheckConfig;
  private loadBalancingConfig: LoadBalancingConfig;

  constructor(id: string, config: any) {
    super(id, config);
    this.healthCheckConfig = config.healthCheck || {
      enabled: true,
      interval: 60000,
      timeout: 5000,
      retryAttempts: 3,
      endpoints: ['/models', '/chat/completions']
    };
    this.loadBalancingConfig = config.loadBalancing || {
      strategy: LoadBalancingStrategy.ROUND_ROBIN,
      failoverEnabled: true
    };
  }

  public async initialize(): Promise<void> {
    try {
      await this.initializeClients();
      await this.loadModelSpecifications();
      await this.testAllConnections();
      this.isConnected = true;
      this.logger.info('Enhanced OpenAI provider initialized', {
        clients: this.clients.size,
        models: this.modelSpecs.size,
        baseUrls: this.config.customBaseUrls?.length || 1
      });
    } catch (error) {
      this.logger.error('Failed to initialize enhanced OpenAI provider', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.isConnected = false;

    for (const [baseUrl, client] of this.clients) {
      try {
        await client.close?.();
        this.logger.debug('Closed OpenAI client', { baseUrl });
      } catch (error) {
        this.logger.error('Error closing OpenAI client', error instanceof Error ? error : new Error(String(error)), { baseUrl });
      }
    }

    this.clients.clear();
    this.modelSpecs.clear();
    this.logger.info('Enhanced OpenAI provider shut down');
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected || this.clients.size === 0) {
      return false;
    }

    const healthCheckPromises = Array.from(this.clients.entries()).map(async ([baseUrl, client]) => {
      try {
        const startTime = Date.now();
        await client.models.list();
        const latency = Date.now() - startTime;
        this.logger.debug('Health check passed', { baseUrl, latency });
        return true;
      } catch (error) {
        this.logger.warn('Health check failed', { baseUrl, error: error instanceof Error ? error.message : String(error) });
        return false;
      }
    });

    const results = await Promise.allSettled(healthCheckPromises);
    const healthyClients = results.filter(result => result.status === 'fulfilled' && result.value).length;

    return healthyClients > 0;
  }

  public getCapabilities(): ProviderCapability[] {
    return [
      {
        type: 'chat',
        supported: true,
        maxTokens: 128000,
        inputLimit: 128000,
        outputLimit: 4000,
        features: ['streaming', 'function_calling', 'vision', 'multi_turn', 'json_mode']
      },
      {
        type: 'completion',
        supported: true,
        maxTokens: 128000,
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
        const client = await this.selectOptimalClient();
        const modelSpec = this.selectOptimalModel(request);
        const payload = this.buildRequestPayload(request, modelSpec, false);
        const response = await this.makeRequestWithClient(client, payload);
        return this.parseResponse(response, modelSpec);
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
        const client = await this.selectOptimalClient();
        const modelSpec = this.selectOptimalModel(request);
        const payload = this.buildRequestPayload(request, modelSpec, true);
        const response = await this.makeStreamingRequestWithClient(client, payload, onChunk);
        return response;
      },
      (response: ProviderResponse) => response.usage.totalTokens
    );
  }

  // Enhanced methods for multi-model support
  public getAvailableModels(modelType?: ModelType): OpenAIModelSpec[] {
    const models = Array.from(this.modelSpecs.values());
    return modelType ? models.filter(model => model.type === modelType) : models;
  }

  public getChatModels(): OpenAIModelSpec[] {
    return this.getAvailableModels(ModelType.CHAT);
  }

  public getVisionModels(): OpenAIModelSpec[] {
    return this.getAvailableModels(ModelType.VISION);
  }

  public getEmbeddingModels(): OpenAIModelSpec[] {
    return this.getAvailableModels(ModelType.EMBEDDING);
  }

  public getModelSpec(modelId: string): OpenAIModelSpec | undefined {
    return this.modelSpecs.get(modelId);
  }

  public addCustomModel(modelSpec: OpenAIModelSpec): void {
    this.modelSpecs.set(modelSpec.id, modelSpec);
    this.logger.info('Added custom model', { modelId: modelSpec.id, name: modelSpec.name });
  }

  public removeModel(modelId: string): boolean {
    const removed = this.modelSpecs.delete(modelId);
    if (removed) {
      this.logger.info('Removed model', { modelId });
    }
    return removed;
  }

  public async addCustomBaseUrl(baseUrl: string): Promise<void> {
    try {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: baseUrl,
        timeout: this.config.timeout,
        maxRetries: 3
      });

      await client.models.list();
      this.clients.set(baseUrl, client);
      this.logger.info('Added custom base URL', { baseUrl });
    } catch (error) {
      this.logger.error('Failed to add custom base URL', error instanceof Error ? error : new Error(String(error)), { baseUrl });
      throw error;
    }
  }

  public removeCustomBaseUrl(baseUrl: string): boolean {
    const client = this.clients.get(baseUrl);
    if (client) {
      client.close?.();
      const removed = this.clients.delete(baseUrl);
      if (removed) {
        this.logger.info('Removed custom base URL', { baseUrl });
      }
      return removed;
    }
    return false;
  }

  private async initializeClients(): Promise<void> {
    const { OpenAI } = await import('openai');

    // Initialize primary client
    const primaryClient = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      maxRetries: 3
    });
    this.clients.set(this.config.endpoint || 'https://api.openai.com/v1', primaryClient);

    // Initialize custom base URL clients
    if (this.config.customBaseUrls) {
      for (const baseUrl of this.config.customBaseUrls) {
        try {
          const client = new OpenAI({
            apiKey: this.config.apiKey,
            baseURL: baseUrl,
            timeout: this.config.timeout,
            maxRetries: 3
          });
          this.clients.set(baseUrl, client);
        } catch (error) {
          this.logger.warn('Failed to initialize client for base URL', { baseUrl, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }

  private async loadModelSpecifications(): Promise<void> {
    const defaultModels: OpenAIModelSpec[] = [
      // Chat models
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo Preview',
        type: ModelType.CHAT,
        capabilities: [ModelCapability.STREAMING, ModelCapability.FUNCTION_CALLING, ModelCapability.JSON_MODE, ModelCapability.LONG_CONTEXT],
        maxTokens: 128000,
        inputLimit: 128000,
        outputLimit: 4000,
        costPerToken: 0.00001,
        costPerRequest: 0.03,
        averageLatency: 2000,
        quality: ModelQuality.PREMIUM,
        provider: 'openai',
        openaiId: 'gpt-4-turbo-preview',
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: false,
        contextWindow: 128000
      },
      {
        id: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision Preview',
        type: ModelType.VISION,
        capabilities: [ModelCapability.STREAMING, ModelCapability.FUNCTION_CALLING, ModelCapability.VISION, ModelCapability.JSON_MODE],
        maxTokens: 128000,
        inputLimit: 128000,
        outputLimit: 4000,
        costPerToken: 0.00001,
        costPerRequest: 0.03,
        averageLatency: 3000,
        quality: ModelQuality.PREMIUM,
        provider: 'openai',
        openaiId: 'gpt-4-vision-preview',
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: true,
        contextWindow: 128000
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        type: ModelType.CHAT,
        capabilities: [ModelCapability.STREAMING, ModelCapability.FUNCTION_CALLING, ModelCapability.JSON_MODE],
        maxTokens: 16384,
        inputLimit: 16384,
        outputLimit: 4000,
        costPerToken: 0.0000015,
        costPerRequest: 0.002,
        averageLatency: 800,
        quality: ModelQuality.STANDARD,
        provider: 'openai',
        openaiId: 'gpt-3.5-turbo',
        supportsStreaming: true,
        supportsFunctions: true,
        supportsVision: false,
        contextWindow: 16384
      },
      // Embedding models
      {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        type: ModelType.EMBEDDING,
        capabilities: [],
        maxTokens: 8192,
        inputLimit: 8192,
        outputLimit: 1536,
        costPerToken: 0.00000002,
        costPerRequest: 0.00002,
        averageLatency: 200,
        quality: ModelQuality.STANDARD,
        provider: 'openai',
        openaiId: 'text-embedding-3-small',
        supportsStreaming: false,
        supportsFunctions: false,
        supportsVision: false,
        contextWindow: 8192
      },
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        type: ModelType.EMBEDDING,
        capabilities: [],
        maxTokens: 8192,
        inputLimit: 8192,
        outputLimit: 3072,
        costPerToken: 0.00000013,
        costPerRequest: 0.00013,
        averageLatency: 300,
        quality: ModelQuality.PREMIUM,
        provider: 'openai',
        openaiId: 'text-embedding-3-large',
        supportsStreaming: false,
        supportsFunctions: false,
        supportsVision: false,
        contextWindow: 8192
      }
    ];

    for (const modelSpec of defaultModels) {
      this.modelSpecs.set(modelSpec.id, modelSpec);
    }

    // Load custom models from configuration
    if (this.config.models) {
      if (this.config.models.chatModels) {
        for (const model of this.config.models.chatModels) {
          const openaiModel: OpenAIModelSpec = {
            ...model,
            openaiId: model.id,
            supportsStreaming: model.capabilities.includes(ModelCapability.STREAMING),
            supportsFunctions: model.capabilities.includes(ModelCapability.FUNCTION_CALLING),
            supportsVision: model.capabilities.includes(ModelCapability.VISION),
            contextWindow: model.customContextWindow || model.inputLimit
          };
          this.modelSpecs.set(model.id, openaiModel);
        }
      }
      if (this.config.models.visionModels) {
        for (const model of this.config.models.visionModels) {
          const openaiModel: OpenAIModelSpec = {
            ...model,
            openaiId: model.id,
            supportsStreaming: model.capabilities.includes(ModelCapability.STREAMING),
            supportsFunctions: model.capabilities.includes(ModelCapability.FUNCTION_CALLING),
            supportsVision: true,
            contextWindow: model.customContextWindow || model.inputLimit
          };
          this.modelSpecs.set(model.id, openaiModel);
        }
      }
    }
  }

  private async testAllConnections(): Promise<void> {
    const testPromises = Array.from(this.clients.entries()).map(async ([baseUrl, client]) => {
      try {
        await client.models.list();
        this.logger.debug('Connection test passed', { baseUrl });
      } catch (error) {
        this.logger.error('Connection test failed', error instanceof Error ? error : new Error(String(error)), { baseUrl });
        throw error;
      }
    });

    await Promise.all(testPromises);
  }

  private async selectOptimalClient(): Promise<any> {
    if (this.clients.size === 1) {
      return this.clients.values().next().value;
    }

    switch (this.loadBalancingConfig.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.selectRoundRobinClient();
      case LoadBalancingStrategy.LEAST_RESPONSE_TIME:
        return this.selectLeastResponseTimeClient();
      case LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
        return this.selectWeightedRoundRobinClient();
      default:
        return this.selectRoundRobinClient();
    }
  }

  private selectRoundRobinClient(): any {
    const baseUrls = Array.from(this.clients.keys());
    const baseUrl = baseUrls[this.currentBaseUrlIndex % baseUrls.length];
    this.currentBaseUrlIndex++;
    return this.clients.get(baseUrl);
  }

  private async selectLeastResponseTimeClient(): Promise<any> {
    // Simple implementation - in production, this would use actual response time metrics
    const baseUrls = Array.from(this.clients.keys());
    const primaryUrl = this.config.endpoint || 'https://api.openai.com/v1';

    if (baseUrls.includes(primaryUrl)) {
      return this.clients.get(primaryUrl);
    }

    return this.clients.values().next().value;
  }

  private selectWeightedRoundRobinClient(): any {
    // Simple implementation - in production, this would use actual weights
    return this.selectRoundRobinClient();
  }

  private selectOptimalModel(request: ProviderRequest): OpenAIModelSpec {
    // Check if request specifies a model
    const requestedModel = request.metadata?.model;
    if (requestedModel) {
      const modelSpec = this.modelSpecs.get(requestedModel);
      if (modelSpec) {
        return modelSpec;
      }
    }

    // Check if request has vision content
    const hasVision = request.messages.some(msg =>
      typeof msg.content === 'object' &&
      msg.content !== null &&
      'type' in msg.content &&
      msg.content.type === 'image_url'
    );

    if (hasVision) {
      const visionModels = this.getVisionModels();
      if (visionModels.length > 0) {
        return visionModels[0];
      }
    }

    // Default to best chat model
    const chatModels = this.getChatModels()
      .filter(model => !model.deprecated)
      .sort((a, b) => {
        // Sort by quality, then cost efficiency
        const qualityOrder = { [ModelQuality.ULTRA]: 4, [ModelQuality.PREMIUM]: 3, [ModelQuality.STANDARD]: 2, [ModelQuality.BASIC]: 1 };
        const qualityDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
        if (qualityDiff !== 0) return qualityDiff;

        return a.costPerToken - b.costPerToken;
      });

    return chatModels[0] || this.modelSpecs.values().next().value;
  }

  private buildRequestPayload(request: ProviderRequest, modelSpec: OpenAIModelSpec, stream: boolean = false): any {
    return {
      model: modelSpec.openaiId,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? Math.min(modelSpec.outputLimit, this.config.maxTokens),
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop,
      stream,
      response_format: request.metadata?.response_format,
      seed: request.metadata?.seed,
      tools: request.metadata?.tools,
      tool_choice: request.metadata?.tool_choice
    };
  }

  private async makeRequestWithClient(client: any, payload: any): Promise<any> {
    try {
      const response = await client.chat.completions.create(payload);
      return response;
    } catch (error) {
      this.logger.error('OpenAI request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async makeStreamingRequestWithClient(
    client: any,
    payload: any,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    try {
      let fullContent = '';
      let usage: any = {};
      let finishReason = '';
      let model = '';

      const stream = await client.chat.completions.create(payload);

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
        model: model || payload.model,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('OpenAI streaming request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private parseResponse(response: any, modelSpec: OpenAIModelSpec): ProviderResponse {
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
      model: response.model || modelSpec.openaiId,
      timestamp: new Date()
    };
  }

  // Enhanced methods for embeddings, images, and audio
  public async getEmbeddings(texts: string[], modelId?: string): Promise<number[][]> {
    const modelSpec = modelId ? this.modelSpecs.get(modelId) : this.getEmbeddingModels()[0];
    if (!modelSpec || modelSpec.type !== ModelType.EMBEDDING) {
      throw new Error('Valid embedding model not found');
    }

    const client = await this.selectOptimalClient();

    try {
      const response = await client.embeddings.create({
        model: modelSpec.openaiId,
        input: texts
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('Failed to get embeddings', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async generateImage(prompt: string, options: any = {}, modelId?: string): Promise<any> {
    const client = await this.selectOptimalClient();
    const imageModel = modelId || 'dall-e-3';

    try {
      const response = await client.images.generate({
        model: imageModel,
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
    const client = await this.selectOptimalClient();

    try {
      const transcription = await client.audio.transcriptions.create({
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