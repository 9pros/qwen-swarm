import EventEmitter from 'eventemitter3';
import type { ProviderConfig, AgentType, TaskType, ModelSpec, ModelConfiguration } from '@/types';
import { EnhancedProviderManager } from './enhanced-manager';
import { EnhancedOpenAIProvider } from './enhanced-openai';
import { ModelBindingManager } from './model-binding';
import { DynamicProviderConfiguration } from './dynamic-config';
import { ProviderAnalyticsEngine, type AnalyticsConfig, type AnalyticsEvent } from './analytics';
import { Logger } from '@/utils/logger';

export interface EnhancedProviderSystemConfig {
  providers: ProviderConfig[];
  pools: ProviderPoolConfig[];
  modelBindings: ModelBindingConfig[];
  analytics: AnalyticsConfig;
  features: {
    autoOptimization: boolean;
    predictiveScaling: boolean;
    costOptimization: boolean;
    performanceMonitoring: boolean;
    healthChecking: boolean;
    loadBalancing: boolean;
    circuitBreakers: boolean;
  };
}

export interface ProviderPoolConfig {
  id: string;
  name: string;
  providerIds: string[];
  loadBalancingStrategy: string;
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeout: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
  };
}

export interface ModelBindingConfig {
  agentType: AgentType;
  taskType: TaskType;
  preferredModels: string[];
  fallbackModels: string[];
  autoSelection: boolean;
  performanceThreshold: number;
  costThreshold: number;
}

export interface SystemMetrics {
  totalProviders: number;
  activeProviders: number;
  healthyProviders: number;
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  totalCost: number;
  uptime: number;
  alertsCount: number;
  recommendationsCount: number;
}

export interface EnhancedProviderSystemEvents {
  'system:initialized': () => void;
  'system:shutdown': () => void;
  'provider:registered': (providerId: string) => void;
  'provider:unregistered': (providerId: string) => void;
  'pool:created': (poolId: string) => void;
  'binding:created': (bindingId: string) => void;
  'metrics:updated': (metrics: SystemMetrics) => void;
  'alert:triggered': (alert: any) => void;
  'optimization:applied': (optimization: any) => void;
  'emergency:fallback': (providerId: string, fallbackProviderId: string) => void;
}

export class EnhancedProviderSystem extends EventEmitter<EnhancedProviderSystemEvents> {
  private providerManager: EnhancedProviderManager;
  private modelBindingManager: ModelBindingManager;
  private configManager: DynamicProviderConfiguration;
  private analyticsEngine: ProviderAnalyticsEngine;
  private logger: Logger;
  private config: EnhancedProviderSystemConfig;
  private isInitialized: boolean = false;
  private metrics: SystemMetrics;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor(config: EnhancedProviderSystemConfig) {
    super();
    this.config = config;
    this.logger = new Logger().withContext({ component: 'EnhancedProviderSystem' });
    this.initializeComponents();
    this.setupEventHandlers();
    this.initializeMetrics();
  }

  // System Lifecycle
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Enhanced Provider System...');

      // Initialize components
      await this.initializeConfiguration();
      await this.initializeProviders();
      await this.initializePools();
      await this.initializeModelBindings();
      await this.initializeAnalytics();

      // Start background processes
      this.startMetricsCollection();

      this.isInitialized = true;
      this.emit('system:initialized');

