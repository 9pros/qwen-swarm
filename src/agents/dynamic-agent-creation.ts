import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/utils/logger';
import type {
  AgentConfig,
  Task,
  AgentStatus,
  PerformanceMetrics,
  AgentCapability
} from '@/types';
import type {
  AgentTemplate,
  SpecialtyAgentSystem
} from './specialty-agent-system';

export interface TaskRequirementAnalysis {
  complexity: 'low' | 'medium' | 'high' | 'enterprise';
  requiredCapabilities: string[];
  estimatedDuration: number;
  resourceRequirements: ResourceRequirements;
  priorityLevel: number;
  domain: string;
  dependencies: string[];
  constraints: TaskConstraints;
}

export interface ResourceRequirements {
  minConcurrency: number;
  maxConcurrency: number;
  memorySize: number;
  cpuIntensity: 'low' | 'medium' | 'high';
  networkBandwidth: 'low' | 'medium' | 'high';
  tokenBudget: number;
  specialHardware: string[];
}

export interface TaskConstraints {
  maxLatency: number;
  maxCost: number;
  complianceRequirements: string[];
  securityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  geographicRestrictions: string[];
  timeWindows: TimeWindow[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  timezone: string;
}

export interface AgentComposition {
  primaryAgent: AgentConfig;
  supportingAgents: AgentConfig[];
  coordinationStrategy: 'sequential' | 'parallel' | 'hierarchical' | 'adaptive';
  communicationPattern: 'broadcast' | 'point-to-point' | 'publish-subscribe' | 'request-reply';
  collaborationProtocol: CollaborationProtocol;
}

export interface CollaborationProtocol {
  messageFormat: string;
  syncStrategy: 'event-driven' | 'polling' | 'streaming';
  consensusMechanism: 'leader-election' | 'majority-vote' | 'consensus' | 'none';
  failureHandling: 'retry' | 'fallback' | 'circuit-breaker' | 'graceful-degradation';
}

export interface AutoScalingPolicy {
  minAgents: number;
  maxAgents: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  targetUtilization: number;
  predictionWindow: number;
  costConstraints: CostConstraints;
}

export interface CostConstraints {
  maxHourlyCost: number;
  maxDailyCost: number;
  costPerTask: number;
  budgetAlertThreshold: number;
  costOptimizationStrategy: 'performance' | 'cost' | 'balanced';
}

export interface AgentEvolution {
  currentGeneration: number;
  performanceHistory: PerformanceHistoryEntry[];
  adaptationStrategies: AdaptationStrategy[];
  evolutionTriggers: EvolutionTrigger[];
  geneticParameters: GeneticParameters;
}

export interface PerformanceHistoryEntry {
  timestamp: Date;
  taskType: string;
  performance: PerformanceMetrics;
  success: boolean;
  duration: number;
  cost: number;
  userFeedback?: number;
}

export interface AdaptationStrategy {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  modifications: AgentModification[];
  impact: {
    performance: number;
    cost: number;
    reliability: number;
  };
}

export interface AgentModification {
  type: 'parameter' | 'capability' | 'architecture' | 'resource';
  target: string;
  operation: 'increase' | 'decrease' | 'add' | 'remove' | 'modify';
  value: unknown;
  confidence: number;
}

export interface EvolutionTrigger {
  condition: string;
  threshold: number;
  measurementPeriod: number;
  consecutiveOccurrences: number;
}

export interface GeneticParameters {
  mutationRate: number;
  crossoverRate: number;
  selectionPressure: number;
  populationSize: number;
  eliteSize: number;
}

export interface DynamicAgentCreationEvents {
  'agent-composed': (composition: AgentComposition) => void;
  'agent-specialized': (agentId: string, specialization: string) => void;
  'pool-scaled': (agentType: string, fromCount: number, toCount: number) => void;
  'agent-evolved': (agentId: string, fromGeneration: number, toGeneration: number) => void;
  'task-analysis-completed': (taskId: string, analysis: TaskRequirementAnalysis) => void;
  'creation-failed': (taskId: string, error: Error) => void;
}

export class DynamicAgentCreation extends EventEmitter<DynamicAgentCreationEvents> {
  private specialtyAgentSystem: SpecialtyAgentSystem;
  private logger: Logger;
  private taskAnalyzer: TaskRequirementAnalyzer;
  private agentComposer: AgentComposer;
  private autoScaler: AutoScalingManager;
  private evolutionEngine: AgentEvolutionEngine;
  private activeCompositions: Map<string, AgentComposition>;
  private scalingPolicies: Map<string, AutoScalingPolicy>;

