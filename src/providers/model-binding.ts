import EventEmitter from 'eventemitter3';
import type {
  ModelBinding,
  AgentType,
  TaskType,
  ModelSpec,
  ModelType,
  ModelCapability,
  ModelQuality
} from '@/types';
import { Logger } from '@/utils/logger';

export interface ModelSelectionCriteria {
  agentType: AgentType;
  taskType: TaskType;
  priority: number;
  budgetConstraint?: number;
  latencyConstraint?: number;
  qualityRequirement?: ModelQuality;
  requiredCapabilities?: ModelCapability[];
  contextWindowSize?: number;
}

export interface ModelSelectionResult {
  selectedModel: string;
  selectedProvider: string;
  confidence: number;
  reasoning: string[];
  alternatives: ModelAlternative[];
  estimatedCost: number;
  estimatedLatency: number;
  qualityScore: number;
}

export interface ModelAlternative {
  model: string;
  provider: string;
  score: number;
  reasoning: string;
  tradeoffs: string[];
}

export interface ModelPerformanceMetrics {
  modelId: string;
  agentType: AgentType;
  taskType: TaskType;
  successRate: number;
  averageLatency: number;
  averageCost: number;
  qualityScore: number;
  userSatisfaction: number;
  errorRate: number;
  throughput: number;
  lastUpdated: Date;
  sampleSize: number;
}

export interface ModelBindingEvents {
  'binding:created': (binding: ModelBinding) => void;
  'binding:updated': (binding: ModelBinding) => void;
  'binding:deleted': (bindingId: string) => void;
  'model:selected': (criteria: ModelSelectionCriteria, result: ModelSelectionResult) => void;
  'performance:updated': (modelId: string, metrics: ModelPerformanceMetrics) => void;
  'auto-optimization:triggered': (bindingId: string, optimization: ModelOptimization) => void;
}

export interface ModelOptimization {
  type: 'model_switch' | 'parameter_tuning' | 'provider_change';
  oldModel?: string;
  newModel: string;
  expectedImprovement: string;
  confidence: number;
  reasoning: string;
}