      this.logger.info('Enhanced Provider System initialized successfully', {
        providersCount: this.config.providers.length,
        poolsCount: this.config.pools.length,
        features: this.config.features
      });

    } catch (error) {
      this.logger.error('Failed to initialize Enhanced Provider System', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    this.logger.info('Shutting down Enhanced Provider System...');

    try {
      // Stop background processes
      this.stopMetricsCollection();

      // Shutdown components
      await this.providerManager.shutdown();
      this.analyticsEngine.stop();

      // Cleanup
      await this.analyticsEngine.cleanup();

      this.isInitialized = false;
      this.emit('system:shutdown');

      this.logger.info('Enhanced Provider System shutdown completed');

    } catch (error) {
      this.logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Provider Operations
  public async executeRequest(
    poolId: string,
    request: any,
    agentType?: AgentType,
    taskType?: TaskType
  ): Promise<any> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Log request start
      this.logAnalyticsEvent({
        type: 'request_started',
        timestamp: new Date(),
        providerId: poolId,
        agentType,
        taskType,
        data: {
          requestId: request.id,
          model: request.model,
          tokens: request.maxTokens
        }
      });

      // Execute request
      const response = await this.providerManager.executeRequest(poolId, request, agentType, taskType);

      // Log successful completion
      this.logAnalyticsEvent({
        type: 'request_completed',
        timestamp: new Date(),
        providerId: poolId,
        agentType,
        taskType,
        data: {
          requestId: request.id,
          model: response.model,
          tokens: response.usage.totalTokens,
          latency: Date.now() - startTime,
          cost: this.estimateCost(response.usage.totalTokens, response.model)
        }
      });

      // Update metrics
      this.updateSystemMetrics();

      return response;

    } catch (error) {
      // Log failed request
      this.logAnalyticsEvent({
        type: 'request_failed',
        timestamp: new Date(),
        providerId: poolId,
        agentType,
        taskType,
        data: {
          requestId: request.id,
          error: error instanceof Error ? error.message : String(error),
          latency: Date.now() - startTime
        }
      });

      // Update metrics
      this.updateSystemMetrics();

      throw error;
    }
  }

  public async executeStreamingRequest(
    poolId: string,
    request: any,
    onChunk: (chunk: string) => void,
    agentType?: AgentType,
    taskType?: TaskType
  ): Promise<any> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Log request start
      this.logAnalyticsEvent({
        type: 'request_started',
        timestamp: new Date(),
        providerId: poolId,
        agentType,
        taskType,
        data: {
          requestId: request.id,
          model: request.model,
          streaming: true
        }
      });

      // Execute streaming request
      const response = await this.providerManager.executeStreamingRequest(
        poolId,
        request,
        onChunk,
        agentType,
        taskType
      );

      // Log successful completion
      this.logAnalyticsEvent({
        type: 'request_completed',
        timestamp: new Date(),
        providerId: poolId,
        agentType,
        taskType,
        data: {
          requestId: request.id,
          model: response.model,
          tokens: response.usage.totalTokens,
          latency: Date.now() - startTime,
          streaming: true,
          cost: this.estimateCost(response.usage.totalTokens, response.model)
        }
      });

      // Update metrics
      this.updateSystemMetrics();

      return response;

    } catch (error) {
      // Log failed request
      this.logAnalyticsEvent({
        type: 'request_failed',
        timestamp: new Date(),
        providerId: poolId,
        agentType,
        taskType,
        data: {
          requestId: request.id,
          error: error instanceof Error ? error.message : String(error),
          latency: Date.now() - startTime,
          streaming: true
        }
      });

      // Update metrics
      this.updateSystemMetrics();

      throw error;
    }
  }

  // Model Management
  public async registerModel(modelSpec: ModelSpec): Promise<void> {
    this.modelBindingManager.registerModelSpec(modelSpec);
    this.logger.info('Model registered', { modelId: modelSpec.id, provider: modelSpec.provider });
  }

  public async unregisterModel(modelId: string): Promise<void> {
    this.modelBindingManager.unregisterModelSpec(modelId);
    this.logger.info('Model unregistered', { modelId });
  }

  public getAvailableModels(agentType?: AgentType, taskType?: TaskType): ModelSpec[] {
    if (agentType && taskType) {
      const binding = this.modelBindingManager.getBindingForAgentTask(agentType, taskType);
      if (binding) {
        return binding.preferredModels
          .map(modelId => this.modelBindingManager.getModelSpec(modelId))
          .filter(Boolean) as ModelSpec[];
      }
    }

    return Array.from(this.modelBindingManager.getAllPerformanceMetrics())
      .map(metrics => this.modelBindingManager.getModelSpec(metrics.modelId))
      .filter(Boolean) as ModelSpec[];
  }

  // Configuration Management
  public async updateConfiguration(updates: Partial<EnhancedProviderSystemConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };

    // Update individual components
    if (updates.analytics) {
      this.analyticsEngine.updateConfig(updates.analytics);
    }

    this.logger.info('System configuration updated', { updates: Object.keys(updates) });
  }

  // Analytics and Monitoring
  public getSystemMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getProviderAnalytics(providerId: string) {
    return this.analyticsEngine.getProviderAnalytics(providerId);
  }

  public getSystemAlerts() {
    return this.analyticsEngine.getUnresolvedAlerts();
  }

  public getSystemRecommendations() {
    const recommendations = [];
    for (const providerId of Object.keys(this.analyticsEngine.getAllProviderAnalytics())) {
      recommendations.push(...this.analyticsEngine.getProviderRecommendations(providerId));
    }
    return recommendations;
  }

  // Optimization
  public async optimizeSystem(): Promise<any[]> {
    if (!this.config.features.autoOptimization) {
      return [];
    }

    this.logger.info('Starting system optimization...');

    const optimizations = [];

    try {
      // Provider pool optimizations
      const poolOptimizations = await this.providerManager.optimizeProviderPools();
      optimizations.push(...poolOptimizations);

      // Model binding optimizations
      const bindingOptimizations = await this.modelBindingManager.optimizeBindings();
      optimizations.push(...bindingOptimizations);

      // Analytics-based optimizations
      for (const providerId of Object.keys(this.analyticsEngine.getAllProviderAnalytics())) {
        const analyticsOptimizations = await this.analyticsEngine.generateOptimizations(providerId);
        optimizations.push(...analyticsOptimizations);
      }

      this.logger.info('System optimization completed', { optimizationsCount: optimizations.length });

      return optimizations;

    } catch (error) {
      this.logger.error('System optimization failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Health and Diagnostics
  public async performHealthCheck(): Promise<Map<string, boolean>> {
    return this.providerManager.performHealthChecks();
  }

  public getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Map<string, boolean>;
    alerts: number;
    recommendations: number;
  } {
    const healthChecks = Array.from(this.performHealthCheck().values());
    const healthyProviders = healthChecks.filter(healthy => healthy).length;
    const healthRatio = healthyProviders / healthChecks.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthRatio >= 0.9) {
      status = 'healthy';
    } else if (healthRatio >= 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      providers: new Map(this.performHealthCheck()),
      alerts: this.getSystemAlerts().length,
      recommendations: this.getSystemRecommendations().length
    };
  }

  // Private Methods
  private initializeComponents(): void {
    this.providerManager = new EnhancedProviderManager();
    this.modelBindingManager = new ModelBindingManager();
    this.configManager = new DynamicProviderConfiguration();
    this.analyticsEngine = new ProviderAnalyticsEngine(this.config.analytics);
  }

  private setupEventHandlers(): void {
    // Provider manager events
    this.providerManager.on('provider:failed', (poolId: string, providerId: string, error: Error) => {
      this.handleProviderFailure(poolId, providerId, error);
    });

    this.providerManager.on('provider:recovered', (poolId: string, providerId: string) => {
      this.handleProviderRecovery(poolId, providerId);
    });

    this.providerManager.on('circuit:opened', (poolId: string, providerId: string) => {
      this.handleCircuitBreakerOpen(poolId, providerId);
    });

    // Analytics events
    this.analyticsEngine.on('alert:triggered', (alert: any) => {
      this.emit('alert:triggered', alert);
    });

    this.analyticsEngine.on('recommendation:generated', (recommendation: any) => {
      this.emit('optimization:applied', recommendation);
    });
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalProviders: 0,
      activeProviders: 0,
      healthyProviders: 0,
      totalRequests: 0,
      successRate: 1,
      averageLatency: 0,
      totalCost: 0,
      uptime: Date.now(),
      alertsCount: 0,
      recommendationsCount: 0
    };
  }

  private async initializeConfiguration(): Promise<void> {
    // Initialize configuration manager with default settings
    await this.configManager.loadConfiguration();
  }

  private async initializeProviders(): Promise<void> {
    for (const providerConfig of this.config.providers) {
      try {
        // Create and register provider
        const provider = this.createProvider(providerConfig);

        // Add to provider manager (would need pool configuration)
        // For now, just log the registration
        this.metrics.totalProviders++;
        this.metrics.activeProviders++;

        this.emit('provider:registered', providerConfig.model);
        this.logger.info('Provider initialized', { type: providerConfig.type, model: providerConfig.model });

      } catch (error) {
        this.logger.error('Failed to initialize provider', error instanceof Error ? error : new Error(String(error)), { providerConfig });
      }
    }
  }

  private async initializePools(): Promise<void> {
    for (const poolConfig of this.config.pools) {
      try {
        // Create provider pool
        await this.providerManager.createProviderPool({
          id: poolConfig.id,
          name: poolConfig.name,
          providers: [],
          loadBalancingStrategy: poolConfig.loadBalancingStrategy as any,
          circuitBreaker: {
            failureThreshold: poolConfig.circuitBreaker.failureThreshold,
            recoveryTimeout: poolConfig.circuitBreaker.recoveryTimeout,
            halfOpenMaxCalls: 5,
            monitoringPeriod: 60000
          },
          healthCheck: {
            enabled: poolConfig.healthCheck.enabled,
            interval: poolConfig.healthCheck.interval,
            timeout: 5000,
            retryAttempts: 3,
            endpoints: ['/health']
          },
          stickySessions: false,
          sessionAffinity: 'none'
        });

        this.emit('pool:created', poolConfig.id);
        this.logger.info('Provider pool created', { poolId: poolConfig.id });

      } catch (error) {
        this.logger.error('Failed to create provider pool', error instanceof Error ? error : new Error(String(error)), { poolConfig });
      }
    }
  }

  private async initializeModelBindings(): Promise<void> {
    for (const bindingConfig of this.config.modelBindings) {
      try {
        const bindingId = this.modelBindingManager.createBinding({
          agentType: bindingConfig.agentType,
          taskType: bindingConfig.taskType,
          preferredModels: bindingConfig.preferredModels,
          fallbackModels: bindingConfig.fallbackModels,
          autoSelection: bindingConfig.autoSelection,
          performanceThreshold: bindingConfig.performanceThreshold,
          costThreshold: bindingConfig.costThreshold,
          latencyThreshold: 5000
        });

        this.emit('binding:created', bindingId);
        this.logger.info('Model binding created', { bindingId, agentType: bindingConfig.agentType, taskType: bindingConfig.taskType });

      } catch (error) {
        this.logger.error('Failed to create model binding', error instanceof Error ? error : new Error(String(error)), { bindingConfig });
      }
    }
  }

  private async initializeAnalytics(): Promise<void> {
    this.analyticsEngine.start();
    this.logger.info('Analytics engine started');
  }

  private startMetricsCollection(): void {
    this.metricsUpdateInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 30000); // Update every 30 seconds
  }

  private stopMetricsCollection(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }
  }

  private updateSystemMetrics(): void {
    const healthChecks = this.performHealthCheck();
    const healthyCount = Array.from(healthChecks.values()).filter(healthy => healthy).length;

    // Get analytics data
    const allAnalytics = this.analyticsEngine.getAllProviderAnalytics();
    const totalRequests = allAnalytics.reduce((sum, analytics) =>
      sum + analytics.metrics.requestMetrics.totalRequests, 0);
    const totalSuccessful = allAnalytics.reduce((sum, analytics) =>
      sum + analytics.metrics.requestMetrics.successfulRequests, 0);
    const totalLatency = allAnalytics.reduce((sum, analytics) =>
      sum + analytics.metrics.latencyMetrics.averageLatency, 0);
    const totalCost = allAnalytics.reduce((sum, analytics) =>
      sum + analytics.costTracking.totalCost, 0);

    this.metrics = {
      totalProviders: this.config.providers.length,
      activeProviders: this.config.providers.length, // Simplified
      healthyProviders: healthyCount,
      totalRequests,
      successRate: totalRequests > 0 ? totalSuccessful / totalRequests : 1,
      averageLatency: allAnalytics.length > 0 ? totalLatency / allAnalytics.length : 0,
      totalCost,
      uptime: Date.now(),
      alertsCount: this.getSystemAlerts().length,
      recommendationsCount: this.getSystemRecommendations().length
    };

    this.emit('metrics:updated', this.metrics);
  }

  private createProvider(providerConfig: ProviderConfig) {
    switch (providerConfig.type) {
      case 'openai':
        return new EnhancedOpenAIProvider(providerConfig.model, providerConfig);
      default:
        throw new Error(`Unsupported provider type: ${providerConfig.type}`);
    }
  }

  private logAnalyticsEvent(event: AnalyticsEvent): void {
    this.analyticsEngine.processEvent(event);
  }

  private handleProviderFailure(poolId: string, providerId: string, error: Error): void {
    this.logger.warn('Provider failure detected', { poolId, providerId, error: error.message });

    this.logAnalyticsEvent({
      type: 'error_occurred',
      timestamp: new Date(),
      providerId,
      data: {
        errorType: 'provider_failure',
        errorMessage: error.message,
        context: { poolId }
      }
    });
  }

  private handleProviderRecovery(poolId: string, providerId: string): void {
    this.logger.info('Provider recovery detected', { poolId, providerId });
  }

  private handleCircuitBreakerOpen(poolId: string, providerId: string): void {
    this.logger.warn('Circuit breaker opened', { poolId, providerId });

    this.logAnalyticsEvent({
      type: 'error_occurred',
      timestamp: new Date(),
      providerId,
      data: {
        errorType: 'circuit_breaker_open',
        errorMessage: 'Circuit breaker opened due to high failure rate',
        context: { poolId }
      }
    });
  }

  private estimateCost(tokens: number, model: string): number {
    // Simple cost estimation - would be more sophisticated in production
    const costPerToken = 0.00001; // Default rate
    return tokens * costPerToken;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Enhanced Provider System is not initialized');
    }
  }
}