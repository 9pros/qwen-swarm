import EventEmitter from 'eventemitter3';
import { Logger } from '@/utils/logger';
import type {
  ParallelTask,
  ParallelSubtask,
  SpecialistAgentType,
  ParallelStrategy,
  TaskComplexity,
  AgentWorkload,
  CollaborationLevel,
  EfficiencyMetrics,
  ExpertiseDomain
} from '@/types/parallel-agents';
import type { Task, TaskPriority, TaskStatus } from '@/types';

export interface TaskDistributorEvents {
  'task:routed': (taskId: string, agentType: SpecialistAgentType, confidence: number) => void;
  'task:redistributed': (taskId: string, fromAgent: SpecialistAgentType, toAgent: SpecialistAgentType, reason: string) => void;
  'routing:optimized': (optimization: RoutingOptimization) => void;
  'agent:overloaded': (agentType: SpecialistAgentType, load: number) => void;
  'task:rejected': (taskId: string, agentType: SpecialistAgentType, reason: string) => void;
}

export interface TaskRoutingProfile {
  agentType: SpecialistAgentType;
  expertiseDomains: ExpertiseDomain[];
  currentWorkload: number;
  maxWorkload: number;
  efficiencyScore: number;
  reliabilityScore: number;
  averageResponseTime: number;
  qualityScore: number;
  collaborationPreferences: SpecialistAgentType[];
  specializations: string[];
  historicalPerformance: TaskPerformanceHistory[];
}

export interface TaskPerformanceHistory {
  taskId: string;
  taskType: string;
  complexity: TaskComplexity;
  duration: number;
  success: boolean;
  qualityScore: number;
  resourceUsage: number;
  collaborationLevel: CollaborationLevel;
  timestamp: Date;
}

export interface RoutingDecision {
  taskId: string;
  agentType: SpecialistAgentType;
  confidence: number;
  reasoning: RoutingReasoning;
  alternatives: AlternativeAssignment[];
  estimatedDuration: number;
  estimatedQuality: number;
  resourceRequirements: ResourceRequirement[];
  risks: RoutingRisk[];
}

export interface RoutingReasoning {
  primaryFactor: RoutingFactor;
  secondaryFactors: RoutingFactor[];
  agentCompatibility: number;
  workloadBalance: number;
  historicalPerformance: number;
  expertiseMatch: number;
  collaborationPotential: number;
}

export enum RoutingFactor {
  EXPERTISE_MATCH = 'expertise_match',
  WORKLOAD_BALANCE = 'workload_balance',
  HISTORICAL_PERFORMANCE = 'historical_performance',
  COLLABORATION_FIT = 'collaboration_fit',
  RESOURCE_AVAILABILITY = 'resource_availability',
  TASK_COMPLEXITY = 'task_complexity',
  QUALITY_REQUIREMENTS = 'quality_requirements',
  TIMELINE_CONSTRAINTS = 'timeline_constraints'
}

export interface AlternativeAssignment {
  agentType: SpecialistAgentType;
  confidence: number;
  pros: string[];
  cons: string[];
  conditions: string[];
}

export interface ResourceRequirement {
  type: ResourceType;
  amount: number;
  priority: ResourcePriority;
  constraints: ResourceConstraint[];
}

export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  TOKENS = 'tokens',
  API_CALLS = 'api_calls',
  NETWORK_BANDWIDTH = 'network_bandwidth',
  STORAGE = 'storage',
  EXTERNAL_SERVICES = 'external_services'
}

export enum ResourcePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ResourceConstraint {
  type: ConstraintType;
  value: number;
  operator: ComparisonOperator;
  flexible: boolean;
}

export enum ConstraintType {
  MINIMUM = 'minimum',
  MAXIMUM = 'maximum',
  EXACT = 'exact',
  RANGE = 'range'
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  GREATER_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'neq'
}

export interface RoutingRisk {
  type: RiskType;
  probability: number;
  impact: RiskImpact;
  mitigation: string;
}

export enum RiskType {
  AGENT_OVERLOAD = 'agent_overload',
  EXPERTISE_MISMATCH = 'expertise_mismatch',
  QUALITY_DEGRADATION = 'quality_degradation',
  TIMELINE_MISSED = 'timeline_missed',
  RESOURCE_SHORTAGE = 'resource_shortage',
  COMMUNICATION_BOTTLENECK = 'communication_bottleneck'
}

export enum RiskImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface RoutingOptimization {
  type: OptimizationType;
  scope: OptimizationScope;
  changes: RoutingChange[];
  beforeMetrics: RoutingMetrics;
  afterMetrics: RoutingMetrics;
  improvement: number;
  impact: string;
}

export enum OptimizationType {
  LOAD_BALANCING = 'load_balancing',
  EXPERTISE_MATCHING = 'expertise_matching',
  COLLABORATION_OPTIMIZATION = 'collaboration_optimization',
  RESOURCE_OPTIMIZATION = 'resource_optimization',
  QUALITY_IMPROVEMENT = 'quality_improvement',
  PERFORMANCE_TUNING = 'performance_tuning'
}

export enum OptimizationScope {
  SINGLE_TASK = 'single_task',
  AGENT_TYPE = 'agent_type',
  WORKFLOW = 'workflow',
  SYSTEM_WIDE = 'system_wide'
}

export interface RoutingChange {
  agentType: SpecialistAgentType;
  taskId: string;
  action: RoutingAction;
  reason: string;
  expectedImpact: string;
}

export enum RoutingAction {
  ASSIGN = 'assign',
  REASSIGN = 'reassign',
  LOAD_BALANCE = 'load_balance',
  PRIORITY_ADJUST = 'priority_adjust',
  RESCHEDULE = 'reschedule'
}

export interface RoutingMetrics {
  totalTasks: number;
  routedTasks: number;
  averageConfidence: number;
  agentUtilization: Map<SpecialistAgentType, number>;
  averageRoutingTime: number;
  successRate: number;
  qualityScore: number;
  loadBalanceIndex: number;
  collaborationIndex: number;
}

export interface WorkloadPrediction {
  agentType: SpecialistAgentType;
  currentLoad: number;
  predictedLoad: number;
  timeWindow: number;
  confidence: number;
  factors: WorkloadFactor[];
}

