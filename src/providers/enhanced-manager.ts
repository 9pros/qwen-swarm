import EventEmitter from 'eventemitter3';
import type { ProviderConfig } from '@/types';
import type {
  LoadBalancingStrategy,
  CircuitBreakerConfig,
  ModelBinding,
  AgentType,
  TaskType,
  ModelSelectionCriteria,
  ModelSelectionResult,
  ProviderAnalytics,
  OptimizationRecommendation,
  HealthCheckConfig
} from '@/types';
import { BaseProvider, type ProviderRequest, type ProviderResponse, type ProviderMetrics } from './manager';
import { ModelBindingManager } from './model-binding';
import { EnhancedOpenAIProvider } from './enhanced-openai';
import { Logger } from '@/utils/logger';

export interface EnhancedProviderConfig extends ProviderConfig {
  circuitBreaker?: CircuitBreakerConfig;
  priority: number;
  region?: string;
  customHeaders?: Record<string, string>;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
  };
}

export interface ProviderPool {
  id: string;
  name: string;
  providers: PoolProvider[];
  loadBalancingStrategy: LoadBalancingStrategy;
  circuitBreaker: CircuitBreakerConfig;
  healthCheck: HealthCheckConfig;
  stickySessions: boolean;
  sessionAffinity: string;
}

