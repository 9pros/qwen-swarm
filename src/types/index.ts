export interface AgentConfig {
  id: string;
  name: string;
  type: 'queen' | 'worker' | 'specialist';
  role: AgentRole;
  provider: ProviderConfig;
  capabilities: AgentCapability[];
  maxConcurrency: number;
  memorySize: number;
  autoScale: boolean;
  healthCheckInterval: number;
  retryPolicy: RetryPolicy;
  securityContext: SecurityContext;
}

export interface AgentRole {
  type: 'strategic' | 'tactical' | 'operational' | 'analytical' | 'creative';
  permissions: Permission[];
  expertise: string[];
  priority: number;
}

export interface ProviderConfig {
  type: 'qwen' | 'openai' | 'claude' | 'local' | 'custom';
  endpoint?: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  rateLimit: RateLimit;
}

export interface RateLimit {
  requestsPerSecond: number;
  tokensPerSecond: number;
  burstLimit: number;
  retryAfter: number;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface SecurityContext {
  encryptionEnabled: boolean;
  authenticationRequired: boolean;
  allowedOrigins: string[];
  permissions: Permission[];
  auditEnabled: boolean;
}

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
  conditions: Record<string, unknown>;
}

export interface AgentState {
  id: string;
  status: AgentStatus;
  health: HealthStatus;
  currentTasks: Task[];
  completedTasks: number;
  failedTasks: number;
  performance: PerformanceMetrics;
  lastActivity: Date;
  resources: ResourceUsage;
  memory: MemorySnapshot;
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  SUSPENDED = 'suspended',
  FAILED = 'failed',
  TERMINATING = 'terminating',
  TERMINATED = 'terminated'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical'
}

export interface Task {
  id: string;
  type: string;
  priority: TaskPriority;
  payload: unknown;
  dependencies: string[];
  assignedAgent?: string;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  result?: unknown;
  error?: Error;
  metadata: Record<string, unknown>;
}

export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export interface PerformanceMetrics {
  tasksPerSecond: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  resourceEfficiency: number;
  uptime: number;
  memoryEfficiency: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  tokens: number;
}

export interface MemorySnapshot {
  size: number;
  entries: MemoryEntry[];
  lastAccessed: Date;
  compressionRatio: number;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  type: MemoryType;
  timestamp: Date;
  accessCount: number;
  expiry?: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

export enum MemoryType {
  WORKING = 'working',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural'
}

export interface Message {
  id: string;
  from: string;
  to: string | string[];
  type: MessageType;
  payload: unknown;
  timestamp: Date;
  priority: MessagePriority;
  encrypted: boolean;
  signature?: string;
  metadata: Record<string, unknown>;
}

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  BROADCAST = 'broadcast',
  HEARTBEAT = 'heartbeat',
  COORDINATION = 'coordination',
  CONSENSUS = 'consensus',
  ERROR = 'error'
}

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

export interface ConsensusProposal {
  id: string;
  proposer: string;
  type: ConsensusType;
  payload: unknown;
  votingDeadline: Date;
  requiredQuorum: number;
  currentVotes: Vote[];
  status: ConsensusStatus;
  createdAt: Date;
  resolvedAt?: Date;
  result?: unknown;
}

export enum ConsensusType {
  SIMPLE_MAJORITY = 'simple_majority',
  SUPER_MAJORITY = 'super_majority',
  UNANIMOUS = 'unanimous',
  WEIGHTED = 'weighted',
  DELEGATED = 'delegated'
}

export enum ConsensusStatus {
  PROPOSED = 'proposed',
  VOTING = 'voting',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface Vote {
  voter: string;
  decision: VoteDecision;
  weight: number;
  reasoning?: string;
  timestamp: Date;
}

export enum VoteDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  ABSTAIN = 'abstain'
}

export interface LearningPattern {
  id: string;
  type: PatternType;
  pattern: unknown;
  frequency: number;
  confidence: number;
  lastObserved: Date;
  context: Record<string, unknown>;
  predictedOutcomes: PredictedOutcome[];
}

export enum PatternType {
  BEHAVIORAL = 'behavioral',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  SUCCESS = 'success',
  COMMUNICATION = 'communication',
  COORDINATION = 'coordination'
}

export interface PredictedOutcome {
  scenario: string;
  probability: number;
  impact: number;
  confidence: number;
  recommendation: string;
}

export interface SelfImprovementGoal {
  id: string;
  category: ImprovementCategory;
  description: string;
  currentMetric: number;
  targetMetric: number;
  deadline: Date;
  strategies: ImprovementStrategy[];
  progress: number;
  status: GoalStatus;
}

export enum ImprovementCategory {
  PERFORMANCE = 'performance',
  RELIABILITY = 'reliability',
  EFFICIENCY = 'efficiency',
  SCALABILITY = 'scalability',
  SECURITY = 'security',
  COLLABORATION = 'collaboration',
  LEARNING = 'learning'
}

export enum GoalStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

export interface ImprovementStrategy {
  id: string;
  name: string;
  description: string;
  steps: string[];
  resources: string[];
  expectedImpact: number;
  implementationComplexity: number;
  riskLevel: number;
}

export interface SystemHealth {
  overall: HealthStatus;
  components: ComponentHealth[];
  alerts: HealthAlert[];
  metrics: SystemMetrics;
  lastAssessment: Date;
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  metrics: Record<string, number>;
  lastCheck: Date;
  issues: HealthIssue[];
}

export interface HealthAlert {
  id: string;
  severity: AlertSeverity;
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface HealthIssue {
  type: string;
  description: string;
  severity: AlertSeverity;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface SystemMetrics {
  agentCount: number;
  activeAgents: number;
  taskQueue: number;
  tasksPerSecond: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
  uptime: number;
}