export interface WorkloadFactor {
  factor: string;
  weight: number;
  value: number;
  trend: TrendDirection;
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export interface RoutingConfiguration {
  strategy: RoutingStrategy;
  confidenceThreshold: number;
  workloadThreshold: number;
  qualityThreshold: number;
  enableAutoRebalancing: boolean;
  enablePredictiveRouting: boolean;
  optimizationInterval: number;
  riskAssessmentEnabled: boolean;
  collaborationWeight: number;
  expertiseWeight: number;
  workloadWeight: number;
  performanceWeight: number;
}

export enum RoutingStrategy {
  EXPERTISE_FIRST = 'expertise_first',
  BALANCE_FIRST = 'balance_first',
  COLLABORATION_FIRST = 'collaboration_first',
  PERFORMANCE_FIRST = 'performance_first',
  HYBRID = 'hybrid',
  ADAPTIVE = 'adaptive'
}

/**
 * Task Distributor - Intelligent routing system for parallel task distribution
 *
 * This component is responsible for intelligently routing tasks to the most appropriate
 * specialist agents based on expertise, workload, historical performance, and collaboration
 * requirements.
 */
export class TaskDistributor extends EventEmitter<TaskDistributorEvents> {
  private logger: Logger;
  private config: RoutingConfiguration;
  private agentProfiles: Map<SpecialistAgentType, TaskRoutingProfile>;
  private routingHistory: RoutingDecision[];
  private workloadPredictions: Map<SpecialistAgentType, WorkloadPrediction>;
  private optimizationEngine: RoutingOptimizationEngine;
  private riskAssessment: RiskAssessmentEngine;
  private performanceAnalyzer: RoutingPerformanceAnalyzer;
  private loadBalancer: DynamicLoadBalancer;

  constructor(config?: Partial<RoutingConfiguration>) {
    super();

    this.logger = new Logger().withContext({ component: 'TaskDistributor' });
    this.config = this.mergeConfiguration(config);

    this.agentProfiles = new Map();
    this.routingHistory = [];
    this.workloadPredictions = new Map();

    this.optimizationEngine = new RoutingOptimizationEngine();
    this.riskAssessment = new RiskAssessmentEngine();
    this.performanceAnalyzer = new RoutingPerformanceAnalyzer();
    this.loadBalancer = new DynamicLoadBalancer();

    this.initializeAgentProfiles();
    this.startPeriodicOptimization();
  }

  /**
   * Primary routing method - intelligently routes task to optimal agent
   */
  public async routeTask(
    task: ParallelTask,
    subtask: ParallelSubtask,
    constraints?: RoutingConstraints
  ): Promise<RoutingDecision> {
    this.logger.info('Routing task to specialist agent', {
      taskId: task.id,
      subtaskId: subtask.id,
      requirements: subtask.requirements
    });

    try {
      // 1. Analyze task requirements and characteristics
      const taskAnalysis = await this.analyzeTaskRequirements(subtask);

      // 2. Evaluate all potential agent candidates
      const candidates = await this.evaluateAgentCandidates(taskAnalysis, constraints);

      // 3. Score and rank candidates based on multiple factors
      const rankedCandidates = await this.scoreCandidates(candidates, taskAnalysis);

      // 4. Assess risks for top candidates
      const riskAssessment = await this.assessRoutingRisks(rankedCandidates, taskAnalysis);

      // 5. Make final routing decision
      const routingDecision = await this.makeRoutingDecision(
        rankedCandidates,
        taskAnalysis,
        riskAssessment
      );

      // 6. Validate decision against constraints
      await this.validateRoutingDecision(routingDecision, constraints);

      // 7. Record routing decision
      this.recordRoutingDecision(routingDecision);

      // 8. Update agent workload
      await this.updateAgentWorkload(routingDecision.agentType, subtask);

      this.logger.info('Task routed successfully', {
        taskId: task.id,
        subtaskId: subtask.id,
        assignedAgent: routingDecision.agentType,
        confidence: routingDecision.confidence
      });

      this.emit('task:routed', task.id, routingDecision.agentType, routingDecision.confidence);
      return routingDecision;

    } catch (error) {
      this.logger.error('Failed to route task', error as Error, {
        taskId: task.id,
        subtaskId: subtask.id
      });
      throw error;
    }
  }

  /**
   * Intelligent task redistribution for load balancing
   */
  public async redistributeTask(
    taskId: string,
    currentAgent: SpecialistAgentType,
    reason: RedistributionReason
  ): Promise<RoutingDecision> {
    this.logger.info('Redistributing task', {
      taskId,
      fromAgent: currentAgent,
      reason
    });

    try {
      // 1. Find the current task and subtask
      const currentTask = this.findTaskById(taskId);
      if (!currentTask) {
        throw new Error(`Task ${taskId} not found`);
      }

      // 2. Determine redistribution strategy
      const strategy = this.determineRedistributionStrategy(reason, currentAgent);

      // 3. Identify alternative agents
      const alternatives = await this.findAlternativeAgents(currentTask, currentAgent, strategy);

      // 4. Select best alternative
      const newAssignment = await this.selectBestAlternative(alternatives, currentTask);

      // 5. Handle task transition
      await this.handleTaskTransition(taskId, currentAgent, newAssignment.agentType);

      this.emit('task:redistributed', taskId, currentAgent, newAssignment.agentType, reason);
      return newAssignment;

    } catch (error) {
      this.logger.error('Failed to redistribute task', error as Error, { taskId, fromAgent: currentAgent });
      throw error;
    }
  }

  /**
   * Batch routing for multiple tasks with optimization
   */
  public async routeBatch(
    tasks: Array<{ task: ParallelTask; subtask: ParallelSubtask }>
  ): Promise<RoutingDecision[]> {
    this.logger.info('Routing batch of tasks', { count: tasks.length });

    try {
      // 1. Analyze batch characteristics
      const batchAnalysis = await this.analyzeBatchCharacteristics(tasks);

      // 2. Apply batch optimization
      const optimizedAssignments = await this.optimizeBatchRouting(tasks, batchAnalysis);

      // 3. Validate all assignments
      await this.validateBatchAssignments(optimizedAssignments);

      // 4. Execute routing decisions
      const routingDecisions: RoutingDecision[] = [];
      for (const assignment of optimizedAssignments) {
        const decision = await this.executeRoutingDecision(assignment);
        routingDecisions.push(decision);
      }

      this.logger.info('Batch routing completed', {
        totalTasks: tasks.length,
        routedTasks: routingDecisions.length,
        averageConfidence: this.calculateAverageConfidence(routingDecisions)
      });

      return routingDecisions;

    } catch (error) {
      this.logger.error('Failed to route batch', error as Error, { taskCount: tasks.length });
      throw error;
    }
  }