export interface PoolProvider {
  providerId: string;
  provider: BaseProvider;
  weight: number;
  priority: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
  circuitState: CircuitState;
  failureCount: number;
  successCount: number;
  averageResponseTime: number;
  connectionCount: number;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface LoadBalancer {
  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null;
  updateProviderMetrics(providerId: string, success: boolean, responseTime: number): void;
  getProviderStats(poolId: string): ProviderStats[];
}

export interface ProviderStats {
  providerId: string;
  requestCount: number;
  successRate: number;
  averageResponseTime: number;
  currentLoad: number;
  isHealthy: boolean;
  circuitState: CircuitState;
}

export interface EnhancedProviderEvents {
  'pool:created': (pool: ProviderPool) => void;
  'pool:updated': (pool: ProviderPool) => void;
  'pool:deleted': (poolId: string) => void;
  'provider:added': (poolId: string, provider: PoolProvider) => void;
  'provider:removed': (poolId: string, providerId: string) => void;
  'provider:failed': (poolId: string, providerId: string, error: Error) => void;
  'provider:recovered': (poolId: string, providerId: string) => void;
  'circuit:opened': (poolId: string, providerId: string) => void;
  'circuit:closed': (poolId: string, providerId: string) => void;
  'load-balancer:updated': (poolId: string, stats: ProviderStats[]) => void;
  'optimization:recommended': (recommendation: OptimizationRecommendation) => void;
}

export class EnhancedProviderManager extends EventEmitter<EnhancedProviderEvents> {
  private providers: Map<string, BaseProvider> = new Map();
  private pools: Map<string, ProviderPool> = new Map();
  private loadBalancers: Map<LoadBalancingStrategy, LoadBalancer> = new Map();
  private modelBindingManager: ModelBindingManager;
  private analytics: Map<string, ProviderAnalytics> = new Map();
  private logger: Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'EnhancedProviderManager' });
    this.modelBindingManager = new ModelBindingManager();
    this.initializeLoadBalancers();
    this.startBackgroundTasks();
    this.setupModelBindingEvents();
  }

  // Provider Pool Management
  public async createProviderPool(config: Omit<ProviderPool, 'providers'>): Promise<string> {
    const poolId = config.id;
    const pool: ProviderPool = {
      ...config,
      providers: []
    };

    this.pools.set(poolId, pool);

    this.logger.info('Provider pool created', {
      poolId,
      name: config.name,
      loadBalancingStrategy: config.loadBalancingStrategy
    });

    this.emit('pool:created', pool);
    return poolId;
  }

  public async addProviderToPool(
    poolId: string,
    providerId: string,
    config: EnhancedProviderConfig
  ): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    // Create provider if it doesn't exist
    let provider = this.providers.get(providerId);
    if (!provider) {
      provider = await this.createProvider(providerId, config);
      await provider.initialize();
      this.providers.set(providerId, provider);
    }

    const poolProvider: PoolProvider = {
      providerId,
      provider,
      weight: config.loadBalancing?.weights?.get(providerId) || 1,
      priority: config.priority,
      isHealthy: true,
      lastHealthCheck: new Date(),
      circuitState: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      averageResponseTime: 0,
      connectionCount: 0
    };

    pool.providers.push(poolProvider);

    this.logger.info('Provider added to pool', {
      poolId,
      providerId,
      weight: poolProvider.weight,
      priority: poolProvider.priority
    });

    this.emit('provider:added', poolId, poolProvider);
  }

  public async removeProviderFromPool(poolId: string, providerId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    const index = pool.providers.findIndex(p => p.providerId === providerId);
    if (index === -1) {
      throw new Error(`Provider not found in pool: ${providerId}`);
    }

    pool.providers.splice(index, 1);

    this.logger.info('Provider removed from pool', { poolId, providerId });
    this.emit('provider:removed', poolId, providerId);
  }

  public updatePoolConfig(poolId: string, updates: Partial<ProviderPool>): void {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    Object.assign(pool, updates);

    this.logger.info('Provider pool updated', { poolId, updates: Object.keys(updates) });
    this.emit('pool:updated', pool);
  }

  public deletePool(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    this.pools.delete(poolId);
    this.logger.info('Provider pool deleted', { poolId });
    this.emit('pool:deleted', poolId);
  }

  // Enhanced Request Execution
  public async executeRequest(
    poolId: string,
    request: ProviderRequest,
    agentType?: AgentType,
    taskType?: TaskType
  ): Promise<ProviderResponse> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    // Model selection if agent and task type provided
    if (agentType && taskType) {
      const modelSelection = await this.modelBindingManager.selectOptimalModel({
        agentType,
        taskType,
        priority: request.metadata?.priority || 1,
        budgetConstraint: request.metadata?.budgetLimit,
        latencyConstraint: request.metadata?.latencyLimit,
        qualityRequirement: request.metadata?.qualityRequirement,
        requiredCapabilities: request.metadata?.requiredCapabilities
      });

      // Update request with selected model
      request.metadata = {
        ...request.metadata,
        model: modelSelection.selectedModel,
        provider: modelSelection.selectedProvider,
        estimatedCost: modelSelection.estimatedCost,
        estimatedLatency: modelSelection.estimatedLatency
      };
    }

    const loadBalancer = this.loadBalancers.get(pool.loadBalancingStrategy);
    if (!loadBalancer) {
      throw new Error(`Load balancer not found for strategy: ${pool.loadBalancingStrategy}`);
    }

    const poolProvider = loadBalancer.selectProvider(pool, request);
    if (!poolProvider) {
      throw new Error(`No healthy providers available in pool: ${poolId}`);
    }

    return this.executeWithCircuitBreaker(poolId, poolProvider, request);
  }

  public async executeStreamingRequest(
    poolId: string,
    request: ProviderRequest,
    onChunk: (chunk: string) => void,
    agentType?: AgentType,
    taskType?: TaskType
  ): Promise<ProviderResponse> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    // Model selection if agent and task type provided
    if (agentType && taskType) {
      const modelSelection = await this.modelBindingManager.selectOptimalModel({
        agentType,
        taskType,
        priority: request.metadata?.priority || 1,
        budgetConstraint: request.metadata?.budgetLimit,
        latencyConstraint: request.metadata?.latencyLimit,
        qualityRequirement: request.metadata?.qualityRequirement,
        requiredCapabilities: request.metadata?.requiredCapabilities
      });

      // Update request with selected model
      request.metadata = {
        ...request.metadata,
        model: modelSelection.selectedModel,
        provider: modelSelection.selectedProvider,
        estimatedCost: modelSelection.estimatedCost,
        estimatedLatency: modelSelection.estimatedLatency
      };
    }

    const loadBalancer = this.loadBalancers.get(pool.loadBalancingStrategy);
    if (!loadBalancer) {
      throw new Error(`Load balancer not found for strategy: ${pool.loadBalancingStrategy}`);
    }

    const poolProvider = loadBalancer.selectProvider(pool, request);
    if (!poolProvider) {
      throw new Error(`No healthy providers available in pool: ${poolId}`);
    }

    return this.executeStreamingWithCircuitBreaker(poolId, poolProvider, request, onChunk);
  }

  // Model Binding Integration
  public getModelBindingManager(): ModelBindingManager {
    return this.modelBindingManager;
  }

  public async optimizeProviderPools(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [poolId, pool] of this.pools) {
      const poolRecommendations = await this.analyzePoolOptimization(poolId, pool);
      recommendations.push(...poolRecommendations);
    }

    return recommendations;
  }

  // Analytics and Monitoring
  public getProviderAnalytics(providerId: string): ProviderAnalytics | undefined {
    return this.analytics.get(providerId);
  }

  public getAllProviderAnalytics(): ProviderAnalytics[] {
    return Array.from(this.analytics.values());
  }

  public getPoolStats(poolId: string): ProviderStats[] {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Provider pool not found: ${poolId}`);
    }

    const loadBalancer = this.loadBalancers.get(pool.loadBalancingStrategy);
    return loadBalancer ? loadBalancer.getProviderStats(poolId) : [];
  }

  public async performHealthChecks(): Promise<Map<string, Map<string, boolean>>> {
    const results = new Map<string, Map<string, boolean>>();

    for (const [poolId, pool] of this.pools) {
      const poolResults = new Map<string, boolean>();

      for (const poolProvider of pool.providers) {
        try {
          const isHealthy = await poolProvider.provider.healthCheck();
          poolProvider.isHealthy = isHealthy;
          poolProvider.lastHealthCheck = new Date();
          poolResults.set(poolProvider.providerId, isHealthy);

          if (!isHealthy && poolProvider.circuitState === CircuitState.CLOSED) {
            this.handleProviderFailure(poolId, poolProvider);
          } else if (isHealthy && poolProvider.circuitState === CircuitState.OPEN) {
            this.handleProviderRecovery(poolId, poolProvider);
          }
        } catch (error) {
          poolProvider.isHealthy = false;
          poolProvider.lastHealthCheck = new Date();
          poolResults.set(poolProvider.providerId, false);
          this.handleProviderFailure(poolId, poolProvider, error instanceof Error ? error : new Error(String(error)));
        }
      }

      results.set(poolId, poolResults);
    }

    return results;
  }

  // Lifecycle Management
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enhanced Provider Manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    const shutdownPromises = Array.from(this.providers.values()).map(provider =>
      provider.shutdown().catch(error => {
        this.logger.error('Error during provider shutdown', error instanceof Error ? error : new Error(String(error)));
      })
    );

    await Promise.allSettled(shutdownPromises);

    this.providers.clear();
    this.pools.clear();
    this.analytics.clear();

    this.logger.info('Enhanced Provider Manager shutdown complete');
  }

  // Private Methods
  private initializeLoadBalancers(): void {
    this.loadBalancers.set(LoadBalancingStrategy.ROUND_ROBIN, new RoundRobinLoadBalancer());
    this.loadBalancers.set(LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN, new WeightedRoundRobinLoadBalancer());
    this.loadBalancers.set(LoadBalancingStrategy.LEAST_CONNECTIONS, new LeastConnectionsLoadBalancer());
    this.loadBalancers.set(LoadBalancingStrategy.LEAST_RESPONSE_TIME, new LeastResponseTimeLoadBalancer());
    this.loadBalancers.set(LoadBalancingStrategy.COST_OPTIMIZED, new CostOptimizedLoadBalancer());
    this.loadBalancers.set(LoadBalancingStrategy.PERFORMANCE_BASED, new PerformanceBasedLoadBalancer());
    this.loadBalancers.set(LoadBalancingStrategy.ADAPTIVE, new AdaptiveLoadBalancer());
  }

  private startBackgroundTasks(): void {
    // Health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Every 30 seconds

    // Optimization analysis
    this.optimizationInterval = setInterval(async () => {
      const recommendations = await this.optimizeProviderPools();
      for (const recommendation of recommendations) {
        this.emit('optimization:recommended', recommendation);
      }
    }, 300000); // Every 5 minutes
  }

  private setupModelBindingEvents(): void {
    this.modelBindingManager.on('auto-optimization:triggered', (bindingId: string, optimization: any) => {
      this.logger.info('Model binding optimization triggered', { bindingId, optimization });
    });
  }

  private async createProvider(providerId: string, config: EnhancedProviderConfig): Promise<BaseProvider> {
    switch (config.type) {
      case 'openai':
        return new EnhancedOpenAIProvider(providerId, config);
      // Add other provider types here
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  private async executeWithCircuitBreaker(
    poolId: string,
    poolProvider: PoolProvider,
    request: ProviderRequest
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    poolProvider.connectionCount++;

    try {
      // Check circuit breaker
      if (poolProvider.circuitState === CircuitState.OPEN) {
        throw new Error(`Circuit breaker is OPEN for provider: ${poolProvider.providerId}`);
      }

      const response = await poolProvider.provider.executeRequest(request);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateProviderSuccess(poolId, poolProvider, responseTime);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateProviderFailure(poolId, poolProvider, responseTime, error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      poolProvider.connectionCount--;
    }
  }

  private async executeStreamingWithCircuitBreaker(
    poolId: string,
    poolProvider: PoolProvider,
    request: ProviderRequest,
    onChunk: (chunk: string) => void
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    poolProvider.connectionCount++;

    try {
      // Check circuit breaker
      if (poolProvider.circuitState === CircuitState.OPEN) {
        throw new Error(`Circuit breaker is OPEN for provider: ${poolProvider.providerId}`);
      }

      const response = await poolProvider.provider.executeStreamingRequest(request, onChunk);
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateProviderSuccess(poolId, poolProvider, responseTime);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateProviderFailure(poolId, poolProvider, responseTime, error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      poolProvider.connectionCount--;
    }
  }

  private updateProviderSuccess(poolId: string, poolProvider: PoolProvider, responseTime: number): void {
    poolProvider.successCount++;
    poolProvider.failureCount = 0;
    poolProvider.averageResponseTime = (poolProvider.averageResponseTime + responseTime) / 2;

    if (poolProvider.circuitState === CircuitState.HALF_OPEN) {
      poolProvider.circuitState = CircuitState.CLOSED;
      this.emit('circuit:closed', poolId, poolProvider.providerId);
      this.logger.info('Circuit breaker closed', { poolId, providerId: poolProvider.providerId });
    }

    // Update load balancer metrics
    const loadBalancer = this.loadBalancers.get(this.pools.get(poolId)?.loadBalancingStrategy || LoadBalancingStrategy.ROUND_ROBIN);
    if (loadBalancer) {
      loadBalancer.updateProviderMetrics(poolProvider.providerId, true, responseTime);
    }
  }

  private updateProviderFailure(
    poolId: string,
    poolProvider: PoolProvider,
    responseTime: number,
    error: Error
  ): void {
    poolProvider.failureCount++;
    poolProvider.averageResponseTime = (poolProvider.averageResponseTime + responseTime) / 2;

    this.emit('provider:failed', poolId, poolProvider.providerId, error);

    // Check circuit breaker
    const pool = this.pools.get(poolId);
    if (pool && poolProvider.failureCount >= pool.circuitBreaker.failureThreshold) {
      poolProvider.circuitState = CircuitState.OPEN;
      this.emit('circuit:opened', poolId, poolProvider.providerId);
      this.logger.warn('Circuit breaker opened', {
        poolId,
        providerId: poolProvider.providerId,
        failureCount: poolProvider.failureCount
      });
    }

    // Update load balancer metrics
    const loadBalancer = this.loadBalancers.get(this.pools.get(poolId)?.loadBalancingStrategy || LoadBalancingStrategy.ROUND_ROBIN);
    if (loadBalancer) {
      loadBalancer.updateProviderMetrics(poolProvider.providerId, false, responseTime);
    }
  }

  private handleProviderFailure(poolId: string, poolProvider: PoolProvider, error?: Error): void {
    if (error) {
      this.logger.warn('Provider health check failed', {
        poolId,
        providerId: poolProvider.providerId,
        error: error.message
      });
    }

    poolProvider.isHealthy = false;
    poolProvider.failureCount++;
  }

  private handleProviderRecovery(poolId: string, poolProvider: PoolProvider): void {
    this.logger.info('Provider recovered', {
      poolId,
      providerId: poolProvider.providerId
    });

    poolProvider.isHealthy = true;
    poolProvider.circuitState = CircuitState.HALF_OPEN;
    poolProvider.failureCount = 0;
    this.emit('provider:recovered', poolId, poolProvider.providerId);
  }

  private async analyzePoolOptimization(poolId: string, pool: ProviderPool): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze load balancing strategy
    const currentLoadBalancer = this.loadBalancers.get(pool.loadBalancingStrategy);
    if (currentLoadBalancer) {
      const stats = currentLoadBalancer.getProviderStats(poolId);
      const avgResponseTime = stats.reduce((sum, stat) => sum + stat.averageResponseTime, 0) / stats.length;
      const avgSuccessRate = stats.reduce((sum, stat) => sum + stat.successRate, 0) / stats.length;

      if (avgResponseTime > 5000 && pool.loadBalancingStrategy !== LoadBalancingStrategy.LEAST_RESPONSE_TIME) {
        recommendations.push({
          id: `pool_${poolId}_lb_strategy`,
          type: 'load_balancing' as any,
          priority: 'medium' as any,
          description: `High average response time (${avgResponseTime.toFixed(0)}ms) suggests using least response time strategy`,
          expectedImpact: 'Reduce average response time by 20-30%',
          implementation: {
            steps: [`Change load balancing strategy from ${pool.loadBalancingStrategy} to least_response_time`],
            estimatedTime: 5,
            complexity: 'low' as any,
            risk: 'low' as any,
            requiredChanges: [`pool.${poolId}.loadBalancingStrategy`],
            rollbackPlan: 'Revert to original load balancing strategy'
          },
          timestamp: new Date(),
          applied: false
        });
      }
    }

    return recommendations;
  }
}

// Load Balancer Implementations
abstract class BaseLoadBalancer implements LoadBalancer {
  protected providerMetrics: Map<string, ProviderMetrics> = new Map();

  abstract selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null;

  updateProviderMetrics(providerId: string, success: boolean, responseTime: number): void {
    const existing = this.providerMetrics.get(providerId) || {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageLatency: 0,
      totalTokensUsed: 0,
      lastRequestTime: new Date(),
      errorRate: 0,
      uptime: Date.now()
    };

    existing.requestCount++;
    existing.lastRequestTime = new Date();

    if (success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    existing.errorRate = existing.errorCount / existing.requestCount;
    existing.averageLatency = (existing.averageLatency + responseTime) / 2;

    this.providerMetrics.set(providerId, existing);
  }

  getProviderStats(poolId: string): ProviderStats[] {
    // This would need pool context to filter by pool
    return [];
  }
}

class RoundRobinLoadBalancer extends BaseLoadBalancer {
  private roundRobinIndex: Map<string, number> = new Map();

  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const healthyProviders = pool.providers.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED);
    if (healthyProviders.length === 0) return null;

    const currentIndex = this.roundRobinIndex.get(pool.id) || 0;
    const selectedProvider = healthyProviders[currentIndex % healthyProviders.length];
    this.roundRobinIndex.set(pool.id, (currentIndex + 1) % healthyProviders.length);

    return selectedProvider;
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}

class WeightedRoundRobinLoadBalancer extends BaseLoadBalancer {
  private weightedIndex: Map<string, { providerIndex: number; currentWeight: number }> = new Map();

  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const healthyProviders = pool.providers.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED);
    if (healthyProviders.length === 0) return null;

    const state = this.weightedIndex.get(pool.id) || { providerIndex: 0, currentWeight: 0 };
    const totalWeight = healthyProviders.reduce((sum, p) => sum + p.weight, 0);

    let selectedProvider: PoolProvider | null = null;
    while (state.currentWeight < totalWeight) {
      const provider = healthyProviders[state.providerIndex % healthyProviders.length];
      state.currentWeight += provider.weight;

      if (state.currentWeight >= totalWeight) {
        selectedProvider = provider;
        state.currentWeight = 0;
        state.providerIndex = (state.providerIndex + 1) % healthyProviders.length;
        break;
      }

      state.providerIndex = (state.providerIndex + 1) % healthyProviders.length;
    }

    this.weightedIndex.set(pool.id, state);
    return selectedProvider;
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}

class LeastConnectionsLoadBalancer extends BaseLoadBalancer {
  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const healthyProviders = pool.providers.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED);
    if (healthyProviders.length === 0) return null;

    return healthyProviders.reduce((least, current) =>
      current.connectionCount < least.connectionCount ? current : least
    );
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}

class LeastResponseTimeLoadBalancer extends BaseLoadBalancer {
  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const healthyProviders = pool.providers.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED);
    if (healthyProviders.length === 0) return null;

    return healthyProviders.reduce((fastest, current) =>
      current.averageResponseTime < fastest.averageResponseTime ? current : fastest
    );
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}

class CostOptimizedLoadBalancer extends BaseLoadBalancer {
  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const healthyProviders = pool.providers.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED);
    if (healthyProviders.length === 0) return null;

    // This would need access to cost information from model specs
    // For now, use priority as a proxy for cost
    return healthyProviders.reduce((cheapest, current) =>
      current.priority < cheapest.priority ? current : cheapest
    );
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}

class PerformanceBasedLoadBalancer extends BaseLoadBalancer {
  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const healthyProviders = pool.providers.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED);
    if (healthyProviders.length === 0) return null;

    return healthyProviders.reduce((best, current) => {
      const currentScore = this.calculatePerformanceScore(current);
      const bestScore = this.calculatePerformanceScore(best);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculatePerformanceScore(provider: PoolProvider): number {
    const successRate = provider.successCount / (provider.successCount + provider.failureCount);
    const latencyScore = Math.max(0, 1 - (provider.averageResponseTime / 10000)); // Normalize to 10s
    const connectionScore = Math.max(0, 1 - (provider.connectionCount / 100)); // Normalize to 100 connections

    return (successRate * 0.5) + (latencyScore * 0.3) + (connectionScore * 0.2);
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}

class AdaptiveLoadBalancer extends BaseLoadBalancer {
  private strategies: LoadBalancingStrategy[] = [
    LoadBalancingStrategy.ROUND_ROBIN,
    LoadBalancingStrategy.LEAST_RESPONSE_TIME,
    LoadBalancingStrategy.PERFORMANCE_BASED
  ];
  private currentStrategyIndex: Map<string, number> = new Map();
  private performanceHistory: Map<string, number[]> = new Map();

  selectProvider(pool: ProviderPool, request?: ProviderRequest): PoolProvider | null {
    const currentStrategyIndex = this.currentStrategyIndex.get(pool.id) || 0;
    const strategy = this.strategies[currentStrategyIndex];
    const loadBalancer = new (this.getLoadBalancerClass(strategy))();

    const provider = loadBalancer.selectProvider(pool, request);

    // Track performance and potentially switch strategies
    this.trackPerformance(pool.id, provider);

    return provider;
  }

  private getLoadBalancerClass(strategy: LoadBalancingStrategy): typeof BaseLoadBalancer {
    switch (strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN: return RoundRobinLoadBalancer;
      case LoadBalancingStrategy.LEAST_RESPONSE_TIME: return LeastResponseTimeLoadBalancer;
      case LoadBalancingStrategy.PERFORMANCE_BASED: return PerformanceBasedLoadBalancer;
      default: return RoundRobinLoadBalancer;
    }
  }

  private trackPerformance(poolId: string, provider: PoolProvider | null): void {
    if (!provider) return;

    const history = this.performanceHistory.get(poolId) || [];
    history.push(provider.averageResponseTime);

    if (history.length > 10) {
      history.shift();
    }

    this.performanceHistory.set(poolId, history);

    // Switch strategies if performance degrades
    if (history.length === 10 && this.calculatePerformanceTrend(history) < -0.1) {
      const currentIndex = this.currentStrategyIndex.get(poolId) || 0;
      this.currentStrategyIndex.set(poolId, (currentIndex + 1) % this.strategies.length);
    }
  }

  private calculatePerformanceTrend(history: number[]): number {
    if (history.length < 2) return 0;

    const first = history.slice(0, 5).reduce((a, b) => a + b) / 5;
    const last = history.slice(-5).reduce((a, b) => a + b) / 5;

    return (last - first) / first;
  }

  getProviderStats(poolId: string): ProviderStats[] {
    return [];
  }
}