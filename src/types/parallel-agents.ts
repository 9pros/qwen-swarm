import type { AgentConfig, Task, AgentStatus, TaskPriority, TaskStatus } from './index';

// Enhanced Agent Types for 10-Agent Parallel System
export enum SpecialistAgentType {
  QUEEN = 'queen',
  CODE = 'code',
  ANALYSIS = 'analysis',
  ARCHITECTURE = 'architecture',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  UI_UX = 'ui_ux',
  INTEGRATION = 'integration'
}

export interface ParallelAgentConfig extends AgentConfig {
  specialistType: SpecialistAgentType;
  parallelCapabilities: ParallelCapability[];
  collaborationLevel: CollaborationLevel;
  coordinationPreferences: CoordinationPreferences;
  expertiseDomains: ExpertiseDomain[];
  workloadCapacity: WorkloadCapacity;
  collaborationHistory: CollaborationRecord[];
}

export interface ParallelCapability {
  id: string;
  name: string;
  type: CapabilityType;
  parallelExecution: boolean;
  coordinationRequired: boolean;
  resourceRequirements: ResourceRequirement[];
  dependencies: string[];
  conflictResolution: ConflictResolutionStrategy;
}

export enum CapabilityType {
  CODE_GENERATION = 'code_generation',
  ANALYSIS = 'analysis',
  DESIGN = 'design',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  SECURITY_REVIEW = 'security_review',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  UI_DESIGN = 'ui_design',
  INTEGRATION = 'integration',
  COORDINATION = 'coordination',
  VALIDATION = 'validation',
  SYNTHESIS = 'synthesis'
}

export enum CollaborationLevel {
  INDEPENDENT = 'independent',    // Works alone, minimal coordination
  COOPERATIVE = 'cooperative',    // Shares information, coordinates
  COLLABORATIVE = 'collaborative', // Active collaboration, shared goals
  SYNERGISTIC = 'synergistic'     // Deep integration, enhanced results
}

export interface CoordinationPreferences {
  preferredPartners: SpecialistAgentType[];
  avoidPartners: SpecialistAgentType[];
  communicationStyle: CommunicationStyle;
  decisionMakingApproach: DecisionMakingApproach;
  conflictResolutionStyle: ConflictResolutionStyle;
  synchronizationPreference: SynchronizationPreference;
}

export enum CommunicationStyle {
  SYNCHRONOUS = 'synchronous',
  ASYNCHRONOUS = 'asynchronous',
  HYBRID = 'hybrid',
  EVENT_DRIVEN = 'event_driven'
}

export enum DecisionMakingApproach {
  AUTONOMOUS = 'autonomous',
  CONSENSUS_SEEKING = 'consensus_seeking',
  HIERARCHICAL = 'hierarchical',
  DEMOCRATIC = 'democratic'
}

export enum ConflictResolutionStyle {
  COMPETITIVE = 'competitive',
  COLLABORATIVE = 'collaborative',
  COMPROMISING = 'compromising',
  ACCOMMODATING = 'accommodating',
  AVOIDING = 'avoiding'
}

export enum SynchronizationPreference {
  TIGHT = 'tight',        // Frequent synchronization
  LOOSE = 'loose',        // Minimal synchronization
  ADAPTIVE = 'adaptive',  // Dynamic synchronization based on context
  EVENT_BASED = 'event_based' // Synchronize on specific events
}

export interface ExpertiseDomain {
  domain: string;
  proficiency: ProficiencyLevel;
  specializations: string[];
  certifications: string[];
  experience: ExperienceLevel;
  recentProjects: string[];
}

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master'
}

export enum ExperienceLevel {
  JUNIOR = 'junior',
  MID_LEVEL = 'mid_level',
  SENIOR = 'senior',
  PRINCIPAL = 'principal',
  ARCHITECT = 'architect'
}

export interface WorkloadCapacity {
  maxConcurrentTasks: number;
  maxParallelTasks: number;
  taskComplexityLimit: TaskComplexity;
  preferredTaskDuration: number; // in seconds
  workloadHistory: WorkloadHistoryEntry[];
  efficiencyMetrics: EfficiencyMetrics;
}

export enum TaskComplexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  CRITICAL = 'critical'
}

export interface WorkloadHistoryEntry {
  taskId: string;
  complexity: TaskComplexity;
  duration: number;
  success: boolean;
  quality: QualityScore;
  resourcesUsed: ResourceUsage;
  collaborationLevel: CollaborationLevel;
  timestamp: Date;
}

