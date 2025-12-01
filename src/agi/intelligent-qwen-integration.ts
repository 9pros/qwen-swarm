/**
 * Intelligent Qwen Model Integration - Advanced AI model orchestration
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from '../utils/logger';
import { QwenProvider } from '../providers/qwen';
import { AGIMemoryManager } from './memory-manager';
import { AGILearningEngine } from './learning-engine';
import { AGIContextAnalyzer, ContextAnalysis } from './context-analyzer';

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
  retryAttempts: number;
  contextWindow: number;
}

export interface ModelCapability {
  name: string;
  description: string;
  enabled: boolean;
  confidence: number;
  performanceMetrics: {
    accuracy: number;
    latency: number;
    cost: number;
    reliability: number;
  };
}

export interface ModelRequest {
  id: string;
  prompt: string;
  context?: any;
  type: 'generation' | 'analysis' | 'conversation' | 'code' | 'reasoning';
  priority: 'low' | 'medium' | 'high' | 'critical';
  config?: Partial<ModelConfig>;
  metadata?: Record<string, any>;
}

export interface ModelResponse {
  id: string;
  content: string;
  confidence: number;
  tokensUsed: number;
  latency: number;
  modelUsed: string;
  reasoning?: string;
  alternatives?: string[];
  metadata?: Record<string, any>;
}

export interface ModelPerformance {
  modelId: string;
  requestCount: number;
  successRate: number;
  averageLatency: number;
  averageConfidence: number;
  tokensUsed: number;
  costPerRequest: number;
  capabilities: ModelCapability[];
  lastUsed: Date;
}

export class IntelligentQwenIntegration extends EventEmitter {
  private logger: Logger;
  private qwenProvider?: QwenProvider;
  private memory: AGIMemoryManager;
  private learningEngine: AGILearningEngine;
  private contextAnalyzer: AGIContextAnalyzer;
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private performanceMetrics: Map<string, ModelPerformance> = new Map();
  private activeRequests: Map<string, ModelRequest> = new Map();
  private requestQueue: ModelRequest[] = [];
  private isProcessing: boolean = false;
  private intelligentRouting: boolean = true;
  private adaptivePricing: boolean = true;

  constructor(config?: any) {
    super();
    this.logger = new Logger().withContext({ component: 'IntelligentQwenIntegration' });
    this.memory = new AGIMemoryManager();
    this.learningEngine = new AGILearningEngine();
    this.contextAnalyzer = new AGIContextAnalyzer();

    this.initializeModelConfigs();
    this.initializeProvider(config);
  }

  private initializeModelConfigs(): void {
    // Qwen model configurations with intelligent defaults
    this.modelConfigs.set('qwen-turbo', {
      model: 'qwen-turbo',
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      timeout: 30000,
      retryAttempts: 3,
      contextWindow: 8192
    });

    this.modelConfigs.set('qwen-plus', {
      model: 'qwen-plus',
      maxTokens: 4096,
      temperature: 0.6,
      topP: 0.95,
      frequencyPenalty: 0.05,
      presencePenalty: 0.05,
      timeout: 45000,
      retryAttempts: 3,
      contextWindow: 16384
    });

    this.modelConfigs.set('qwen-max', {
      model: 'qwen-max',
      maxTokens: 8192,
      temperature: 0.5,
      topP: 0.9,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      timeout: 60000,
      retryAttempts: 2,
      contextWindow: 32768
    });

    this.modelConfigs.set('qwen-coder', {
      model: 'qwen-coder',
      maxTokens: 4096,
      temperature: 0.3,
      topP: 0.8,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      timeout: 45000,
      retryAttempts: 3,
      contextWindow: 16384
    });

    this.modelConfigs.set('qwen-reasoner', {
      model: 'qwen-reasoner',
      maxTokens: 6144,
      temperature: 0.2,
      topP: 0.85,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      timeout: 60000,
      retryAttempts: 2,
      contextWindow: 24576
    });

    // Initialize performance tracking
    for (const modelId of this.modelConfigs.keys()) {
      this.performanceMetrics.set(modelId, {
        modelId,
        requestCount: 0,
        successRate: 1.0,
        averageLatency: 0,
        averageConfidence: 0,
        tokensUsed: 0,
        costPerRequest: this.getBaseCost(modelId),
        capabilities: this.getModelCapabilities(modelId),
        lastUsed: new Date()
      });
    }

    this.logger.info('Model configurations initialized', {
      modelCount: this.modelConfigs.size
    });
  }

  private initializeProvider(config?: any): void {
    try {
      this.qwenProvider = new QwenProvider(config?.qwen || {
        apiKey: process.env.QWEN_API_KEY,
        endpoint: process.env.QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1',
        timeout: 60000
      });

      this.logger.info('Qwen provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Qwen provider', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public async generateResponse(request: ModelRequest): Promise<ModelResponse> {
    this.logger.info('Processing model request', {
      requestId: request.id,
      type: request.type,
      priority: request.priority
    });

    const startTime = Date.now();

    try {
      // Analyze context for intelligent routing
      const contextAnalysis = await this.contextAnalyzer.analyzeInput(request.prompt, request.context);

      // Select optimal model
      const selectedModel = await this.selectOptimalModel(request, contextAnalysis);

      // Enhance prompt with context and memory
      const enhancedPrompt = await this.enhancePrompt(request, contextAnalysis);

      // Configure model parameters based on request type and context
      const modelConfig = this.configureModel(selectedModel, request, contextAnalysis);

      // Execute request
      const response = await this.executeModelRequest(enhancedPrompt, modelConfig, request);

      // Calculate performance metrics
      const latency = Date.now() - startTime;
      response.latency = latency;
      response.modelUsed = selectedModel;

      // Update performance tracking
      await this.updatePerformanceMetrics(selectedModel, response, contextAnalysis);

      // Learn from the interaction
      await this.learnFromInteraction(request, response, contextAnalysis);

      // Store in memory
      await this.memory.store('episodic', {
        request,
        response,
        contextAnalysis,
        timestamp: new Date()
      }, {
        domain: 'model-interaction',
        type: request.type
      }, response.confidence);

      this.logger.info('Model request completed', {
        requestId: request.id,
        modelUsed: selectedModel,
        latency,
        tokensUsed: response.tokensUsed
      });

      this.emit('model:response', response);
      return response;

    } catch (error) {
      this.logger.error('Model request failed', error instanceof Error ? error : new Error(String(error)), {
        requestId: request.id
      });

      // Handle failure gracefully
      const fallbackResponse = await this.generateFallbackResponse(request);
      this.emit('model:error', { request, error, fallbackResponse });

      return fallbackResponse;
    }
  }

  public async generateCode(request: {
    prompt: string;
    language?: string;
    framework?: string;
    context?: any;
  }): Promise<ModelResponse> {
    const codeRequest: ModelRequest = {
      id: this.generateRequestId(),
      prompt: this.buildCodePrompt(request.prompt, request.language, request.framework),
      context: { ...request.context, type: 'code-generation' },
      type: 'code',
      priority: 'high',
      config: {
        temperature: 0.2, // Lower temperature for code
        maxTokens: 4096
      },
      metadata: {
        language: request.language,
        framework: request.framework,
        generationType: 'code'
      }
    };

    return this.generateResponse(codeRequest);
  }

  public async reasonAbout(request: {
    problem: string;
    context?: any;
    depth?: number;
  }): Promise<ModelResponse> {
    const reasoningRequest: ModelRequest = {
      id: this.generateRequestId(),
      prompt: this.buildReasoningPrompt(request.problem, request.depth || 3),
      context: { ...request.context, type: 'reasoning' },
      type: 'reasoning',
      priority: 'high',
      config: {
        temperature: 0.1, // Very low temperature for reasoning
        maxTokens: 6144,
        topP: 0.85
      },
      metadata: {
        reasoningDepth: request.depth,
        problemType: 'analysis'
      }
    };

    return this.generateResponse(reasoningRequest);
  }

  public async analyzeCode(request: {
    code: string;
    analysisType?: 'security' | 'performance' | 'quality' | 'architecture';
    context?: any;
  }): Promise<ModelResponse> {
    const analysisPrompt = this.buildAnalysisPrompt(request.code, request.analysisType || 'quality');

    const analysisRequest: ModelRequest = {
      id: this.generateRequestId(),
      prompt: analysisPrompt,
      context: { ...request.context, type: 'code-analysis' },
      type: 'analysis',
      priority: 'medium',
      config: {
        temperature: 0.3,
        maxTokens: 4096
      },
      metadata: {
        analysisType: request.analysisType,
        codeLength: request.code.length
      }
    };

    return this.generateResponse(analysisRequest);
  }

  public async multiStepConversation(request: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    objective?: string;
    constraints?: string[];
  }): Promise<ModelResponse> {
    const conversationPrompt = this.buildConversationPrompt(
      request.messages,
      request.objective,
      request.constraints
    );

    const conversationRequest: ModelRequest = {
      id: this.generateRequestId(),
      prompt: conversationPrompt,
      context: { type: 'conversation', messageCount: request.messages.length },
      type: 'conversation',
      priority: 'medium',
      config: {
        temperature: 0.7,
        maxTokens: 2048
      },
      metadata: {
        messageCount: request.messages.length,
        hasObjective: !!request.objective
      }
    };

    return this.generateResponse(conversationRequest);
  }

  public getModelPerformance(modelId: string): ModelPerformance | null {
    return this.performanceMetrics.get(modelId) || null;
  }

  public getAllModelPerformance(): ModelPerformance[] {
    return Array.from(this.performanceMetrics.values());
  }

  public async optimizeModelConfiguration(): Promise<void> {
    this.logger.info('Starting model configuration optimization');

    for (const [modelId, metrics] of this.performanceMetrics.entries()) {
      if (metrics.requestCount < 10) {
        continue; // Not enough data to optimize
      }

      const currentConfig = this.modelConfigs.get(modelId);
      if (!currentConfig) continue;

      // Analyze performance patterns
      const optimizationSuggestions = await this.analyzePerformancePatterns(metrics);

      // Apply optimizations
      for (const suggestion of optimizationSuggestions) {
        switch (suggestion.type) {
          case 'temperature':
            currentConfig.temperature = suggestion.value;
            break;
          case 'maxTokens':
            currentConfig.maxTokens = suggestion.value;
            break;
          case 'topP':
            currentConfig.topP = suggestion.value;
            break;
        }
      }

      this.logger.debug('Model configuration optimized', {
        modelId,
        optimizations: optimizationSuggestions.length
      });
    }

    this.emit('models:optimized');
    this.logger.info('Model configuration optimization completed');
  }

  private async selectOptimalModel(request: ModelRequest, contextAnalysis: ContextAnalysis): Promise<string> {
    if (!this.intelligentRouting) {
      return 'qwen-plus'; // Default model
    }

    const modelScores: Record<string, number> = {};

    for (const [modelId, config] of this.modelConfigs.entries()) {
      let score = 0.5; // Base score

      // Type-based selection
      switch (request.type) {
        case 'code':
          if (modelId === 'qwen-coder') score += 0.4;
          if (config.maxTokens >= 4096) score += 0.2;
          break;
        case 'reasoning':
          if (modelId === 'qwen-reasoner') score += 0.4;
          if (config.temperature <= 0.3) score += 0.2;
          break;
        case 'analysis':
          if (modelId === 'qwen-max') score += 0.3;
          if (config.contextWindow >= 16384) score += 0.2;
          break;
        case 'conversation':
          if (modelId === 'qwen-plus') score += 0.3;
          if (config.temperature >= 0.6) score += 0.2;
          break;
      }

      // Performance-based selection
      const performance = this.performanceMetrics.get(modelId);
      if (performance) {
        score += performance.successRate * 0.3;
        score += Math.max(0, (1 - performance.averageLatency / 10000)) * 0.2; // Favor lower latency
        score += performance.averageConfidence * 0.2;
      }

      // Context-based selection
      if (contextAnalysis.complexity > 0.7) {
        // Complex tasks need more capable models
        if (modelId === 'qwen-max' || modelId === 'qwen-reasoner') {
          score += 0.3;
        }
        if (config.contextWindow >= 16384) {
          score += 0.2;
        }
      }

      // Priority-based selection
      if (request.priority === 'critical') {
        // Use most reliable model for critical tasks
        if (performance && performance.successRate > 0.95) {
          score += 0.4;
        }
      }

      // Cost considerations
      if (this.adaptivePricing) {
        const cost = this.getBaseCost(modelId);
        score += (1 - cost) * 0.1; // Slight preference for cheaper models
      }

      modelScores[modelId] = score;
    }

    // Select model with highest score
    let bestModel = 'qwen-plus';
    let bestScore = 0;

    for (const [modelId, score] of Object.entries(modelScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestModel = modelId;
      }
    }

    this.logger.debug('Model selected', {
      selectedModel: bestModel,
      score: bestScore,
      alternatives: Object.entries(modelScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([model, score]) => ({ model, score }))
    });

    return bestModel;
  }

  private async enhancePrompt(request: ModelRequest, contextAnalysis: ContextAnalysis): Promise<string> {
    let enhancedPrompt = request.prompt;

    // Add context awareness
    if (contextAnalysis.domain !== 'general') {
      enhancedPrompt = `Domain: ${contextAnalysis.domain}\nContext: ${contextAnalysis.intent}\n\n${enhancedPrompt}`;
    }

    // Add relevant memories
    const relevantMemories = await this.memory.recall({
      content: contextAnalysis.intent,
      limit: 3
    });

    if (relevantMemories.length > 0) {
      const memoriesContext = relevantMemories
        .map(m => `- ${JSON.stringify(m.content).substring(0, 100)}...`)
        .join('\n');

      enhancedPrompt = `Relevant context:\n${memoriesContext}\n\n${enhancedPrompt}`;
    }

    // Add task-specific instructions
    switch (request.type) {
      case 'code':
        enhancedPrompt += '\n\nProvide clean, well-commented code that follows best practices.';
        break;
      case 'reasoning':
        enhancedPrompt += '\n\nThink step-by-step and show your reasoning process.';
        break;
      case 'analysis':
        enhancedPrompt += '\n\nProvide detailed analysis with specific insights and recommendations.';
        break;
    }

    return enhancedPrompt;
  }

  private configureModel(modelId: string, request: ModelRequest, contextAnalysis: ContextAnalysis): ModelConfig {
    const baseConfig = { ...this.modelConfigs.get(modelId)! };
    const requestConfig = request.config || {};

    // Intelligent parameter adjustment
    if (contextAnalysis.complexity > 0.8) {
      // For complex tasks, reduce temperature for more focused responses
      baseConfig.temperature *= 0.8;
    }

    if (request.priority === 'critical') {
      // For critical tasks, be more conservative
      baseConfig.temperature *= 0.9;
      baseConfig.retryAttempts = Math.max(baseConfig.retryAttempts, 5);
    }

    // Adjust based on request type
    switch (request.type) {
      case 'code':
        baseConfig.temperature = Math.min(baseConfig.temperature, 0.3);
        break;
      case 'reasoning':
        baseConfig.temperature = Math.min(baseConfig.temperature, 0.2);
        break;
      case 'conversation':
        baseConfig.temperature = Math.max(baseConfig.temperature, 0.6);
        break;
    }

    // Apply request-specific overrides
    return { ...baseConfig, ...requestConfig };
  }

  private async executeModelRequest(
    prompt: string,
    config: ModelConfig,
    request: ModelRequest
  ): Promise<ModelResponse> {
    if (!this.qwenProvider) {
      throw new Error('Qwen provider not initialized');
    }

    // Store active request
    this.activeRequests.set(request.id, request);

    try {
      const response = await this.qwenProvider.generateText(prompt, {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty
      });

      return {
        id: request.id,
        content: response.text,
        confidence: this.calculateConfidence(response, config),
        tokensUsed: response.usage?.totalTokens || 0,
        latency: 0, // Will be set by caller
        modelUsed: config.model,
        reasoning: response.reasoning,
        metadata: {
          finishReason: response.finishReason,
          usage: response.usage
        }
      };

    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  private calculateConfidence(response: any, config: ModelConfig): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on response characteristics
    if (response.finishReason === 'stop') {
      confidence += 0.2;
    }

    if (response.text && response.text.length > 50) {
      confidence += 0.1;
    }

    // Adjust based on configuration
    if (config.temperature < 0.5) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private async generateFallbackResponse(request: ModelRequest): Promise<ModelResponse> {
    return {
      id: request.id,
      content: this.getFallbackContent(request.type),
      confidence: 0.3,
      tokensUsed: 100,
      latency: 1000,
      modelUsed: 'fallback',
      metadata: { isFallback: true, originalError: true }
    };
  }

  private getFallbackContent(requestType: string): string {
    const fallbackMessages: Record<string, string> = {
      'generation': 'I apologize, but I\'m having trouble generating content right now. Please try again later.',
      'analysis': 'I\'m unable to perform the analysis at this moment. Please check your request and try again.',
      'conversation': 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
      'code': 'I\'m having trouble generating code right now. Please ensure your request is clear and try again.',
      'reasoning': 'I\'m unable to process the reasoning task currently. Please rephrase your question and try again.'
    };

    return fallbackMessages[requestType] || 'I apologize, but I\'m experiencing difficulties. Please try again later.';
  }

  private async updatePerformanceMetrics(
    modelId: string,
    response: ModelResponse,
    contextAnalysis: ContextAnalysis
  ): Promise<void> {
    const metrics = this.performanceMetrics.get(modelId);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.lastUsed = new Date();
    metrics.tokensUsed += response.tokensUsed;

    // Update success rate (simplified - in real implementation track actual failures)
    metrics.successRate = (metrics.successRate * (metrics.requestCount - 1) + 1) / metrics.requestCount;

    // Update average latency
    metrics.averageLatency = (metrics.averageLatency * (metrics.requestCount - 1) + response.latency) / metrics.requestCount;

    // Update average confidence
    metrics.averageConfidence = (metrics.averageConfidence * (metrics.requestCount - 1) + response.confidence) / metrics.requestCount;

    // Update capability metrics based on context
    this.updateCapabilityMetrics(metrics, contextAnalysis, response);
  }

  private updateCapabilityMetrics(
    metrics: ModelPerformance,
    contextAnalysis: ContextAnalysis,
    response: ModelResponse
  ): void {
    // Update capabilities based on performance
    for (const capability of metrics.capabilities) {
      switch (capability.name) {
        case 'code_generation':
          if (contextAnalysis.intent === 'create' && response.confidence > 0.7) {
            capability.performanceMetrics.accuracy =
              (capability.performanceMetrics.accuracy + response.confidence) / 2;
          }
          break;
        case 'reasoning':
          if (contextAnalysis.intent === 'analyze' && response.confidence > 0.7) {
            capability.performanceMetrics.accuracy =
              (capability.performanceMetrics.accuracy + response.confidence) / 2;
          }
          break;
        case 'conversation':
          if (contextAnalysis.domain === 'communication') {
            capability.performanceMetrics.accuracy =
              (capability.performanceMetrics.accuracy + response.confidence) / 2;
          }
          break;
      }

      // Update latency
      capability.performanceMetrics.latency = response.latency;

      // Update reliability
      capability.performanceMetrics.reliability =
        (capability.performanceMetrics.reliability * 0.9) + (response.confidence * 0.1);
    }
  }

  private async learnFromInteraction(
    request: ModelRequest,
    response: ModelResponse,
    contextAnalysis: ContextAnalysis
  ): Promise<void> {
    const learningContext = {
      request,
      response,
      contextAnalysis,
      success: response.confidence > 0.5,
      effectiveness: response.confidence
    };

    await this.learningEngine.learn(learningContext);
  }

  private async analyzePerformancePatterns(metrics: ModelPerformance): Promise<Array<{
    type: string;
    value: number;
    reason: string;
  }>> {
    const suggestions = [];

    if (metrics.averageLatency > 5000) {
      // High latency - consider reducing max tokens or switching to faster model
      suggestions.push({
        type: 'maxTokens',
        value: Math.max(1024, metrics.modelId.includes('max') ? 4096 : 2048),
        reason: 'High latency detected - reducing token limit'
      });
    }

    if (metrics.averageConfidence < 0.6) {
      // Low confidence - adjust temperature
      suggestions.push({
        type: 'temperature',
        value: 0.5,
        reason: 'Low confidence - reducing temperature for more focused responses'
      });
    }

    if (metrics.successRate < 0.8) {
      // Low success rate - adjust parameters
      suggestions.push({
        type: 'topP',
        value: 0.85,
        reason: 'Low success rate - adjusting sampling parameters'
      });
    }

    return suggestions;
  }

  private getBaseCost(modelId: string): number {
    // Relative costs (in arbitrary units)
    const costs: Record<string, number> = {
      'qwen-turbo': 0.1,
      'qwen-plus': 0.3,
      'qwen-max': 1.0,
      'qwen-coder': 0.4,
      'qwen-reasoner': 0.8
    };

    return costs[modelId] || 0.5;
  }

  private getModelCapabilities(modelId: string): ModelCapability[] {
    const baseCapabilities: ModelCapability[] = [
      {
        name: 'text_generation',
        description: 'General text generation',
        enabled: true,
        confidence: 0.8,
        performanceMetrics: {
          accuracy: 0.8,
          latency: 2000,
          cost: this.getBaseCost(modelId),
          reliability: 0.9
        }
      },
      {
        name: 'conversation',
        description: 'Conversational abilities',
        enabled: true,
        confidence: 0.7,
        performanceMetrics: {
          accuracy: 0.7,
          latency: 1500,
          cost: this.getBaseCost(modelId),
          reliability: 0.85
        }
      }
    ];

    // Add model-specific capabilities
    switch (modelId) {
      case 'qwen-coder':
        baseCapabilities.push({
          name: 'code_generation',
          description: 'Code generation and analysis',
          enabled: true,
          confidence: 0.9,
          performanceMetrics: {
            accuracy: 0.9,
            latency: 3000,
            cost: this.getBaseCost(modelId),
            reliability: 0.95
          }
        });
        break;
      case 'qwen-reasoner':
        baseCapabilities.push({
          name: 'reasoning',
          description: 'Logical reasoning and analysis',
          enabled: true,
          confidence: 0.85,
          performanceMetrics: {
            accuracy: 0.85,
            latency: 4000,
            cost: this.getBaseCost(modelId),
            reliability: 0.9
          }
        });
        break;
    }

    return baseCapabilities;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildCodePrompt(prompt: string, language?: string, framework?: string): string {
    let codePrompt = prompt;

    if (language) {
      codePrompt = `Generate ${language} code for the following:\n\n${prompt}`;
    }

    if (framework) {
      codePrompt += `\n\nUse the ${framework} framework.`;
    }

    codePrompt += '\n\nProvide clean, well-commented code that follows best practices.';

    return codePrompt;
  }

  private buildReasoningPrompt(problem: string, depth: number): string {
    return `Please reason through this problem step by step (${depth} levels deep):\n\n${problem}\n\nShow your work and explain each step of your reasoning process.`;
  }

  private buildAnalysisPrompt(code: string, analysisType: string): string {
    return `Please analyze this code with focus on ${analysisType}:\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide detailed analysis with specific findings and recommendations.`;
  }

  private buildConversationPrompt(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    objective?: string,
    constraints?: string[]
  ): string {
    let prompt = 'Continue this conversation:\n\n';

    for (const message of messages) {
      prompt += `${message.role.toUpperCase()}: ${message.content}\n\n`;
    }

    if (objective) {
      prompt += `Objective: ${objective}\n\n`;
    }

    if (constraints && constraints.length > 0) {
      prompt += `Constraints:\n${constraints.map(c => `- ${c}`).join('\n')}\n\n`;
    }

    prompt += 'Please provide a helpful and relevant response.';

    return prompt;
  }
}