export class ModelBindingManager extends EventEmitter<ModelBindingEvents> {
  private bindings: Map<string, ModelBinding> = new Map();
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private modelSpecs: Map<string, ModelSpec> = new Map();
  private providerModels: Map<string, string[]> = new Map();
  private logger: Logger;
  private autoOptimizationEnabled: boolean = true;
  private optimizationThreshold: number = 0.1;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'ModelBindingManager' });
    this.initializeDefaultBindings();
  }

  // Model Binding Management
  public createBinding(binding: ModelBinding): string {
    const bindingId = this.generateBindingId(binding.agentType, binding.taskType);

    // Validate binding
    this.validateBinding(binding);

    this.bindings.set(bindingId, binding);

    this.logger.info('Model binding created', {
      bindingId,
      agentType: binding.agentType,
      taskType: binding.taskType,
      preferredModels: binding.preferredModels
    });

    this.emit('binding:created', binding);
    return bindingId;
  }

  public updateBinding(bindingId: string, updates: Partial<ModelBinding>): void {
    const existingBinding = this.bindings.get(bindingId);
    if (!existingBinding) {
      throw new Error(`Binding not found: ${bindingId}`);
    }

    const updatedBinding = { ...existingBinding, ...updates };
    this.validateBinding(updatedBinding);

    this.bindings.set(bindingId, updatedBinding);

    this.logger.info('Model binding updated', {
      bindingId,
      updates: Object.keys(updates)
    });

    this.emit('binding:updated', updatedBinding);
  }

  public deleteBinding(bindingId: string): void {
    const deleted = this.bindings.delete(bindingId);
    if (deleted) {
      this.logger.info('Model binding deleted', { bindingId });
      this.emit('binding:deleted', bindingId);
    }
  }

  public getBinding(bindingId: string): ModelBinding | undefined {
    return this.bindings.get(bindingId);
  }

  public getBindingForAgentTask(agentType: AgentType, taskType: TaskType): ModelBinding | undefined {
    for (const binding of this.bindings.values()) {
      if (binding.agentType === agentType && binding.taskType === taskType) {
        return binding;
      }
    }
    return undefined;
  }

  public getAllBindings(): ModelBinding[] {
    return Array.from(this.bindings.values());
  }

  public getBindingsForAgentType(agentType: AgentType): ModelBinding[] {
    return Array.from(this.bindings.values()).filter(binding => binding.agentType === agentType);
  }

  public getBindingsForTaskType(taskType: TaskType): ModelBinding[] {
    return Array.from(this.bindings.values()).filter(binding => binding.taskType === taskType);
  }

  // Model Selection
  public async selectOptimalModel(criteria: ModelSelectionCriteria): Promise<ModelSelectionResult> {
    const binding = this.getBindingForAgentTask(criteria.agentType, criteria.taskType);

    if (!binding) {
      return this.performFallbackSelection(criteria);
    }

    const candidates = await this.evaluateModelCandidates(binding, criteria);
    const selected = this.rankModelCandidates(candidates, criteria);

    const result: ModelSelectionResult = {
      selectedModel: selected.modelId,
      selectedProvider: selected.provider,
      confidence: selected.score,
      reasoning: selected.reasoning,
      alternatives: selected.alternatives,
      estimatedCost: selected.estimatedCost,
      estimatedLatency: selected.estimatedLatency,
      qualityScore: selected.qualityScore
    };

    this.emit('model:selected', criteria, result);
    this.logger.debug('Model selected', {
      agentType: criteria.agentType,
      taskType: criteria.taskType,
      selectedModel: result.selectedModel,
      confidence: result.confidence
    });

    return result;
  }

  // Performance Tracking
  public updateModelPerformance(modelId: string, metrics: Partial<ModelPerformanceMetrics>): void {
    const existing = this.performanceMetrics.get(modelId);
    const updated: ModelPerformanceMetrics = {
      modelId,
      agentType: metrics.agentType || existing?.agentType || AgentType.WORKER,
      taskType: metrics.taskType || existing?.taskType || TaskType.TACTICAL_EXECUTION,
      successRate: this.updateAverage(existing?.successRate, metrics.successRate, existing?.sampleSize, 1),
      averageLatency: this.updateAverage(existing?.averageLatency, metrics.averageLatency, existing?.sampleSize, 1),
      averageCost: this.updateAverage(existing?.averageCost, metrics.averageCost, existing?.sampleSize, 1),
      qualityScore: this.updateAverage(existing?.qualityScore, metrics.qualityScore, existing?.sampleSize, 1),
      userSatisfaction: this.updateAverage(existing?.userSatisfaction, metrics.userSatisfaction, existing?.sampleSize, 1),
      errorRate: this.updateAverage(existing?.errorRate, metrics.errorRate, existing?.sampleSize, 1),
      throughput: this.updateAverage(existing?.throughput, metrics.throughput, existing?.sampleSize, 1),
      lastUpdated: new Date(),
      sampleSize: (existing?.sampleSize || 0) + 1
    };

    this.performanceMetrics.set(modelId, updated);
    this.emit('performance:updated', modelId, updated);

    if (this.autoOptimizationEnabled) {
      this.checkForOptimizationOpportunities(modelId, updated);
    }
  }

  public getModelPerformance(modelId: string): ModelPerformanceMetrics | undefined {
    return this.performanceMetrics.get(modelId);
  }

  public getAllPerformanceMetrics(): ModelPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  public getTopPerformingModels(agentType: AgentType, taskType: TaskType, limit: number = 5): ModelPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
      .filter(metrics => metrics.agentType === agentType && metrics.taskType === taskType)
      .sort((a, b) => {
        // Composite score: success rate (40%), quality (30%), low latency (20%), low cost (10%)
        const scoreA = (a.successRate * 0.4) + (a.qualityScore * 0.3) + ((1000 - Math.min(a.averageLatency, 1000)) / 1000 * 0.2) + ((100 - Math.min(a.averageCost * 1000, 100)) / 100 * 0.1);
        const scoreB = (b.successRate * 0.4) + (b.qualityScore * 0.3) + ((1000 - Math.min(b.averageLatency, 1000)) / 1000 * 0.2) + ((100 - Math.min(b.averageCost * 1000, 100)) / 100 * 0.1);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  // Model Registry
  public registerModelSpec(modelSpec: ModelSpec): void {
    this.modelSpecs.set(modelSpec.id, modelSpec);

    const providerModels = this.providerModels.get(modelSpec.provider) || [];
    if (!providerModels.includes(modelSpec.id)) {
      providerModels.push(modelSpec.id);
      this.providerModels.set(modelSpec.provider, providerModels);
    }

    this.logger.debug('Model spec registered', { modelId: modelSpec.id, provider: modelSpec.provider });
  }

  public unregisterModelSpec(modelId: string): void {
    const modelSpec = this.modelSpecs.get(modelId);
    if (modelSpec) {
      this.modelSpecs.delete(modelId);

      const providerModels = this.providerModels.get(modelSpec.provider) || [];
      const index = providerModels.indexOf(modelId);
      if (index > -1) {
        providerModels.splice(index, 1);
        this.providerModels.set(modelSpec.provider, providerModels);
      }

      this.logger.debug('Model spec unregistered', { modelId });
    }
  }

  public getModelSpec(modelId: string): ModelSpec | undefined {
    return this.modelSpecs.get(modelId);
  }

  public getModelsForProvider(provider: string): ModelSpec[] {
    const modelIds = this.providerModels.get(provider) || [];
    return modelIds.map(id => this.modelSpecs.get(id)).filter(Boolean) as ModelSpec[];
  }

  public getModelsByType(type: ModelType): ModelSpec[] {
    return Array.from(this.modelSpecs.values()).filter(model => model.type === type);
  }

  public getModelsByCapability(capability: ModelCapability): ModelSpec[] {
    return Array.from(this.modelSpecs.values()).filter(model =>
      model.capabilities.includes(capability)
    );
  }

  // Auto-optimization
  public enableAutoOptimization(threshold: number = 0.1): void {
    this.autoOptimizationEnabled = true;
    this.optimizationThreshold = threshold;
    this.logger.info('Auto-optimization enabled', { threshold });
  }

  public disableAutoOptimization(): void {
    this.autoOptimizationEnabled = false;
    this.logger.info('Auto-optimization disabled');
  }

  public async optimizeBindings(): Promise<ModelOptimization[]> {
    const optimizations: ModelOptimization[] = [];

    for (const [bindingId, binding] of this.bindings) {
      const optimization = await this.findOptimizationForBinding(bindingId, binding);
      if (optimization) {
        optimizations.push(optimization);
      }
    }

    return optimizations;
  }

  // Private Methods
  private initializeDefaultBindings(): void {
    const defaultBindings: ModelBinding[] = [
      // Queen Agent bindings
      {
        agentType: AgentType.QUEEN,
        taskType: TaskType.STRATEGIC_PLANNING,
        preferredModels: ['gpt-4-turbo-preview', 'claude-3-opus'],
        fallbackModels: ['gpt-4', 'claude-3-sonnet'],
        autoSelection: true,
        performanceThreshold: 0.95,
        costThreshold: 0.10,
        latencyThreshold: 5000
      },
      {
        agentType: AgentType.QUEEN,
        taskType: TaskType.COORDINATION,
        preferredModels: ['gpt-4-turbo-preview', 'claude-3-opus'],
        fallbackModels: ['gpt-3.5-turbo', 'claude-3-haiku'],
        autoSelection: true,
        performanceThreshold: 0.90,
        costThreshold: 0.05,
        latencyThreshold: 2000
      },
      // Worker Agent bindings
      {
        agentType: AgentType.WORKER,
        taskType: TaskType.TACTICAL_EXECUTION,
        preferredModels: ['gpt-3.5-turbo', 'claude-3-haiku'],
        fallbackModels: ['gpt-4', 'claude-3-sonnet'],
        autoSelection: true,
        performanceThreshold: 0.85,
        costThreshold: 0.02,
        latencyThreshold: 1500
      },
      {
        agentType: AgentType.WORKER,
        taskType: TaskType.CODE_GENERATION,
        preferredModels: ['gpt-4-turbo-preview', 'claude-3-opus'],
        fallbackModels: ['gpt-3.5-turbo', 'claude-3-sonnet'],
        autoSelection: true,
        performanceThreshold: 0.90,
        costThreshold: 0.03,
        latencyThreshold: 3000
      },
      // Specialist Agent bindings
      {
        agentType: AgentType.SPECIALIST,
        taskType: TaskType.DATA_ANALYSIS,
        preferredModels: ['claude-3-opus', 'gpt-4-turbo-preview'],
        fallbackModels: ['claude-3-sonnet', 'gpt-4'],
        autoSelection: true,
        performanceThreshold: 0.92,
        costThreshold: 0.08,
        latencyThreshold: 4000
      },
      {
        agentType: AgentType.SPECIALIST,
        taskType: TaskType.CONTENT_CREATION,
        preferredModels: ['claude-3-opus', 'gpt-4-turbo-preview'],
        fallbackModels: ['claude-3-sonnet', 'gpt-3.5-turbo'],
        autoSelection: true,
        performanceThreshold: 0.88,
        costThreshold: 0.06,
        latencyThreshold: 3000
      }
    ];

    for (const binding of defaultBindings) {
      this.createBinding(binding);
    }
  }

  private validateBinding(binding: ModelBinding): void {
    if (!binding.agentType || !binding.taskType) {
      throw new Error('Agent type and task type are required');
    }

    if (!binding.preferredModels || binding.preferredModels.length === 0) {
      throw new Error('At least one preferred model is required');
    }

    if (!binding.fallbackModels || binding.fallbackModels.length === 0) {
      throw new Error('At least one fallback model is required');
    }

    if (binding.performanceThreshold < 0 || binding.performanceThreshold > 1) {
      throw new Error('Performance threshold must be between 0 and 1');
    }

    if (binding.costThreshold < 0) {
      throw new Error('Cost threshold must be non-negative');
    }

    if (binding.latencyThreshold < 0) {
      throw new Error('Latency threshold must be non-negative');
    }
  }

  private generateBindingId(agentType: AgentType, taskType: TaskType): string {
    return `${agentType}_${taskType}`;
  }

  private async performFallbackSelection(criteria: ModelSelectionCriteria): Promise<ModelSelectionResult> {
    const availableModels = Array.from(this.modelSpecs.values())
      .filter(model => this.meetsRequirements(model, criteria))
      .sort((a, b) => {
        // Sort by quality, then cost efficiency
        const qualityOrder = { [ModelQuality.ULTRA]: 4, [ModelQuality.PREMIUM]: 3, [ModelQuality.STANDARD]: 2, [ModelQuality.BASIC]: 1 };
        const qualityDiff = (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
        if (qualityDiff !== 0) return qualityDiff;

        return a.costPerToken - b.costPerToken;
      });

    if (availableModels.length === 0) {
      throw new Error('No suitable models found for the given criteria');
    }

    const selected = availableModels[0];
    return {
      selectedModel: selected.id,
      selectedProvider: selected.provider,
      confidence: 0.7,
      reasoning: ['Fallback selection - no specific binding found', `Selected ${selected.name} based on quality and cost`],
      alternatives: availableModels.slice(1, 3).map(model => ({
        model: model.id,
        provider: model.provider,
        score: 0.6,
        reasoning: `Alternative model with ${model.quality} quality`,
        tradeoffs: [`Cost: ${model.costPerToken}`, `Latency: ${model.averageLatency}ms`]
      })),
      estimatedCost: selected.costPerToken * 1000, // Assume 1000 tokens
      estimatedLatency: selected.averageLatency,
      qualityScore: this.getQualityScore(selected.quality)
    };
  }

  private meetsRequirements(model: ModelSpec, criteria: ModelSelectionCriteria): boolean {
    // Check budget constraint
    if (criteria.budgetConstraint && model.costPerToken > criteria.budgetConstraint) {
      return false;
    }

    // Check latency constraint
    if (criteria.latencyConstraint && model.averageLatency > criteria.latencyConstraint) {
      return false;
    }

    // Check quality requirement
    if (criteria.qualityRequirement) {
      const qualityOrder = { [ModelQuality.BASIC]: 1, [ModelQuality.STANDARD]: 2, [ModelQuality.PREMIUM]: 3, [ModelQuality.ULTRA]: 4 };
      const modelQualityLevel = qualityOrder[model.quality] || 0;
      const requiredQualityLevel = qualityOrder[criteria.qualityRequirement] || 0;
      if (modelQualityLevel < requiredQualityLevel) {
        return false;
      }
    }

    // Check required capabilities
    if (criteria.requiredCapabilities) {
      for (const capability of criteria.requiredCapabilities) {
        if (!model.capabilities.includes(capability)) {
          return false;
        }
      }
    }

    // Check context window size
    if (criteria.contextWindowSize && model.inputLimit < criteria.contextWindowSize) {
      return false;
    }

    return true;
  }

  private async evaluateModelCandidates(binding: ModelBinding, criteria: ModelSelectionCriteria): Promise<ModelCandidate[]> {
    const candidates: ModelCandidate[] = [];

    // Evaluate preferred models
    for (const modelId of binding.preferredModels) {
      const modelSpec = this.modelSpecs.get(modelId);
      if (modelSpec && this.meetsRequirements(modelSpec, criteria)) {
        candidates.push(await this.evaluateModel(modelSpec, binding, criteria, true));
      }
    }

    // If no preferred models meet requirements, evaluate fallback models
    if (candidates.length === 0) {
      for (const modelId of binding.fallbackModels) {
        const modelSpec = this.modelSpecs.get(modelId);
        if (modelSpec && this.meetsRequirements(modelSpec, criteria)) {
          candidates.push(await this.evaluateModel(modelSpec, binding, criteria, false));
        }
      }
    }

    return candidates;
  }

  private async evaluateModel(
    modelSpec: ModelSpec,
    binding: ModelBinding,
    criteria: ModelSelectionCriteria,
    isPreferred: boolean
  ): Promise<ModelCandidate> {
    const performance = this.performanceMetrics.get(modelSpec.id);

    let score = 0.5; // Base score
    const reasoning: string[] = [];

    // Performance score
    if (performance) {
      score += performance.successRate * 0.3;
      reasoning.push(`Success rate: ${(performance.successRate * 100).toFixed(1)}%`);

      score += (performance.qualityScore / 10) * 0.2;
      reasoning.push(`Quality score: ${performance.qualityScore.toFixed(1)}/10`);

      // Latency penalty
      if (performance.averageLatency > binding.latencyThreshold) {
        score -= 0.2;
        reasoning.push(`Latency penalty: ${performance.averageLatency}ms > ${binding.latencyThreshold}ms`);
      }

      // Cost penalty
      if (performance.averageCost > binding.costThreshold) {
        score -= 0.1;
        reasoning.push(`Cost penalty: $${performance.averageCost.toFixed(4)} > $${binding.costThreshold.toFixed(4)}`);
      }
    } else {
      // Use model spec defaults if no performance data
      score += this.getQualityScore(modelSpec.quality) * 0.2;
      reasoning.push(`Model quality: ${modelSpec.quality}`);
    }

    // Preferred model bonus
    if (isPreferred) {
      score += 0.2;
      reasoning.push('Preferred model bonus');
    }

    // Priority bonus
    score += (criteria.priority / 3) * 0.1; // Assuming priority max is 3
    reasoning.push(`Priority: ${criteria.priority}/3`);

    return {
      modelId: modelSpec.id,
      provider: modelSpec.provider,
      score: Math.min(Math.max(score, 0), 1),
      reasoning,
      estimatedCost: performance?.averageCost || modelSpec.costPerToken * 1000,
      estimatedLatency: performance?.averageLatency || modelSpec.averageLatency,
      qualityScore: performance?.qualityScore || this.getQualityScore(modelSpec.quality)
    };
  }

  private rankModelCandidates(candidates: ModelCandidate[], criteria: ModelSelectionCriteria): ModelCandidate {
    if (candidates.length === 0) {
      throw new Error('No suitable model candidates found');
    }

    // Sort by score, then by cost (lower is better), then by latency (lower is better)
    candidates.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.05) {
        return b.score - a.score; // Higher score first
      }
      if (Math.abs(a.estimatedCost - b.estimatedCost) > 0.001) {
        return a.estimatedCost - b.estimatedCost; // Lower cost first
      }
      return a.estimatedLatency - b.estimatedLatency; // Lower latency first
    });

    const selected = candidates[0];
    selected.alternatives = candidates.slice(1, 3).map(candidate => ({
      model: candidate.modelId,
      provider: candidate.provider,
      score: candidate.score,
      reasoning: candidate.reasoning.join(', '),
      tradeoffs: [
        `Cost: $${candidate.estimatedCost.toFixed(4)}`,
        `Latency: ${candidate.estimatedLatency}ms`,
        `Quality: ${candidate.qualityScore.toFixed(1)}/10`
      ]
    }));

    return selected;
  }

  private getQualityScore(quality: ModelQuality): number {
    const scores = {
      [ModelQuality.BASIC]: 3,
      [ModelQuality.STANDARD]: 6,
      [ModelQuality.PREMIUM]: 8,
      [ModelQuality.ULTRA]: 10
    };
    return scores[quality] || 5;
  }

  private updateAverage(existing: number | undefined, newValue: number | undefined, existingSamples: number, newSamples: number): number {
    if (newValue === undefined) return existing || 0;
    if (existing === undefined) return newValue;

    const totalSamples = existingSamples + newSamples;
    return ((existing * existingSamples) + (newValue * newSamples)) / totalSamples;
  }

  private checkForOptimizationOpportunities(modelId: string, metrics: ModelPerformanceMetrics): void {
    const binding = this.getBindingForAgentTask(metrics.agentType, metrics.taskType);
    if (!binding) return;

    // Check if performance is below threshold
    if (metrics.successRate < binding.performanceThreshold) {
      this.triggerOptimization(binding, {
        type: 'model_switch',
        newModel: this.findBetterModel(binding, metrics),
        expectedImprovement: `Improve success rate from ${(metrics.successRate * 100).toFixed(1)}% to above ${(binding.performanceThreshold * 100).toFixed(1)}%`,
        confidence: 0.8,
        reasoning: `Current model ${modelId} underperforming with success rate of ${(metrics.successRate * 100).toFixed(1)}%`
      });
    }
  }

  private findBetterModel(binding: ModelBinding, currentMetrics: ModelPerformanceMetrics): string {
    // Simple implementation - return first preferred model that's not current
    for (const modelId of binding.preferredModels) {
      if (modelId !== currentMetrics.modelId) {
        return modelId;
      }
    }

    // If no preferred models, check fallback
    for (const modelId of binding.fallbackModels) {
      if (modelId !== currentMetrics.modelId) {
        return modelId;
      }
    }

    return binding.preferredModels[0]; // Fallback to first preferred
  }

  private triggerOptimization(binding: ModelBinding, optimization: ModelOptimization): void {
    const bindingId = this.generateBindingId(binding.agentType, binding.taskType);
    this.emit('auto-optimization:triggered', bindingId, optimization);

    this.logger.info('Auto-optimization triggered', {
      bindingId,
      type: optimization.type,
      reasoning: optimization.reasoning
    });
  }

  private async findOptimizationForBinding(bindingId: string, binding: ModelBinding): Promise<ModelOptimization | null> {
    // Get performance metrics for all models in this binding
    const modelMetrics = Array.from(this.performanceMetrics.values())
      .filter(metrics =>
        (binding.preferredModels.includes(metrics.modelId) ||
         binding.fallbackModels.includes(metrics.modelId)) &&
        metrics.agentType === binding.agentType &&
        metrics.taskType === binding.taskType
      );

    if (modelMetrics.length === 0) return null;

    // Find worst performing model
    const worstModel = modelMetrics.reduce((worst, current) =>
      current.successRate < worst.successRate ? current : worst
    );

    // If worst model is significantly underperforming, suggest switch
    if (worstModel.successRate < binding.performanceThreshold - this.optimizationThreshold) {
      const bestModel = modelMetrics.reduce((best, current) =>
        current.successRate > best.successRate ? current : best
      );

      return {
        type: 'model_switch',
        oldModel: worstModel.modelId,
        newModel: bestModel.modelId,
        expectedImprovement: `Improve success rate from ${(worstModel.successRate * 100).toFixed(1)}% to ${(bestModel.successRate * 100).toFixed(1)}%`,
        confidence: 0.7,
        reasoning: `${worstModel.modelId} consistently underperforming for ${binding.agentType} agents on ${binding.taskType} tasks`
      };
    }

    return null;
  }
}

interface ModelCandidate {
  modelId: string;
  provider: string;
  score: number;
  reasoning: string[];
  estimatedCost: number;
  estimatedLatency: number;
  qualityScore: number;
  alternatives?: ModelAlternative[];
}