export interface QualityScore {
  overall: number; // 0-100
  accuracy: number;
  completeness: number;
  efficiency: number;
  innovation: number;
  maintainability: number;
}

export interface CollaborationRecord {
  partnerId: string;
  partnerType: SpecialistAgentType;
  projectId: string;
  role: CollaborationRole;
  outcome: CollaborationOutcome;
  duration: number;
  quality: QualityScore;
  feedback: string;
  timestamp: Date;
}

export enum CollaborationRole {
  LEADER = 'leader',
  CONTRIBUTOR = 'contributor',
  REVIEWER = 'reviewer',
  VALIDATOR = 'validator',
  COORDINATOR = 'coordinator'
}

export enum CollaborationOutcome {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  SATISFACTORY = 'satisfactory',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  POOR = 'poor'
}

// Parallel Task System Types
export interface ParallelTask extends Task {
  parallelStrategy: ParallelStrategy;
  subtasks: ParallelSubtask[];
  dependencies: ParallelDependency[];
  coordinationRequirements: CoordinationRequirement[];
  resourceRequirements: ResourceRequirement[];
  qualityGates: QualityGate[];
  collaborationPlan: CollaborationPlan;
}

export enum ParallelStrategy {
  PIPELINE = 'pipeline',              // Sequential handoff between agents
  SIMULTANEOUS = 'simultaneous',      // All agents work simultaneously
  HIERARCHICAL = 'hierarchical',      // Queen coordinates, others execute
  COLLABORATIVE = 'collaborative',    // All agents collaborate equally
  ADAPTIVE = 'adaptive'               // Dynamic strategy based on context
}

export interface ParallelSubtask {
  id: string;
  parentTaskId: string;
  assignedAgent: SpecialistAgentType;
  requirements: SubtaskRequirements;
  deliverables: Deliverable[];
  dependencies: string[]; // IDs of other subtasks
  status: TaskStatus;
  estimatedDuration: number;
  actualDuration?: number;
  quality?: QualityScore;
  result?: any;
}

export interface SubtaskRequirements {
  description: string;
  acceptanceCriteria: string[];
  inputs: any[];
  outputs: OutputSpec[];
  constraints: Constraint[];
  assumptions: string[];
}

export interface OutputSpec {
  type: OutputType;
  format: string;
  schema?: any;
  validation: ValidationRule[];
}

export enum OutputType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  DESIGN = 'design',
  TEST_CASE = 'test_case',
  ANALYSIS = 'analysis',
  CONFIGURATION = 'configuration',
  DEPLOYMENT = 'deployment'
}

export interface ValidationRule {
  rule: string;
  severity: ValidationSeverity;
  automated: boolean;
}

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface Deliverable {
  id: string;
  name: string;
  type: OutputType;
  content: any;
  metadata: Record<string, any>;
  quality: QualityScore;
  dependencies: string[];
}

export interface ParallelDependency {
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
  strength: DependencyStrength;
  conditional?: boolean;
  condition?: string;
}

export enum DependencyType {
  DATA = 'data',
  CONTROL = 'control',
  RESOURCE = 'resource',
  TEMPORAL = 'temporal',
  QUALITY = 'quality'
}

export enum DependencyStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  CRITICAL = 'critical'
}

export interface CoordinationRequirement {
  type: CoordinationType;
  participants: SpecialistAgentType[];
  frequency: CoordinationFrequency;
  protocol: CoordinationProtocol;
  qualityThreshold: number;
  conflictResolution: ConflictResolutionStrategy;
}

export enum CoordinationType {
  SYNC_POINT = 'sync_point',
  DATA_SHARING = 'data_sharing',
  DECISION_MAKING = 'decision_making',
  QUALITY_REVIEW = 'quality_review',
  CONFLICT_RESOLUTION = 'conflict_resolution',
  PROGRESS_UPDATE = 'progress_update'
}

export enum CoordinationFrequency {
  ONCE = 'once',
  PERIODIC = 'periodic',
  EVENT_DRIVEN = 'event_driven',
  CONTINUOUS = 'continuous',
  ON_DEMAND = 'on_demand'
}

export interface CoordinationProtocol {
  name: string;
  steps: ProtocolStep[];
  timeout: number;
  retryPolicy: RetryPolicy;
  escalationPath: string[];
}