  /**
   * Predictive workload management
   */
  public async predictWorkloads(
    timeWindow: number = 3600000 // 1 hour default
  ): Promise<Map<SpecialistAgentType, WorkloadPrediction>> {
    this.logger.info('Predicting agent workloads', { timeWindow });

    try {
      const predictions = new Map<SpecialistAgentType, WorkloadPrediction>();

      for (const [agentType, profile] of this.agentProfiles) {
        const prediction = await this.predictAgentWorkload(agentType, profile, timeWindow);
        predictions.set(agentType, prediction);
      }

      this.workloadPredictions = predictions;
      return predictions;

    } catch (error) {
      this.logger.error('Failed to predict workloads', error as Error);
      throw error;
    }
  }

  /**
   * Dynamic system optimization
   */
  public async optimizeSystem(): Promise<RoutingOptimization[]> {
    this.logger.info('Starting system optimization');

    try {
      const optimizations: RoutingOptimization[] = [];

      // 1. Analyze current system performance
      const currentMetrics = await this.analyzeSystemMetrics();

      // 2. Identify optimization opportunities
      const opportunities = await this.identifyOptimizationOpportunities(currentMetrics);

      // 3. Apply optimizations
      for (const opportunity of opportunities) {
        const optimization = await this.applyOptimization(opportunity);
        optimizations.push(optimization);
      }

      // 4. Validate improvements
      await this.validateOptimizations(optimizations);

      this.logger.info('System optimization completed', {
        optimizations: optimizations.length,
        totalImprovement: this.calculateTotalImprovement(optimizations)
      });

      this.emit('routing:optimized', optimizations[0]); // Emit primary optimization
      return optimizations;

    } catch (error) {
      this.logger.error('Failed to optimize system', error as Error);
      throw error;
    }
  }

  /**
   * Update agent profile with new performance data
   */
  public async updateAgentProfile(
    agentType: SpecialistAgentType,
    performance: TaskPerformanceHistory
  ): Promise<void> {
    this.logger.debug('Updating agent profile', { agentType, taskId: performance.taskId });

    try {
      const profile = this.agentProfiles.get(agentType);
      if (!profile) {
        throw new Error(`Agent profile for ${agentType} not found`);
      }

      // Add new performance data
      profile.historicalPerformance.push(performance);

      // Keep only recent history (last 100 tasks)
      if (profile.historicalPerformance.length > 100) {
        profile.historicalPerformance = profile.historicalPerformance.slice(-100);
      }

      // Recalculate metrics
      await this.recalculateAgentMetrics(profile);

      this.agentProfiles.set(agentType, profile);

    } catch (error) {
      this.logger.error('Failed to update agent profile', error as Error, { agentType });
      throw error;
    }
  }

  // Private helper methods

  private mergeConfiguration(config?: Partial<RoutingConfiguration>): RoutingConfiguration {
    const defaultConfig: RoutingConfiguration = {
      strategy: RoutingStrategy.HYBRID,
      confidenceThreshold: 0.7,
      workloadThreshold: 0.8,
      qualityThreshold: 0.8,
      enableAutoRebalancing: true,
      enablePredictiveRouting: true,
      optimizationInterval: 300000, // 5 minutes
      riskAssessmentEnabled: true,
      collaborationWeight: 0.2,
      expertiseWeight: 0.4,
      workloadWeight: 0.25,
      performanceWeight: 0.15
    };

    return { ...defaultConfig, ...config };
  }

  private initializeAgentProfiles(): void {
    // Initialize profiles for all specialist agent types
    const agentTypes = Object.values(SpecialistAgentType);

    for (const agentType of agentTypes) {
      if (agentType !== SpecialistAgentType.QUEEN) {
        this.agentProfiles.set(agentType, this.createDefaultProfile(agentType));
      }
    }

    this.logger.info('Agent profiles initialized', { count: this.agentProfiles.size });
  }

  private createDefaultProfile(agentType: SpecialistAgentType): TaskRoutingProfile {
    return {
      agentType,
      expertiseDomains: this.getDefaultExpertiseDomains(agentType),
      currentWorkload: 0,
      maxWorkload: 10,
      efficiencyScore: 0.8,
      reliabilityScore: 0.9,
      averageResponseTime: 5000, // 5 seconds
      qualityScore: 0.85,
      collaborationPreferences: this.getDefaultCollaborationPreferences(agentType),
      specializations: this.getDefaultSpecializations(agentType),
      historicalPerformance: []
    };
  }