  constructor(specialtyAgentSystem: SpecialtyAgentSystem) {
    super();
    this.specialtyAgentSystem = specialtyAgentSystem;
    this.logger = new Logger().withContext({ component: 'DynamicAgentCreation' });
    this.taskAnalyzer = new TaskRequirementAnalyzer();
    this.agentComposer = new AgentComposer();
    this.autoScaler = new AutoScalingManager();
    this.evolutionEngine = new AgentEvolutionEngine();
    this.activeCompositions = new Map();
    this.scalingPolicies = new Map();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Dynamic Agent Creation System');

    await this.taskAnalyzer.initialize();
    await this.agentComposer.initialize(this.specialtyAgentSystem);
    await this.autoScaler.initialize();
    await this.evolutionEngine.initialize();

    // Set up default scaling policies
    this.setupDefaultScalingPolicies();

    this.logger.info('Dynamic Agent Creation System initialized');
  }

  public async createAgentForTask(task: Task): Promise<AgentComposition> {
    this.logger.info('Creating agent for task', { taskId: task.id, taskType: task.type });

    try {
      // Analyze task requirements
      const analysis = await this.taskAnalyzer.analyzeTask(task);
      this.emit('task-analysis-completed', task.id, analysis);

      // Compose optimal agent configuration
      const composition = await this.agentComposer.composeAgent(analysis, this.specialtyAgentSystem);

      // Store active composition
      this.activeCompositions.set(task.id, composition);

      // Configure auto-scaling if needed
      if (analysis.complexity !== 'low') {
        await this.configureAutoScaling(composition, analysis);
      }

      this.emit('agent-composed', composition);
      this.logger.info('Agent composition created successfully', {
        taskId: task.id,
        agentCount: composition.supportingAgents.length + 1,
        coordinationStrategy: composition.coordinationStrategy
      });

      return composition;

    } catch (error) {
      this.logger.error('Failed to create agent for task', error instanceof Error ? error : new Error(String(error)), { taskId: task.id });
      this.emit('creation-failed', task.id, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async specializeAgent(
    agentConfig: AgentConfig,
    specializationDomain: string,
    performanceData?: PerformanceMetrics
  ): Promise<AgentConfig> {
    this.logger.info('Specializing agent', { agentId: agentConfig.id, domain: specializationDomain });

    try {
      // Find or create specialization template
      const specializationTemplate = await this.findOrCreateSpecialization(
        specializationDomain,
        agentConfig,
        performanceData
      );

      // Apply specialization to agent
      const specializedAgent = await this.applySpecialization(agentConfig, specializationTemplate);

      this.emit('agent-specialized', agentConfig.id, specializationDomain);
      this.logger.info('Agent specialization completed', {
        agentId: agentConfig.id,
        domain: specializationDomain,
        newCapabilities: specializedAgent.capabilities.length
      });

      return specializedAgent;

    } catch (error) {
      this.logger.error('Failed to specialize agent', error instanceof Error ? error : new Error(String(error)), {
        agentId: agentConfig.id,
        domain: specializationDomain
      });
      throw error;
    }
  }

  private async findOrCreateSpecialization(
    domain: string,
    baseAgent: AgentConfig,
    performanceData?: PerformanceMetrics
  ): Promise<AgentTemplate> {
    // Try to find existing specialization template
    const existingTemplates = this.specialtyAgentSystem.getTemplatesByTag(domain);
    if (existingTemplates.length > 0) {
      return existingTemplates[0];
    }

    // Create new specialization template
    const specializationTemplate = await this.createSpecializationTemplate(domain, baseAgent, performanceData);

    // Register the new template
    await this.specialtyAgentSystem.importTemplate(
      JSON.stringify(specializationTemplate),
      'json'
    );

    return specializationTemplate;
  }

  private async createSpecializationTemplate(
    domain: string,
    baseAgent: AgentConfig,
    performanceData?: PerformanceMetrics
  ): Promise<AgentTemplate> {
    const baseTemplate = await this.specialtyAgentSystem.getTemplate(baseAgent.type);

    return {
      id: `${domain}-specialist`,
      name: `${domain} Specialist`,
      description: `Specialized agent for ${domain} domain tasks`,
      version: '1.0.0',
      type: 'specialist',
      role: {
        type: 'analytical',
        permissions: baseAgent.role.permissions,
        expertise: [...baseAgent.role.expertise, domain],
        priority: baseAgent.role.priority + 1
      },
      capabilities: await this.createSpecializedCapabilities(domain, baseAgent.capabilities, performanceData),
      provider: this.optimizeProviderForDomain(domain, baseAgent.provider),
      settings: this.optimizeSettingsForDomain(domain, baseAgent, performanceData),
      metadata: {
        specializationDomain: domain,
        baseTemplate: baseAgent.type,
        createdFrom: 'dynamic-creation',
        performanceBased: performanceData ? true : false
      },
      created: new Date(),
      updated: new Date(),
      author: 'Dynamic Agent Creation System',
      tags: [domain, 'specialist', 'auto-generated']
    };
  }

  private async createSpecializedCapabilities(
    domain: string,
    baseCapabilities: AgentCapability[],
    performanceData?: PerformanceMetrics
  ): Promise<AgentCapability[]> {
    const domainCapabilities = this.getDomainSpecificCapabilities(domain);
    const optimizedBaseCapabilities = this.optimizeBaseCapabilities(baseCapabilities, performanceData);

    return [...optimizedBaseCapabilities, ...domainCapabilities];
  }

  private getDomainSpecificCapabilities(domain: string): AgentCapability[] {
    const domainCapabilityMap: Record<string, AgentCapability[]> = {
      'data-analysis': [
        {
          id: 'statistical-analysis',
          name: 'Statistical Analysis',
          description: 'Advanced statistical analysis capabilities',
          enabled: true,
          configuration: { techniques: ['regression', 'clustering', 'classification'] }
        },
        {
          id: 'data-visualization',
          name: 'Data Visualization',
          description: 'Create charts and visual representations',
          enabled: true,
          configuration: { chartTypes: ['bar', 'line', 'scatter', 'heatmap'] }
        }
      ],
      'customer-service': [
        {
          id: 'sentiment-analysis',
          name: 'Sentiment Analysis',
          description: 'Analyze customer sentiment and emotions',
          enabled: true,
          configuration: { languages: ['en', 'es', 'fr'], granularity: 'sentence' }
        },
        {
          id: 'response-generation',
          name: 'Response Generation',
          description: 'Generate contextual customer responses',
          enabled: true,
          configuration: { tone: 'professional', maxLength: 500 }
        }
      ],
      'code-generation': [
        {
          id: 'code-analysis',
          name: 'Code Analysis',
          description: 'Analyze and review code quality',
          enabled: true,
          configuration: { languages: ['javascript', 'python', 'java'], metrics: ['complexity', 'maintainability'] }
        },
        {
          id: 'code-generation',
          name: 'Code Generation',
          description: 'Generate code based on specifications',
          enabled: true,
          configuration: { languages: ['javascript', 'python'], frameworks: ['react', 'express'] }
        }
      ]
    };

    return domainCapabilityMap[domain] || [];
  }

  private optimizeBaseCapabilities(
    capabilities: AgentCapability[],
    performanceData?: PerformanceMetrics
  ): AgentCapability[] {
    if (!performanceData) return capabilities;

    return capabilities.map(cap => {
      const optimized = { ...cap };

      // Optimize configuration based on performance data
      if (performanceData.successRate < 0.8) {
        // Reduce complexity for low-performing capabilities
        if (optimized.configuration.maxTokens) {
          optimized.configuration.maxTokens = Math.floor(
            (optimized.configuration.maxTokens as number) * 0.8
          );
        }
      }

      if (performanceData.averageResponseTime > 5000) {
        // Optimize for speed
        if (optimized.configuration.temperature) {
          optimized.configuration.temperature = Math.min(
            (optimized.configuration.temperature as number) * 0.9,
            0.1
          );
        }
      }

      return optimized;
    });
  }

  private optimizeProviderForDomain(domain: string, baseProvider: any): any {
    const domainOptimizations: Record<string, Partial<any>> = {
      'data-analysis': {
        temperature: 0.1,
        maxTokens: 8000,
        model: 'qwen-max'
      },
      'creative-writing': {
        temperature: 0.9,
        maxTokens: 4000,
        model: 'qwen-plus'
      },
      'customer-service': {
        temperature: 0.3,
        maxTokens: 2000,
        model: 'qwen-plus'
      },
      'code-generation': {
        temperature: 0.1,
        maxTokens: 6000,
        model: 'qwen-max'
      }
    };

    return {
      ...baseProvider,
      ...domainOptimizations[domain]
    };
  }

  private optimizeSettingsForDomain(
    domain: string,
    baseAgent: AgentConfig,
    performanceData?: PerformanceMetrics
  ): any {
    const baseSettings = {
      maxConcurrency: baseAgent.maxConcurrency,
      memorySize: baseAgent.memorySize,
      autoScale: baseAgent.autoScale,
      healthCheckInterval: baseAgent.healthCheckInterval
    };

    const domainSettings: Record<string, Partial<any>> = {
      'data-analysis': {
        maxConcurrency: 3,
        memorySize: 50000,
        healthCheckInterval: 20000
      },
      'customer-service': {
        maxConcurrency: 10,
        memorySize: 15000,
        healthCheckInterval: 15000
      },
      'code-generation': {
        maxConcurrency: 2,
        memorySize: 30000,
        healthCheckInterval: 25000
      }
    };

    return {
      ...baseSettings,
      ...domainSettings[domain]
    };
  }

  private async applySpecialization(
    agentConfig: AgentConfig,
    specializationTemplate: AgentTemplate
  ): Promise<AgentConfig> {
    const specializedAgent = await this.specialtyAgentSystem.createAgentFromTemplate(
      specializationTemplate.id,
      {
        id: agentConfig.id,
        name: `${agentConfig.name} (${specializationTemplate.name})`
      }
    );

    return specializedAgent;
  }

  private async configureAutoScaling(
    composition: AgentComposition,
    analysis: TaskRequirementAnalysis
  ): Promise<void> {
    const scalingPolicy = this.createScalingPolicy(analysis);

    this.autoScaler.configureScaling(composition.primaryAgent.id, scalingPolicy);
    this.scalingPolicies.set(composition.primaryAgent.id, scalingPolicy);

    // Configure scaling for supporting agents
    for (const agent of composition.supportingAgents) {
      const supportingPolicy = this.createSupportingScalingPolicy(agent, analysis);
      this.autoScaler.configureScaling(agent.id, supportingPolicy);
      this.scalingPolicies.set(agent.id, supportingPolicy);
    }
  }

  private createScalingPolicy(analysis: TaskRequirementAnalysis): AutoScalingPolicy {
    return {
      minAgents: 1,
      maxAgents: Math.max(3, Math.min(10, analysis.resourceRequirements.maxConcurrency)),
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.3,
      scaleUpCooldown: 60000,
      scaleDownCooldown: 300000,
      targetUtilization: 0.7,
      predictionWindow: 300000,
      costConstraints: {
        maxHourlyCost: analysis.complexity === 'enterprise' ? 100 : 50,
        maxDailyCost: analysis.complexity === 'enterprise' ? 1000 : 500,
        costPerTask: analysis.complexity === 'high' ? 5 : 1,
        budgetAlertThreshold: 0.8,
        costOptimizationStrategy: 'balanced'
      }
    };
  }

  private createSupportingScalingPolicy(
    agent: AgentConfig,
    analysis: TaskRequirementAnalysis
  ): AutoScalingPolicy {
    return {
      minAgents: 1,
      maxAgents: 3,
      scaleUpThreshold: 0.7,
      scaleDownThreshold: 0.2,
      scaleUpCooldown: 30000,
      scaleDownCooldown: 120000,
      targetUtilization: 0.6,
      predictionWindow: 180000,
      costConstraints: {
        maxHourlyCost: 25,
        maxDailyCost: 200,
        costPerTask: 0.5,
        budgetAlertThreshold: 0.8,
        costOptimizationStrategy: 'cost'
      }
    };
  }

  private setupDefaultScalingPolicies(): void {
    // Default policy for basic workers
    this.scalingPolicies.set('worker-default', {
      minAgents: 2,
      maxAgents: 20,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.3,
      scaleUpCooldown: 60000,
      scaleDownCooldown: 300000,
      targetUtilization: 0.7,
      predictionWindow: 300000,
      costConstraints: {
        maxHourlyCost: 20,
        maxDailyCost: 400,
        costPerTask: 0.5,
        budgetAlertThreshold: 0.8,
        costOptimizationStrategy: 'balanced'
      }
    });

    // Default policy for specialists
    this.scalingPolicies.set('specialist-default', {
      minAgents: 1,
      maxAgents: 5,
      scaleUpThreshold: 0.7,
      scaleDownThreshold: 0.2,
      scaleUpCooldown: 120000,
      scaleDownCooldown: 600000,
      targetUtilization: 0.6,
      predictionWindow: 600000,
      costConstraints: {
        maxHourlyCost: 50,
        maxDailyCost: 800,
        costPerTask: 2,
        budgetAlertThreshold: 0.8,
        costOptimizationStrategy: 'performance'
      }
    });
  }

  public async evolveAgent(
    agentId: string,
    performanceHistory: PerformanceHistoryEntry[]
  ): Promise<AgentConfig> {
    this.logger.info('Starting agent evolution', { agentId });

    try {
      const evolvedAgent = await this.evolutionEngine.evolveAgent(agentId, performanceHistory);

      this.emit('agent-evolved', agentId,
        performanceHistory[0]?.timestamp ?
          Math.floor((Date.now() - performanceHistory[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        (performanceHistory[0]?.timestamp ?
          Math.floor((Date.now() - performanceHistory[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)) : 0) + 1
      );

      return evolvedAgent;

    } catch (error) {
      this.logger.error('Agent evolution failed', error instanceof Error ? error : new Error(String(error)), { agentId });
      throw error;
    }
  }

  public getComposition(taskId: string): AgentComposition | undefined {
    return this.activeCompositions.get(taskId);
  }

  public getScalingPolicy(agentId: string): AutoScalingPolicy | undefined {
    return this.scalingPolicies.get(agentId);
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Dynamic Agent Creation System');

    this.activeCompositions.clear();
    this.scalingPolicies.clear();

    await this.autoScaler.shutdown();
    await this.evolutionEngine.shutdown();

    this.logger.info('Dynamic Agent Creation System shutdown complete');
  }
}

// Supporting classes would be implemented similarly...
class TaskRequirementAnalyzer {
  async initialize(): Promise<void> {}
  async analyzeTask(task: Task): Promise<TaskRequirementAnalysis> {
    // Implementation for task analysis
    return {} as TaskRequirementAnalysis;
  }
}

class AgentComposer {
  async initialize(specialtyAgentSystem: SpecialtyAgentSystem): Promise<void> {}
  async composeAgent(
    analysis: TaskRequirementAnalysis,
    specialtyAgentSystem: SpecialtyAgentSystem
  ): Promise<AgentComposition> {
    // Implementation for agent composition
    return {} as AgentComposition;
  }
}

class AutoScalingManager {
  async initialize(): Promise<void> {}
  configureScaling(agentId: string, policy: AutoScalingPolicy): void {}
  async shutdown(): Promise<void> {}
}

class AgentEvolutionEngine {
  async initialize(): Promise<void> {}
  async evolveAgent(agentId: string, history: PerformanceHistoryEntry[]): Promise<AgentConfig> {
    // Implementation for agent evolution
    return {} as AgentConfig;
  }
  async shutdown(): Promise<void> {}
}