export interface ProtocolStep {
  id: string;
  description: string;
  participants: SpecialistAgentType[];
  expectedOutput: string;
  timeout: number;
  failureHandling: FailureHandling;
}

export interface FailureHandling {
  strategy: FailureStrategy;
  retryAttempts: number;
  fallback: string;
  escalation: boolean;
}

export enum FailureStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  FALLBACK = 'fallback',
  ABORT = 'abort',
  ESCALATE = 'escalate'
}

export enum ConflictResolutionStrategy {
  MAJORITY_VOTE = 'majority_vote',
  QUEEN_DECISION = 'queen_decision',
  CONSENSUS = 'consensus',
  EXPERTISE_BASED = 'expertise_based',
  MERGE = 'merge',
  COMPROMISE = 'compromise'
}

export interface QualityGate {
  id: string;
  name: string;
  criteria: QualityCriteria[];
  approvers: SpecialistAgentType[];
  requiredApprovals: number;
  autoApprove: boolean;
  blocking: boolean;
}

export interface QualityCriteria {
  metric: string;
  threshold: number;
  operator: ComparisonOperator;
  weight: number;
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  GREATER_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'neq'
}

export interface CollaborationPlan {
  phases: CollaborationPhase[];
  communicationChannels: CommunicationChannel[];
  decisionMakingProcess: DecisionMakingProcess;
  conflictResolutionPlan: ConflictResolutionPlan;
}

export interface CollaborationPhase {
  id: string;
  name: string;
  participants: SpecialistAgentType[];
  activities: CollaborationActivity[];
  deliverables: string[];
  duration: number;
  dependencies: string[];
}

export interface CollaborationActivity {
  id: string;
  name: string;
  type: ActivityType;
  participants: SpecialistAgentType[];
  description: string;
  inputs: string[];
  outputs: string[];
  duration: number;
  coordinationNeeds: string[];
}

export enum ActivityType {
  BRAINSTORMING = 'brainstorming',
  DESIGN = 'design',
  REVIEW = 'review',
  VALIDATION = 'validation',
  INTEGRATION = 'integration',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation'
}

export interface CommunicationChannel {
  id: string;
  type: ChannelType;
  participants: SpecialistAgentType[];
  purpose: string;
  protocol: string;
  frequency: CoordinationFrequency;
  persistence: boolean;
}

export enum ChannelType {
  SYNC_MEETING = 'sync_meeting',
  ASYNC_MESSAGE = 'async_message',
  SHARED_WORKSPACE = 'shared_workspace',
  EVENT_BUS = 'event_bus',
  DATA_PIPELINE = 'data_pipeline'
}

export interface DecisionMakingProcess {
  approach: DecisionMakingApproach;
  participants: SpecialistAgentType[];
  votingMechanism?: VotingMechanism;
  consensusThreshold?: number;
  tieBreakingRule: TieBreakingRule;
  escalationPath: string[];
}

export interface VotingMechanism {
  type: VotingType;
  weights?: Map<SpecialistAgentType, number>;
  quorum: number;
  timeout: number;
}

export enum VotingType {
  SIMPLE_MAJORITY = 'simple_majority',
  SUPER_MAJORITY = 'super_majority',
  UNANIMOUS = 'unanimous',
  WEIGHTED = 'weighted'
}

export enum TieBreakingRule {
  QUEEN_DECIDES = 'queen_decides',
  SENIORITY_WINS = 'seniority_wins',
  EXPERTISE_WINS = 'expertise_wins',
  RANDOM = 'random',
  FURTHER_DISCUSSION = 'further_discussion'
}

export interface ConflictResolutionPlan {
  strategies: Map<ConflictType, ConflictResolutionStrategy>;
  escalationProcess: EscalationStep[];
  mediationProcess: MediationStep[];
  documentation: boolean;
}

export enum ConflictType {
  TECHNICAL_DISAGREEMENT = 'technical_disagreement',
  PRIORITY_CONFLICT = 'priority_conflict',
  RESOURCE_COMPETITION = 'resource_competition',
  QUALITY_STANDARDS = 'quality_standards',
  TIMELINE_DISPUTE = 'timeline_dispute'
}

export interface EscalationStep {
  level: number;
  participants: SpecialistAgentType[];
  approach: string;
  timeout: number;
  autoEscalate: boolean;
}