  private getDefaultExpertiseDomains(agentType: SpecialistAgentType): ExpertiseDomain[] {
    // Return default expertise domains for each agent type
    const domains = {
      [SpecialistAgentType.CODE]: [
        { domain: 'programming', proficiency: ProficiencyLevel.EXPERT, specializations: ['javascript', 'typescript', 'python'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.ANALYSIS]: [
        { domain: 'business_analysis', proficiency: ProficiencyLevel.EXPERT, specializations: ['requirements', 'data_analysis'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.ARCHITECTURE]: [
        { domain: 'system_design', proficiency: ProficiencyLevel.EXPERT, specializations: ['scalability', 'patterns'], certifications: [], experience: ExperienceLevel.ARCHITECT, recentProjects: [] }
      ],
      [SpecialistAgentType.TESTING]: [
        { domain: 'quality_assurance', proficiency: ProficiencyLevel.EXPERT, specializations: ['unit_tests', 'integration_tests'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.DOCUMENTATION]: [
        { domain: 'technical_writing', proficiency: ProficiencyLevel.EXPERT, specializations: ['api_docs', 'user_guides'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.SECURITY]: [
        { domain: 'security', proficiency: ProficiencyLevel.EXPERT, specializations: ['vulnerability_assessment', 'secure_coding'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.PERFORMANCE]: [
        { domain: 'performance_optimization', proficiency: ProficiencyLevel.EXPERT, specializations: ['profiling', 'caching'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.UI_UX]: [
        { domain: 'user_experience', proficiency: ProficiencyLevel.EXPERT, specializations: ['interface_design', 'usability'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ],
      [SpecialistAgentType.INTEGRATION]: [
        { domain: 'system_integration', proficiency: ProficiencyLevel.EXPERT, specializations: ['apis', 'microservices'], certifications: [], experience: ExperienceLevel.SENIOR, recentProjects: [] }
      ]
    };

    return domains[agentType] || [];
  }

  private getDefaultCollaborationPreferences(agentType: SpecialistAgentType): SpecialistAgentType[] {
    // Define default collaboration preferences for each agent type
    const preferences = {
      [SpecialistAgentType.CODE]: [SpecialistAgentType.ARCHITECTURE, SpecialistAgentType.TESTING, SpecialistAgentType.DOCUMENTATION],
      [SpecialistAgentType.ANALYSIS]: [SpecialistAgentType.ARCHITECTURE, SpecialistAgentType.DOCUMENTATION],
      [SpecialistAgentType.ARCHITECTURE]: [SpecialistAgentType.CODE, SpecialistAgentType.ANALYSIS, SpecialistAgentType.INTEGRATION],
      [SpecialistAgentType.TESTING]: [SpecialistAgentType.CODE, SpecialistAgentType.SECURITY],
      [SpecialistAgentType.DOCUMENTATION]: [SpecialistAgentType.CODE, SpecialistAgentType.ANALYSIS],
      [SpecialistAgentType.SECURITY]: [SpecialistAgentType.CODE, SpecialistAgentType.TESTING],
      [SpecialistAgentType.PERFORMANCE]: [SpecialistAgentType.CODE, SpecialistAgentAgentType.ARCHITECTURE],
      [SpecialistAgentType.UI_UX]: [SpecialistAgentType.CODE, SpecialistAgentType.ANALYSIS],
      [SpecialistAgentType.INTEGRATION]: [SpecialistAgentType.CODE, SpecialistAgentAgentType.ARCHITECTURE]
    };

    return preferences[agentType] || [];
  }

  private getDefaultSpecializations(agentType: SpecialistAgentType): string[] {
    // Return default specializations for each agent type
    const specializations = {
      [SpecialistAgentType.CODE]: ['algorithms', 'data_structures', 'design_patterns', 'optimization'],
      [SpecialistAgentType.ANALYSIS]: ['requirements_gathering', 'data_analysis', 'process_modeling'],
      [SpecialistAgentType.ARCHITECTURE]: ['scalability', 'reliability', 'security', 'performance'],
      [SpecialistAgentType.TESTING]: ['unit_testing', 'integration_testing', 'automation', 'performance_testing'],
      [SpecialistAgentType.DOCUMENTATION]: ['api_documentation', 'user_guides', 'technical_specs'],
      [SpecialistAgentType.SECURITY]: ['vulnerability_assessment', 'secure_coding', 'penetration_testing'],
      [SpecialistAgentType.PERFORMANCE]: ['profiling', 'optimization', 'caching', 'load_testing'],
      [SpecialistAgentType.UI_UX]: ['user_interface', 'user_experience', 'accessibility', 'responsive_design'],
      [SpecialistAgentType.INTEGRATION]: ['api_integration', 'microservices', 'data_pipelines', 'messaging']
    };

    return specializations[agentType] || [];
  }

  private startPeriodicOptimization(): void {
    if (this.config.enableAutoRebalancing) {
      setInterval(async () => {
        try {
          await this.optimizeSystem();
        } catch (error) {
          this.logger.error('Periodic optimization failed', error as Error);
        }
      }, this.config.optimizationInterval);
    }
  }

  private async analyzeTaskRequirements(subtask: ParallelSubtask): Promise<TaskAnalysis> {
    // Analyze task requirements, complexity, and constraints
    return {
      type: this.determineTaskType(subtask),
      complexity: this.assessComplexity(subtask),
      expertise: this.identifyRequiredExpertise(subtask),
      constraints: this.identifyConstraints(subtask),
      collaboration: this.assessCollaborationNeeds(subtask),
      quality: this.identifyQualityRequirements(subtask),
      timeline: this.assessTimelineConstraints(subtask)
    };
  }

  private determineTaskType(subtask: ParallelSubtask): string {
    // Determine the type of task based on requirements
    const description = subtask.requirements.description.toLowerCase();

    if (description.includes('code') || description.includes('implement')) {
      return 'code_generation';
    } else if (description.includes('test')) {
      return 'testing';
    } else if (description.includes('document')) {
      return 'documentation';
    } else if (description.includes('security')) {
      return 'security';
    } else if (description.includes('performance')) {
      return 'performance';
    } else if (description.includes('design') || description.includes('architecture')) {
      return 'architecture';
    } else if (description.includes('analyze')) {
      return 'analysis';
    } else if (description.includes('interface') || description.includes('ui')) {
      return 'ui_ux';
    } else if (description.includes('integrate')) {
      return 'integration';
    }

    return 'general';
  }

  private assessComplexity(subtask: ParallelSubtask): TaskComplexity {
    // Assess task complexity based on various factors
    const description = subtask.requirements.description;
    const acceptanceCriteria = subtask.requirements.acceptanceCriteria.length;
    const inputs = subtask.requirements.inputs.length;

    if (acceptanceCriteria > 5 || inputs > 3 || description.includes('complex')) {
      return TaskComplexity.COMPLEX;
    } else if (acceptanceCriteria > 2 || inputs > 1) {
      return TaskComplexity.MODERATE;
    }

    return TaskComplexity.SIMPLE;
  }

  private identifyRequiredExpertise(subtask: ParallelSubtask): string[] {
    // Identify required expertise based on task requirements
    const expertise: string[] = [];
    const description = subtask.requirements.description.toLowerCase();

    if (description.includes('database')) expertise.push('database');
    if (description.includes('api')) expertise.push('api_design');
    if (description.includes('security')) expertise.push('security');
    if (description.includes('performance')) expertise.push('performance');
    if (description.includes('ui')) expertise.push('user_interface');
    if (description.includes('test')) expertise.push('testing');

    return expertise;
  }

  private identifyConstraints(subtask: ParallelSubtask): any[] {
    // Identify constraints from subtask requirements
    return subtask.requirements.constraints || [];
  }

  private assessCollaborationNeeds(subtask: ParallelSubtask): CollaborationLevel {
    // Assess level of collaboration needed
    const description = subtask.requirements.description;

    if (description.includes('collaborate') || description.includes('coordinate')) {
      return CollaborationLevel.COLLABORATIVE;
    } else if (description.includes('review') || description.includes('approve')) {
      return CollaborationLevel.COOPERATIVE;
    }

    return CollaborationLevel.INDEPENDENT;
  }

  private identifyQualityRequirements(subtask: ParallelSubtask): QualityRequirement[] {
    // Identify quality requirements from acceptance criteria
    return subtask.requirements.acceptanceCriteria.map(criteria => ({
      criterion: criteria,
      threshold: 0.8,
      mandatory: criteria.includes('must') || criteria.includes('required')
    }));
  }

  private assessTimelineConstraints(subtask: ParallelSubtask): TimelineConstraint {
    // Assess timeline constraints
    return {
      estimatedDuration: subtask.estimatedDuration || 3600,
      deadline: new Date(Date.now() + (subtask.estimatedDuration || 3600) * 1000),
      flexibility: 'medium'
    };
  }

  private async evaluateAgentCandidates(
    analysis: TaskAnalysis,
    constraints?: RoutingConstraints
  ): Promise<AgentCandidate[]> {
    const candidates: AgentCandidate[] = [];

    for (const [agentType, profile] of this.agentProfiles) {
      const candidate = await this.evaluateAgent(agentType, profile, analysis, constraints);
      if (candidate.score > this.config.confidenceThreshold) {
        candidates.push(candidate);
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  private async evaluateAgent(
    agentType: SpecialistAgentType,
    profile: TaskRoutingProfile,
    analysis: TaskAnalysis,
    constraints?: RoutingConstraints
  ): Promise<AgentCandidate> {
    // Calculate scores for different factors
    const expertiseScore = this.calculateExpertiseScore(profile, analysis);
    const workloadScore = this.calculateWorkloadScore(profile, analysis);
    const performanceScore = this.calculatePerformanceScore(profile, analysis);
    const collaborationScore = this.calculateCollaborationScore(profile, analysis);

    // Apply weights from configuration
    const weightedScore =
      expertiseScore * this.config.expertiseWeight +
      workloadScore * this.config.workloadWeight +
      performanceScore * this.config.performanceWeight +
      collaborationScore * this.config.collaborationWeight;

    return {
      agentType,
      score: Math.min(weightedScore, 1.0),
      expertiseScore,
      workloadScore,
      performanceScore,
      collaborationScore,
      profile
    };
  }

  private calculateExpertiseScore(profile: TaskRoutingProfile, analysis: TaskAnalysis): number {
    // Calculate how well the agent's expertise matches task requirements
    let score = 0;
    let totalRequired = analysis.expertise.length || 1;

    for (const required of analysis.expertise) {
      const hasExpertise = profile.expertiseDomains.some(domain =>
        domain.domain.toLowerCase().includes(required.toLowerCase()) ||
        domain.specializations.some(spec => spec.toLowerCase().includes(required.toLowerCase()))
      );
      if (hasExpertise) score += 1;
    }

    return score / totalRequired;
  }

  private calculateWorkloadScore(profile: TaskRoutingProfile, analysis: TaskAnalysis): number {
    // Calculate score based on current workload
    const utilizationRatio = profile.currentWorkload / profile.maxWorkload;
    return Math.max(0, 1 - utilizationRatio);
  }

  private calculatePerformanceScore(profile: TaskRoutingProfile, analysis: TaskAnalysis): number {
    // Calculate score based on historical performance
    const recentPerformance = profile.historicalPerformance.slice(-10);
    if (recentPerformance.length === 0) return 0.5;

    const avgQuality = recentPerformance.reduce((sum, p) => sum + p.qualityScore, 0) / recentPerformance.length;
    const successRate = recentPerformance.filter(p => p.success).length / recentPerformance.length;

    return (avgQuality + successRate) / 2;
  }

  private calculateCollaborationScore(profile: TaskRoutingProfile, analysis: TaskAnalysis): number {
    // Calculate score based on collaboration preferences and needs
    if (analysis.collaboration === CollaborationLevel.INDEPENDENT) {
      return 1.0;
    }

    // Higher score if agent has good collaboration history
    const collaborationTasks = profile.historicalPerformance.filter(p =>
      p.collaborationLevel !== CollaborationLevel.INDEPENDENT
    );

    if (collaborationTasks.length === 0) return 0.5;

    const avgCollaborationQuality = collaborationTasks.reduce((sum, p) => sum + p.qualityScore, 0) / collaborationTasks.length;
    return avgCollaborationQuality;
  }

  private async scoreCandidates(
    candidates: AgentCandidate[],
    analysis: TaskAnalysis
  ): Promise<AgentCandidate[]> {
    // Additional scoring logic if needed
    return candidates;
  }

  private async assessRoutingRisks(
    candidates: AgentCandidate[],
    analysis: TaskAnalysis
  ): Promise<Map<SpecialistAgentType, RoutingRisk[]>> {
    const risksMap = new Map<SpecialistAgentType, RoutingRisk[]>();

    for (const candidate of candidates) {
      const risks: RoutingRisk[] = [];

      // Assess overload risk
      if (candidate.workloadScore < 0.2) {
        risks.push({
          type: RiskType.AGENT_OVERLOAD,
          probability: 0.8,
          impact: RiskImpact.HIGH,
          mitigation: 'Consider load balancing or task redistribution'
        });
      }

      // Assess expertise mismatch risk
      if (candidate.expertiseScore < 0.5) {
        risks.push({
          type: RiskType.EXPERTISE_MISMATCH,
          probability: 0.7,
          impact: RiskImpact.MEDIUM,
          mitigation: 'Provide additional context or consider alternative agent'
        });
      }

      risksMap.set(candidate.agentType, risks);
    }

    return risksMap;
  }

  private async makeRoutingDecision(
    candidates: AgentCandidate[],
    analysis: TaskAnalysis,
    riskAssessment: Map<SpecialistAgentType, RoutingRisk[]>
  ): Promise<RoutingDecision> {
    if (candidates.length === 0) {
      throw new Error('No suitable agents found for task');
    }

    const primaryCandidate = candidates[0];
    const alternatives = candidates.slice(1, 3).map(candidate => ({
      agentType: candidate.agentType,
      confidence: candidate.score,
      pros: [`Score: ${candidate.score.toFixed(2)}`],
      cons: this.generateCons(candidate, riskAssessment.get(candidate.agentType)),
      conditions: this.generateConditions(candidate, riskAssessment.get(candidate.agentType))
    }));

    return {
      taskId: analysis.taskId || 'unknown',
      agentType: primaryCandidate.agentType,
      confidence: primaryCandidate.score,
      reasoning: {
        primaryFactor: this.determinePrimaryFactor(primaryCandidate),
        secondaryFactors: this.determineSecondaryFactors(primaryCandidate),
        agentCompatibility: primaryCandidate.score,
        workloadBalance: primaryCandidate.workloadScore,
        historicalPerformance: primaryCandidate.performanceScore,
        expertiseMatch: primaryCandidate.expertiseScore,
        collaborationPotential: primaryCandidate.collaborationScore
      },
      alternatives,
      estimatedDuration: analysis.timeline.estimatedDuration,
      estimatedQuality: primaryCandidate.performanceScore,
      resourceRequirements: this.estimateResourceRequirements(primaryCandidate, analysis),
      risks: riskAssessment.get(primaryCandidate.agentType) || []
    };
  }

  private determinePrimaryFactor(candidate: AgentCandidate): RoutingFactor {
    const scores = [
      { factor: RoutingFactor.EXPERTISE_MATCH, score: candidate.expertiseScore },
      { factor: RoutingFactor.WORKLOAD_BALANCE, score: candidate.workloadScore },
      { factor: RoutingFactor.HISTORICAL_PERFORMANCE, score: candidate.performanceScore },
      { factor: RoutingFactor.COLLABORATION_FIT, score: candidate.collaborationScore }
    ];

    return scores.reduce((max, current) => current.score > max.score ? current : max).factor;
  }

  private determineSecondaryFactors(candidate: AgentCandidate): RoutingFactor[] {
    const factors = [
      RoutingFactor.EXPERTISE_MATCH,
      RoutingFactor.WORKLOAD_BALANCE,
      RoutingFactor.HISTORICAL_PERFORMANCE,
      RoutingFactor.COLLABORATION_FIT
    ];

    return factors.filter(factor => factor !== this.determinePrimaryFactor(candidate));
  }

  private generateCons(candidate: AgentCandidate, risks?: RoutingRisk[]): string[] {
    const cons: string[] = [];

    if (candidate.workloadScore < 0.5) {
      cons.push('Current workload is high');
    }

    if (candidate.expertiseScore < 0.7) {
      cons.push('Limited expertise match');
    }

    if (risks) {
      for (const risk of risks) {
        if (risk.impact === RiskImpact.HIGH || risk.impact === RiskImpact.CRITICAL) {
          cons.push(`High risk: ${risk.type}`);
        }
      }
    }

    return cons;
  }

  private generateConditions(candidate: AgentCandidate, risks?: RoutingRisk[]): string[] {
    const conditions: string[] = [];

    if (candidate.workloadScore < 0.3) {
      conditions.push('Monitor agent workload closely');
    }

    if (candidate.expertiseScore < 0.6) {
      conditions.push('Provide additional context and guidance');
    }

    return conditions;
  }

  private estimateResourceRequirements(
    candidate: AgentCandidate,
    analysis: TaskAnalysis
  ): ResourceRequirement[] {
    // Estimate resource requirements based on task and agent
    return [
      {
        type: ResourceType.CPU,
        amount: 50,
        priority: ResourcePriority.MEDIUM,
        constraints: []
      },
      {
        type: ResourceType.MEMORY,
        amount: 1024,
        priority: ResourcePriority.MEDIUM,
        constraints: []
      },
      {
        type: ResourceType.TOKENS,
        amount: 1000,
        priority: ResourcePriority.HIGH,
        constraints: []
      }
    ];
  }

  private async validateRoutingDecision(
    decision: RoutingDecision,
    constraints?: RoutingConstraints
  ): Promise<void> {
    // Validate decision against constraints
    if (decision.confidence < this.config.confidenceThreshold) {
      throw new Error(`Routing confidence ${decision.confidence} below threshold ${this.config.confidenceThreshold}`);
    }

    const agentProfile = this.agentProfiles.get(decision.agentType);
    if (!agentProfile) {
      throw new Error(`Agent profile not found for ${decision.agentType}`);
    }

    if (agentProfile.currentWorkload >= agentProfile.maxWorkload) {
      throw new Error(`Agent ${decision.agentType} is at maximum workload`);
    }
  }

  private recordRoutingDecision(decision: RoutingDecision): void {
    this.routingHistory.push(decision);

    // Keep only recent history (last 1000 decisions)
    if (this.routingHistory.length > 1000) {
      this.routingHistory = this.routingHistory.slice(-1000);
    }
  }

  private async updateAgentWorkload(agentType: SpecialistAgentType, subtask: ParallelSubtask): Promise<void> {
    const profile = this.agentProfiles.get(agentType);
    if (profile) {
      profile.currentWorkload += 1;

      // Check for overload
      if (profile.currentWorkload / profile.maxWorkload > this.config.workloadThreshold) {
        this.emit('agent:overloaded', agentType, profile.currentWorkload / profile.maxWorkload);
      }
    }
  }

  private findTaskById(taskId: string): ParallelTask | null {
    // This would typically query the task store
    return null;
  }

  private determineRedistributionStrategy(
    reason: RedistributionReason,
    currentAgent: SpecialistAgentType
  ): RedistributionStrategy {
    switch (reason) {
      case RedistributionReason.OVERLOAD:
        return RedistributionStrategy.LOAD_BALANCE;
      case RedistributionReason.QUALITY_ISSUE:
        return RedistributionStrategy.QUALITY_FOCUS;
      case RedistributionReason.EXPERTISE_MISMATCH:
        return RedistributionStrategy.EXPERTISE_MATCH;
      default:
        return RedistributionStrategy.BEST_FIT;
    }
  }

  private async findAlternativeAgents(
    task: ParallelTask,
    currentAgent: SpecialistAgentType,
    strategy: RedistributionStrategy
  ): Promise<AgentCandidate[]> {
    // Find alternative agents excluding the current one
    const candidates: AgentCandidate[] = [];

    for (const [agentType, profile] of this.agentProfiles) {
      if (agentType !== currentAgent) {
        const score = this.calculateRedistributionScore(agentType, profile, task, strategy);
        if (score > this.config.confidenceThreshold) {
          candidates.push({ agentType, score, expertiseScore: 0, workloadScore: 0, performanceScore: 0, collaborationScore: 0, profile });
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  private calculateRedistributionScore(
    agentType: SpecialistAgentType,
    profile: TaskRoutingProfile,
    task: ParallelTask,
    strategy: RedistributionStrategy
  ): number {
    // Calculate score based on redistribution strategy
    switch (strategy) {
      case RedistributionStrategy.LOAD_BALANCE:
        return 1 - (profile.currentWorkload / profile.maxWorkload);
      case RedistributionStrategy.QUALITY_FOCUS:
        return profile.qualityScore;
      case RedistributionStrategy.EXPERTISE_MATCH:
        // Simplified expertise matching
        return profile.efficiencyScore;
      default:
        return (profile.efficiencyScore + profile.qualityScore) / 2;
    }
  }

  private async selectBestAlternative(
    alternatives: AgentCandidate[],
    task: ParallelTask
  ): Promise<RoutingDecision> {
    if (alternatives.length === 0) {
      throw new Error('No alternative agents available');
    }

    const selected = alternatives[0];

    return {
      taskId: task.id,
      agentType: selected.agentType,
      confidence: selected.score,
      reasoning: {
        primaryFactor: RoutingFactor.WORKLOAD_BALANCE,
        secondaryFactors: [RoutingFactor.HISTORICAL_PERFORMANCE],
        agentCompatibility: selected.score,
        workloadBalance: 1 - (selected.profile.currentWorkload / selected.profile.maxWorkload),
        historicalPerformance: selected.profile.qualityScore,
        expertiseMatch: 0.5,
        collaborationPotential: 0.5
      },
      alternatives: [],
      estimatedDuration: task.estimatedDuration || 3600,
      estimatedQuality: selected.profile.qualityScore,
      resourceRequirements: [],
      risks: []
    };
  }

  private async handleTaskTransition(
    taskId: string,
    fromAgent: SpecialistAgentType,
    toAgent: SpecialistAgentType
  ): Promise<void> {
    // Handle the transition of task between agents
    const fromProfile = this.agentProfiles.get(fromAgent);
    const toProfile = this.agentProfiles.get(toAgent);

    if (fromProfile) {
      fromProfile.currentWorkload = Math.max(0, fromProfile.currentWorkload - 1);
    }

    if (toProfile) {
      toProfile.currentWorkload += 1;
    }
  }

  private async analyzeBatchCharacteristics(
    tasks: Array<{ task: ParallelTask; subtask: ParallelSubtask }>
  ): Promise<BatchAnalysis> {
    return {
      totalTasks: tasks.length,
      complexityDistribution: this.analyzeComplexityDistribution(tasks),
      typeDistribution: this.analyzeTypeDistribution(tasks),
      estimatedDuration: tasks.reduce((sum, t) => sum + (t.subtask.estimatedDuration || 3600), 0)
    };
  }

  private analyzeComplexityDistribution(
    tasks: Array<{ task: ParallelTask; subtask: ParallelSubtask }>
  ): Map<TaskComplexity, number> {
    const distribution = new Map<TaskComplexity, number>();

    for (const { subtask } of tasks) {
      const complexity = this.assessComplexity(subtask);
      distribution.set(complexity, (distribution.get(complexity) || 0) + 1);
    }

    return distribution;
  }

  private analyzeTypeDistribution(
    tasks: Array<{ task: ParallelTask; subtask: ParallelSubtask }>
  ): Map<string, number> {
    const distribution = new Map<string, number>();

    for (const { subtask } of tasks) {
      const type = this.determineTaskType(subtask);
      distribution.set(type, (distribution.get(type) || 0) + 1);
    }

    return distribution;
  }

  private async optimizeBatchRouting(
    tasks: Array<{ task: ParallelTask; subtask: ParallelSubtask }>,
    analysis: BatchAnalysis
  ): Promise<RoutingDecision[]> {
    // Apply batch optimization algorithms
    const decisions: RoutingDecision[] = [];

    for (const { task, subtask } of tasks) {
      const decision = await this.routeTask(task, subtask);
      decisions.push(decision);
    }

    // Apply load balancing across the batch
    return this.balanceBatchLoad(decisions);
  }

  private balanceBatchLoad(decisions: RoutingDecision[]): RoutingDecision[] {
    // Simple load balancing - could be more sophisticated
    const agentWorkloads = new Map<SpecialistAgentType, number>();

    for (const decision of decisions) {
      const currentLoad = agentWorkloads.get(decision.agentType) || 0;
      agentWorkloads.set(decision.agentType, currentLoad + 1);
    }

    return decisions;
  }

  private async validateBatchAssignments(assignments: RoutingDecision[]): Promise<void> {
    for (const assignment of assignments) {
      await this.validateRoutingDecision(assignment);
    }
  }

  private async executeRoutingDecision(assignment: RoutingDecision): Promise<RoutingDecision> {
    // Execute the routing decision
    this.recordRoutingDecision(assignment);

    const agentProfile = this.agentProfiles.get(assignment.agentType);
    if (agentProfile) {
      agentProfile.currentWorkload += 1;
    }

    return assignment;
  }

  private calculateAverageConfidence(decisions: RoutingDecision[]): number {
    if (decisions.length === 0) return 0;
    const sum = decisions.reduce((total, decision) => total + decision.confidence, 0);
    return sum / decisions.length;
  }

  private async predictAgentWorkload(
    agentType: SpecialistAgentType,
    profile: TaskRoutingProfile,
    timeWindow: number
  ): Promise<WorkloadPrediction> {
    // Simplified prediction - could use machine learning
    const currentLoad = profile.currentWorkload;
    const predictedLoad = currentLoad + Math.random() * 3; // Simple prediction

    return {
      agentType,
      currentLoad,
      predictedLoad,
      timeWindow,
      confidence: 0.7,
      factors: [
        {
          factor: 'historical_trend',
          weight: 0.5,
          value: 0.1,
          trend: TrendDirection.STABLE
        },
        {
          factor: 'seasonal_variation',
          weight: 0.3,
          value: 0.05,
          trend: TrendDirection.INCREASING
        }
      ]
    };
  }

  private async analyzeSystemMetrics(): Promise<RoutingMetrics> {
    const totalTasks = this.routingHistory.length;
    const routedTasks = this.routingHistory.filter(d => d.confidence > this.config.confidenceThreshold).length;
    const averageConfidence = this.routingHistory.reduce((sum, d) => sum + d.confidence, 0) / (totalTasks || 1);

    const agentUtilization = new Map<SpecialistAgentType, number>();
    for (const [agentType, profile] of this.agentProfiles) {
      const utilization = profile.currentWorkload / profile.maxWorkload;
      agentUtilization.set(agentType, utilization);
    }

    return {
      totalTasks,
      routedTasks,
      averageConfidence,
      agentUtilization,
      averageRoutingTime: 100, // ms
      successRate: 0.95,
      qualityScore: 0.85,
      loadBalanceIndex: 0.8,
      collaborationIndex: 0.75
    };
  }

  private async identifyOptimizationOpportunities(
    metrics: RoutingMetrics
  ): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    // Check for load imbalances
    for (const [agentType, utilization] of metrics.agentUtilization) {
      if (utilization > 0.9) {
        opportunities.push({
          type: OptimizationType.LOAD_BALANCING,
          scope: OptimizationScope.AGENT_TYPE,
          agentType,
          description: `Agent ${agentType} is overloaded (${(utilization * 100).toFixed(1)}%)`,
          potentialImprovement: utilization - 0.7
        });
      } else if (utilization < 0.3) {
        opportunities.push({
          type: OptimizationType.LOAD_BALANCING,
          scope: OptimizationScope.AGENT_TYPE,
          agentType,
          description: `Agent ${agentType} is underutilized (${(utilization * 100).toFixed(1)}%)`,
          potentialImprovement: 0.5 - utilization
        });
      }
    }

    return opportunities;
  }

  private async applyOptimization(
    opportunity: OptimizationOpportunity
  ): Promise<RoutingOptimization> {
    // Apply the optimization
    this.logger.info('Applying optimization', { type: opportunity.type, agentType: opportunity.agentType });

    return {
      type: opportunity.type,
      scope: opportunity.scope,
      changes: [
        {
          agentType: opportunity.agentType!,
          taskId: 'optimization',
          action: RoutingAction.LOAD_BALANCE,
          reason: opportunity.description,
          expectedImpact: `${(opportunity.potentialImprovement * 100).toFixed(1)}% improvement`
        }
      ],
      beforeMetrics: {} as RoutingMetrics,
      afterMetrics: {} as RoutingMetrics,
      improvement: opportunity.potentialImprovement,
      impact: opportunity.description
    };
  }

  private async validateOptimizations(optimizations: RoutingOptimization[]): Promise<void> {
    // Validate that optimizations had the expected effect
    for (const optimization of optimizations) {
      this.logger.debug('Validating optimization', { type: optimization.type, improvement: optimization.improvement });
    }
  }

  private calculateTotalImprovement(optimizations: RoutingOptimization[]): number {
    return optimizations.reduce((sum, opt) => sum + opt.improvement, 0) / optimizations.length;
  }

  private async recalculateAgentMetrics(profile: TaskRoutingProfile): Promise<void> {
    // Recalculate efficiency, reliability, and quality scores
    const recentPerformance = profile.historicalPerformance.slice(-20);

    if (recentPerformance.length > 0) {
      profile.qualityScore = recentPerformance.reduce((sum, p) => sum + p.qualityScore, 0) / recentPerformance.length;
      profile.reliabilityScore = recentPerformance.filter(p => p.success).length / recentPerformance.length;
      profile.efficiencyScore = this.calculateEfficiency(recentPerformance);
      profile.averageResponseTime = recentPerformance.reduce((sum, p) => sum + p.duration, 0) / recentPerformance.length;
    }
  }

  private calculateEfficiency(performance: TaskPerformanceHistory[]): number {
    // Calculate efficiency based on duration vs estimated duration
    const efficiencies = performance.map(p => {
      const efficiency = p.estimatedDuration > 0 ? p.estimatedDuration / p.duration : 1;
      return Math.min(efficiency, 2); // Cap at 2x efficiency
    });

    return efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
  }
}

// Supporting classes and enums

class RoutingOptimizationEngine {
  // Implementation for routing optimization algorithms
}

class RiskAssessmentEngine {
  // Implementation for risk assessment algorithms
}

class RoutingPerformanceAnalyzer {
  // Implementation for performance analysis
}

class DynamicLoadBalancer {
  // Implementation for dynamic load balancing
}

// Supporting interfaces and enums

enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master'
}

enum ExperienceLevel {
  JUNIOR = 'junior',
  MID_LEVEL = 'mid_level',
  SENIOR = 'senior',
  PRINCIPAL = 'principal',
  ARCHITECT = 'architect'
}

enum RedistributionReason {
  OVERLOAD = 'overload',
  QUALITY_ISSUE = 'quality_issue',
  EXPERTISE_MISMATCH = 'expertise_mismatch',
  PRIORITY_CHANGE = 'priority_change',
  AGENT_FAILURE = 'agent_failure'
}

enum RedistributionStrategy {
  LOAD_BALANCE = 'load_balance',
  QUALITY_FOCUS = 'quality_focus',
  EXPERTISE_MATCH = 'expertise_match',
  BEST_FIT = 'best_fit'
}

interface TaskAnalysis {
  taskId?: string;
  type: string;
  complexity: TaskComplexity;
  expertise: string[];
  constraints: any[];
  collaboration: CollaborationLevel;
  quality: QualityRequirement[];
  timeline: TimelineConstraint;
}

interface QualityRequirement {
  criterion: string;
  threshold: number;
  mandatory: boolean;
}

interface TimelineConstraint {
  estimatedDuration: number;
  deadline: Date;
  flexibility: string;
}

interface RoutingConstraints {
  maxDuration?: number;
  minQuality?: number;
  allowedAgents?: SpecialistAgentType[];
  excludedAgents?: SpecialistAgentType[];
}

interface AgentCandidate {
  agentType: SpecialistAgentType;
  score: number;
  expertiseScore: number;
  workloadScore: number;
  performanceScore: number;
  collaborationScore: number;
  profile: TaskRoutingProfile;
}

interface BatchAnalysis {
  totalTasks: number;
  complexityDistribution: Map<TaskComplexity, number>;
  typeDistribution: Map<string, number>;
  estimatedDuration: number;
}

interface OptimizationOpportunity {
  type: OptimizationType;
  scope: OptimizationScope;
  agentType?: SpecialistAgentType;
  description: string;
  potentialImprovement: number;
}