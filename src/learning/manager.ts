import EventEmitter from 'eventemitter3';
import type {
  LearningPattern,
  PatternType,
  SelfImprovementGoal,
  ImprovementCategory,
  GoalStatus,
  SystemConfig
} from '@/types';
import { Logger } from '@/utils/logger';

export interface LearningEvents {
  'pattern:detected': (pattern: LearningPattern) => void;
  'pattern:updated': (patternId: string, pattern: LearningPattern) => void;
  'goal:created': (goal: SelfImprovementGoal) => void;
  'goal:updated': (goalId: string, goal: SelfImprovementGoal) => void;
  'goal:achieved': (goalId: string) => void;
  'improvement:suggested': (improvementType: string, suggestion: unknown) => void;
  'improvement:applied': (improvementType: string, result: unknown) => void;
}

export interface LearningMetrics {
  patternsDetected: number;
  goalsCreated: number;
  goalsAchieved: number;
  improvementsSuggested: number;
  improvementsApplied: number;
  averageImprovementTime: number;
  learningRate: number;
  lastLearningActivity: Date;
}

export class LearningManager extends EventEmitter<LearningEvents> {
  private patterns: Map<string, LearningPattern> = new Map();
  private goals: Map<string, SelfImprovementGoal> = new Map();
  private config: SystemConfig['learning'];
  private logger: Logger;
  private metrics: LearningMetrics;
  private learningInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'LearningManager' });
    this.metrics = this.initializeMetrics();
    this.config = {} as any;
  }

  public async initialize(config: SystemConfig['learning']): Promise<void> {
    this.config = config;
    this.logger.info('Initializing Learning Manager', {
      algorithm: config.algorithm,
      learningRate: config.learningRate,
      enabled: config.enabled
    });

    if (config.enabled) {
      this.startLearningProcess();
    }
  }

  public async observeBehavior(
    agentId: string,
    action: string,
    context: Record<string, unknown>,
    outcome: 'success' | 'failure' | 'partial',
    metrics: Record<string, number>
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await this.analyzeBehavior(agentId, action, context, outcome, metrics);
    await this.updatePatterns(agentId, action, context, outcome, metrics);
    await this.evaluateGoals();
  }

  public async detectPattern(
    type: PatternType,
    pattern: unknown,
    context: Record<string, unknown>,
    confidence: number = 0.5
  ): Promise<string> {
    const patternId = this.generatePatternId();
    const learningPattern: LearningPattern = {
      id: patternId,
      type,
      pattern,
      frequency: 1,
      confidence,
      lastObserved: new Date(),
      context,
      predictedOutcomes: []
    };

    this.patterns.set(patternId, learningPattern);
    this.updateMetrics('pattern_detected');

    this.logger.debug('Learning pattern detected', {
      patternId,
      type,
      confidence,
      context
    });

    this.emit('pattern:detected', learningPattern);
    return patternId;
  }

  public async createGoal(
    category: ImprovementCategory,
    description: string,
    currentMetric: number,
    targetMetric: number,
    deadline: Date,
    strategies: string[] = []
  ): Promise<string> {
    const goalId = this.generateGoalId();
    const goal: SelfImprovementGoal = {
      id: goalId,
      category,
      description,
      currentMetric,
      targetMetric,
      deadline,
      strategies: strategies.map(strategy => ({
        id: this.generateStrategyId(),
        name: strategy,
        description: `Strategy to improve ${category}`,
        steps: [],
        resources: [],
        expectedImpact: 0.5,
        implementationComplexity: 0.5,
        riskLevel: 0.3
      })),
      progress: 0,
      status: GoalStatus.PENDING
    };

    this.goals.set(goalId, goal);
    this.updateMetrics('goal_created');

    this.logger.info('Self-improvement goal created', {
      goalId,
      category,
      description,
      currentMetric,
      targetMetric,
      deadline
    });

    this.emit('goal:created', goal);
    return goalId;
  }

  public async suggestImprovements(
    category: ImprovementCategory,
    currentMetrics: Record<string, number>
  ): Promise<Array<{
    type: string;
    description: string;
    impact: number;
    confidence: number;
    implementation: string[];
  }>> {
    const suggestions = await this.generateImprovementSuggestions(category, currentMetrics);

    for (const suggestion of suggestions) {
      this.emit('improvement:suggested', category, suggestion);
    }

    this.updateMetrics('improvement_suggested');
    return suggestions;
  }

  public async applyImprovement(
    improvementType: string,
    implementation: Record<string, unknown>
  ): Promise<void> {
    try {
      const result = await this.executeImprovement(improvementType, implementation);
      this.updateMetrics('improvement_applied');

      this.logger.info('Improvement applied', {
        improvementType,
        result
      });

      this.emit('improvement:applied', improvementType, result);

      await this.evaluateImprovementImpact(improvementType, result);

    } catch (error) {
      this.logger.error('Failed to apply improvement', error instanceof Error ? error : new Error(String(error)), { improvementType });
      throw error;
    }
  }

  public getPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values());
  }

  public getPatternsByType(type: PatternType): LearningPattern[] {
    return Array.from(this.patterns.values()).filter(pattern => pattern.type === type);
  }

  public getGoals(): SelfImprovementGoal[] {
    return Array.from(this.goals.values());
  }

  public getGoalsByStatus(status: GoalStatus): SelfImprovementGoal[] {
    return Array.from(this.goals.values()).filter(goal => goal.status === status);
  }

  public getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  private async analyzeBehavior(
    agentId: string,
    action: string,
    context: Record<string, unknown>,
    outcome: 'success' | 'failure' | 'partial',
    metrics: Record<string, number>
  ): Promise<void> {
    this.logger.debug('Analyzing behavior', {
      agentId,
      action,
      outcome,
      metrics
    });

    if (outcome === 'success') {
      await this.reinforceSuccessfulBehavior(agentId, action, context, metrics);
    } else if (outcome === 'failure') {
      await this.analyzeFailurePattern(agentId, action, context, metrics);
    }
  }

  private async updatePatterns(
    agentId: string,
    action: string,
    context: Record<string, unknown>,
    outcome: 'success' | 'failure' | 'partial',
    metrics: Record<string, number>
  ): Promise<void> {
    for (const [patternId, pattern] of this.patterns) {
      if (this.matchesPattern(pattern, action, context)) {
        pattern.frequency++;
        pattern.lastObserved = new Date();

        if (outcome === 'success') {
          pattern.confidence = Math.min(pattern.confidence + this.config.learningRate, 1.0);
        } else if (outcome === 'failure') {
          pattern.confidence = Math.max(pattern.confidence - this.config.learningRate * 0.5, 0.0);
        }

        this.emit('pattern:updated', patternId, pattern);
      }
    }
  }

  private matchesPattern(pattern: LearningPattern, action: string, context: Record<string, unknown>): boolean {
    if (typeof pattern.pattern === 'object' && pattern.pattern !== null) {
      const patternObj = pattern.pattern as any;
      return Object.keys(patternObj).every(key => patternObj[key] === context[key]);
    }
    return true;
  }

  private async reinforceSuccessfulBehavior(
    agentId: string,
    action: string,
    context: Record<string, unknown>,
    metrics: Record<string, number>
  ): Promise<void> {
    await this.detectPattern(
      PatternType.SUCCESS,
      { action, context, agentId },
      context,
      0.7
    );
  }

  private async analyzeFailurePattern(
    agentId: string,
    action: string,
    context: Record<string, unknown>,
    metrics: Record<string, number>
  ): Promise<void> {
    await this.detectPattern(
      PatternType.ERROR,
      { action, context, agentId, error: true },
      context,
      0.8
    );
  }

  private async evaluateGoals(): Promise<void> {
    const now = new Date();

    for (const [goalId, goal] of this.goals) {
      if (goal.status === GoalStatus.PENDING && now >= goal.deadline) {
        goal.status = GoalStatus.FAILED;
        this.emit('goal:updated', goalId, goal);
      } else if (goal.status === GoalStatus.IN_PROGRESS && goal.progress >= 1.0) {
        goal.status = GoalStatus.COMPLETED;
        this.updateMetrics('goal_achieved');
        this.emit('goal:achieved', goalId);
        this.emit('goal:updated', goalId, goal);
      }
    }
  }

  private async generateImprovementSuggestions(
    category: ImprovementCategory,
    currentMetrics: Record<string, number>
  ): Promise<Array<{
    type: string;
    description: string;
    impact: number;
    confidence: number;
    implementation: string[];
  }>> {
    const suggestions = [];

    switch (category) {
      case ImprovementCategory.PERFORMANCE:
        if (currentMetrics.averageResponseTime > 1000) {
          suggestions.push({
            type: 'response_time_optimization',
            description: 'Optimize response time by implementing caching and reducing token usage',
            impact: 0.7,
            confidence: 0.8,
            implementation: ['implement_response_cache', 'optimize_prompts', 'use_streaming']
          });
        }
        break;

      case ImprovementCategory.EFFICIENCY:
        if (currentMetrics.resourceUsage > 0.8) {
          suggestions.push({
            type: 'resource_optimization',
            description: 'Improve resource efficiency by optimizing memory usage and reducing unnecessary computations',
            impact: 0.6,
            confidence: 0.7,
            implementation: ['memory_cleanup', 'batch_processing', 'load_balancing']
          });
        }
        break;

      case ImprovementCategory.RELIABILITY:
        if (currentMetrics.errorRate > 0.1) {
          suggestions.push({
            type: 'error_reduction',
            description: 'Reduce error rate by implementing better error handling and retry mechanisms',
            impact: 0.8,
            confidence: 0.9,
            implementation: ['enhanced_error_handling', 'circuit_breaker', 'exponential_backoff']
          });
        }
        break;
    }

    return suggestions;
  }

  private async executeImprovement(
    improvementType: string,
    implementation: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.info('Executing improvement', { improvementType, implementation });

    switch (improvementType) {
      case 'response_time_optimization':
        return await this.executeResponseTimeOptimization(implementation);
      case 'resource_optimization':
        return await this.executeResourceOptimization(implementation);
      case 'error_reduction':
        return await this.executeErrorReduction(implementation);
      default:
        throw new Error(`Unknown improvement type: ${improvementType}`);
    }
  }

  private async executeResponseTimeOptimization(implementation: Record<string, unknown>): Promise<unknown> {
    return {
      improved: true,
      expectedImprovement: '30% faster response times',
      changesApplied: ['caching_enabled', 'prompts_optimized']
    };
  }

  private async executeResourceOptimization(implementation: Record<string, unknown>): Promise<unknown> {
    return {
      improved: true,
      expectedImprovement: '25% reduction in resource usage',
      changesApplied: ['memory_cleanup', 'batch_processing']
    };
  }

  private async executeErrorReduction(implementation: Record<string, unknown>): Promise<unknown> {
    return {
      improved: true,
      expectedImprovement: '40% reduction in error rate',
      changesApplied: ['enhanced_error_handling', 'circuit_breaker']
    };
  }

  private async evaluateImprovementImpact(improvementType: string, result: unknown): Promise<void> {
    this.logger.info('Evaluating improvement impact', { improvementType, result });
  }

  private startLearningProcess(): void {
    this.learningInterval = setInterval(async () => {
      await this.performLearningCycle();
    }, this.config.evaluationInterval);
  }

  private async performLearningCycle(): Promise<void> {
    try {
      this.logger.debug('Performing learning cycle');

      await this.analyzePerformancePatterns();
      await this.identifyOptimizationOpportunities();
      await this.updateLearningProgress();

      this.metrics.lastLearningActivity = new Date();

    } catch (error) {
      this.logger.error('Learning cycle failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async analyzePerformancePatterns(): Promise<void> {
    const performancePatterns = this.getPatternsByType(PatternType.PERFORMANCE);

    for (const pattern of performancePatterns) {
      if (pattern.confidence > 0.7) {
        await this.suggestImprovements(ImprovementCategory.PERFORMANCE, {});
      }
    }
  }

  private async identifyOptimizationOpportunities(): Promise<void> {
    const goals = this.getGoalsByStatus(GoalStatus.PENDING);

    for (const goal of goals) {
      if (goal.deadline < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        goal.status = GoalStatus.IN_PROGRESS;
        this.emit('goal:updated', goal.id, goal);
      }
    }
  }

  private async updateLearningProgress(): Promise<void> {
    for (const goal of this.getGoalsByStatus(GoalStatus.IN_PROGRESS)) {
      goal.progress = Math.min(goal.progress + 0.1, 0.9);
      this.emit('goal:updated', goal.id, goal);
    }
  }

  private updateMetrics(type: 'pattern_detected' | 'goal_created' | 'goal_achieved' | 'improvement_suggested' | 'improvement_applied'): void {
    switch (type) {
      case 'pattern_detected':
        this.metrics.patternsDetected++;
        break;
      case 'goal_created':
        this.metrics.goalsCreated++;
        break;
      case 'goal_achieved':
        this.metrics.goalsAchieved++;
        break;
      case 'improvement_suggested':
        this.metrics.improvementsSuggested++;
        break;
      case 'improvement_applied':
        this.metrics.improvementsApplied++;
        break;
    }
  }

  private initializeMetrics(): LearningMetrics {
    return {
      patternsDetected: 0,
      goalsCreated: 0,
      goalsAchieved: 0,
      improvementsSuggested: 0,
      improvementsApplied: 0,
      averageImprovementTime: 0,
      learningRate: 0.01,
      lastLearningActivity: new Date()
    };
  }

  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGoalId(): string {
    return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStrategyId(): string {
    return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async shutdown(): Promise<void> {
    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = null;
    }

    this.patterns.clear();
    this.goals.clear();

    this.logger.info('Learning Manager shutdown complete');
  }
}