export interface MediationStep {
  mediator: SpecialistAgentType;
  process: string;
  criteria: string[];
  timeline: number;
}

// Performance and Efficiency Types
export interface EfficiencyMetrics {
  productivity: number;          // Tasks completed per hour
  qualityIndex: number;          // Average quality score
  collaborationIndex: number;    // Effectiveness of collaboration
  resourceEfficiency: number;    // Resource utilization efficiency
  timeEfficiency: number;        // Time vs estimated ratio
  innovationIndex: number;       // Novel solutions contributed
  learningRate: number;          // Improvement over time
  reliabilityScore: number;      // Consistency of performance
}

export interface ResourceRequirement {
  type: ResourceType;
  amount: number;
  priority: ResourcePriority;
  constraints: ResourceConstraint[];
  alternatives: ResourceAlternative[];
}

export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  STORAGE = 'storage',
  NETWORK = 'network',
  TOKENS = 'tokens',
  API_CALLS = 'api_calls',
  AGENT_TIME = 'agent_time',
  EXTERNAL_SERVICE = 'external_service'
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

export interface ResourceAlternative {
  type: ResourceType;
  conversionRate: number;
  efficiency: number;
  availability: number;
}

// System State and Monitoring Types
export interface ParallelSystemState {
  totalAgents: number;
  activeAgents: number;
  parallelTasks: ParallelTask[];
  agentWorkloads: Map<SpecialistAgentType, AgentWorkload>;
  systemMetrics: ParallelSystemMetrics;
  collaborationMatrix: CollaborationMatrix;
  performanceHistory: PerformanceSnapshot[];
  alerts: SystemAlert[];
  configuration: SystemConfiguration;
}

export interface AgentWorkload {
  agentType: SpecialistAgentType;
  currentTasks: number;
  capacityUtilization: number;
  averageTaskDuration: number;
  qualityMetrics: QualityMetrics;
  collaborationLoad: number;
  efficiencyScore: number;
  resourceUsage: ResourceUsage;
}

export interface QualityMetrics {
  averageScore: number;
  trend: TrendDirection;
  improvementRate: number;
  issueRate: number;
  reworkRate: number;
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining'
}

export interface ParallelSystemMetrics {
  throughput: number;              // Tasks completed per hour
  latency: number;                 // Average task completion time
  qualityScore: number;            // Average quality across all agents
  collaborationEfficiency: number; // Effectiveness of agent collaboration
  resourceUtilization: number;     // Overall resource usage efficiency
  agentUtilization: number;        // Average agent capacity utilization
  errorRate: number;               // System error rate
  scalabilityIndex: number;        // System's ability to handle load
}

export interface CollaborationMatrix {
  matrix: Map<SpecialistAgentType, Map<SpecialistAgentType, CollaborationScore>>;
  lastUpdated: Date;
  trends: Map<string, TrendDirection>;
}

export interface CollaborationScore {
  frequency: number;               // How often they collaborate
  effectiveness: number;           // How successful their collaborations are
  efficiency: number;              // Time and resource efficiency
  quality: number;                 // Quality of collaborative outputs
  satisfaction: number;            // Agent satisfaction with collaboration
  overall: number;                 // Weighted overall score
}

export interface PerformanceSnapshot {
  timestamp: Date;
  systemMetrics: ParallelSystemMetrics;
  agentMetrics: Map<SpecialistAgentType, AgentWorkload>;
  collaborationEfficiency: number;
  resourceEfficiency: number;
  qualityTrend: TrendDirection;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  component: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  resolution?: string;
}

export enum AlertType {
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  QUALITY_DECLINE = 'quality_decline',
  COLLABORATION_ISSUE = 'collaboration_issue',
  RESOURCE_SHORTAGE = 'resource_shortage',
  AGENT_FAILURE = 'agent_failure',
  COMMUNICATION_BREAKDOWN = 'communication_breakdown',
  DEADLINE_MISSED = 'deadline_missed'
}

export interface SystemConfiguration {
  maxParallelTasks: number;
  defaultParallelStrategy: ParallelStrategy;
  qualityGatesEnabled: boolean;
  autoScalingEnabled: boolean;
  monitoringEnabled: boolean;
  collaborationLevel: CollaborationLevel;
  performanceOptimization: boolean;
  faultToleranceEnabled: boolean;
  loggingLevel: LogLevel;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}