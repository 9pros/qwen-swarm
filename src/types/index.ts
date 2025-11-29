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
  // Enhanced multi-provider support
  customBaseUrls?: string[];
  models?: ModelConfiguration;
  healthCheck?: HealthCheckConfig;
  costOptimization?: CostOptimizationConfig;
  loadBalancing?: LoadBalancingConfig;
}

export interface ModelConfiguration {
  chatModels: ModelSpec[];
  visionModels: ModelSpec[];
  embeddingModels: ModelSpec[];
  audioModels: ModelSpec[];
  imageModels: ModelSpec[];
  defaultChatModel: string;
  defaultVisionModel: string;
  defaultEmbeddingModel: string;
  defaultAudioModel: string;
  defaultImageModel: string;
}

export interface ModelSpec {
  id: string;
  name: string;
  type: ModelType;
  capabilities: ModelCapability[];
  maxTokens: number;
  inputLimit: number;
  outputLimit: number;
  costPerToken: number;
  costPerRequest: number;
  averageLatency: number;
  quality: ModelQuality;
  provider: string;
  deprecated?: boolean;
  beta?: boolean;
  customContextWindow?: number;
}

export enum ModelType {
  CHAT = 'chat',
  VISION = 'vision',
  EMBEDDING = 'embedding',
  AUDIO = 'audio',
  IMAGE = 'image',
  CODE = 'code',
  REASONING = 'reasoning'
}

export enum ModelQuality {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ULTRA = 'ultra'
}

export enum ModelCapability {
  STREAMING = 'streaming',
  FUNCTION_CALLING = 'function_calling',
  VISION = 'vision',
  CODE_GENERATION = 'code_generation',
  JSON_MODE = 'json_mode',
  MULTILINGUAL = 'multilingual',
  LONG_CONTEXT = 'long_context',
  TOOL_USE = 'tool_use',
  PARALLEL_PROCESSING = 'parallel_processing',
  CONTEXTUAL_SEARCH = 'contextual_search'
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retryAttempts: number;
  endpoints: string[];
}

export interface CostOptimizationConfig {
  enabled: boolean;
  budgetLimits: BudgetLimits;
  costThresholds: CostThresholds;
  modelRanking: ModelRankingConfig;
  autoOptimize: boolean;
}

export interface BudgetLimits {
  daily: number;
  weekly: number;
  monthly: number;
  perRequest: number;
}

export interface CostThresholds {
  warningPercentage: number;
  criticalPercentage: number;
  autoFailoverPercentage: number;
}

export interface ModelRankingConfig {
  weightPerformance: number;
  weightCost: number;
  weightLatency: number;
  weightQuality: number;
}

export interface LoadBalancingConfig {
  strategy: LoadBalancingStrategy;
  weights?: Map<string, number>;
  failoverEnabled: boolean;
  circuitBreaker?: CircuitBreakerConfig;
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  LEAST_RESPONSE_TIME = 'least_response_time',
  COST_OPTIMIZED = 'cost_optimized',
  PERFORMANCE_BASED = 'performance_based',
  ADAPTIVE = 'adaptive'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
  monitoringPeriod: number;
}

export interface ModelBinding {
  agentType: AgentType;
  taskType: TaskType;
  preferredModels: string[];
  fallbackModels: string[];
  autoSelection: boolean;
  performanceThreshold: number;
  costThreshold: number;
  latencyThreshold: number;
}

export enum AgentType {
  QUEEN = 'queen',
  WORKER = 'worker',
  SPECIALIST = 'specialist',
  COORDINATOR = 'coordinator',
  ANALYZER = 'analyzer',
  EXECUTOR = 'executor'
}

export enum TaskType {
  STRATEGIC_PLANNING = 'strategic_planning',
  TACTICAL_EXECUTION = 'tactical_execution',
  DATA_ANALYSIS = 'data_analysis',
  CODE_GENERATION = 'code_generation',
  CONTENT_CREATION = 'content_creation',
  PROBLEM_SOLVING = 'problem_solving',
  COMMUNICATION = 'communication',
  COORDINATION = 'coordination',
  LEARNING = 'learning',
  MONITORING = 'monitoring'
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

// Enhanced provider analytics
export interface ProviderAnalytics {
  providerId: string;
  providerType: string;
  metrics: ProviderDetailedMetrics;
  costTracking: CostTracking;
  performanceHistory: PerformanceSnapshot[];
  usagePatterns: UsagePattern[];
  healthStatus: ProviderHealthStatus;
  alerts: ProviderAlert[];
  recommendations: OptimizationRecommendation[];
}

export interface ProviderDetailedMetrics {
  requestMetrics: RequestMetrics;
  modelMetrics: Map<string, ModelMetrics>;
  errorMetrics: ErrorMetrics;
  latencyMetrics: LatencyMetrics;
  throughputMetrics: ThroughputMetrics;
  resourceMetrics: ResourceMetrics;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retryCount: number;
  timeoutCount: number;
  averageRequestsPerSecond: number;
  peakRequestsPerSecond: number;
  requestsByHour: Map<number, number>;
  requestsByDay: Map<string, number>;
}

export interface ModelMetrics {
  modelId: string;
  requestCount: number;
  totalTokens: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
  costUsage: number;
  performanceScore: number;
  qualityScore: number;
  lastUsed: Date;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorTypes: Map<string, number>;
  errorRate: number;
  averageRecoveryTime: number;
  criticalErrors: number;
  recentErrors: ErrorDetails[];
}

export interface ErrorDetails {
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  context: Record<string, unknown>;
  resolved: boolean;
  resolutionTime?: number;
}

export interface LatencyMetrics {
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
  latencyByModel: Map<string, number>;
  latencyByHour: Map<number, number>;
}

export interface ThroughputMetrics {
  tokensPerSecond: number;
  requestsPerSecond: number;
  averageRequestSize: number;
  averageResponseSize: number;
  throughputByModel: Map<string, number>;
  peakThroughput: number;
}

export interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkUsage: number;
  diskUsage: number;
  apiQuotaUsage: number;
  connectionPoolUsage: number;
}

export interface CostTracking {
  totalCost: number;
  costByModel: Map<string, number>;
  costByDay: Map<string, number>;
  costByHour: Map<number, number>;
  tokenCost: number;
  requestCost: number;
  budgetUsage: BudgetUsage;
  costProjection: CostProjection;
}

export interface BudgetUsage {
  dailyBudgetUsed: number;
  weeklyBudgetUsed: number;
  monthlyBudgetUsed: number;
  dailyBudgetRemaining: number;
  weeklyBudgetRemaining: number;
  monthlyBudgetRemaining: number;
  budgetAlerts: BudgetAlert[];
}

export interface BudgetAlert {
  type: 'daily' | 'weekly' | 'monthly';
  percentageUsed: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
}

export interface CostProjection {
  dailyProjection: number;
  weeklyProjection: number;
  monthlyProjection: number;
  confidence: number;
  factors: ProjectionFactor[];
}

export interface ProjectionFactor {
  factor: string;
  impact: number;
  confidence: number;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  latency: number;
  throughput: number;
  successRate: number;
  errorRate: number;
  resourceUsage: ResourceMetrics;
  cost: number;
}

export interface UsagePattern {
  pattern: string;
  frequency: number;
  confidence: number;
  description: string;
  recommendations: string[];
  lastObserved: Date;
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  lastHealthCheck: Date;
  uptime: number;
  downtime: number;
  incidents: HealthIncident[];
  recoveryTime: number;
}

export interface HealthIncident {
  id: string;
  startTime: Date;
  endTime?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution?: string;
  impact: string;
  duration?: number;
}

export interface ProviderAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  context: Record<string, unknown>;
  recommendedAction?: string;
}

export enum AlertType {
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  HIGH_ERROR_RATE = 'high_error_rate',
  COST_OVERAGE = 'cost_overage',
  QUOTA_EXCEEDED = 'quota_exceeded',
  PROVIDER_DOWNTIME = 'provider_downtime',
  LATENCY_SPIKE = 'latency_spike',
  SECURITY_ISSUE = 'security_issue',
  CONFIGURATION_ERROR = 'configuration_error'
}

export interface OptimizationRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  description: string;
  expectedImpact: string;
  implementation: ImplementationDetails;
  timestamp: Date;
  applied: boolean;
  result?: RecommendationResult;
}

export enum RecommendationType {
  MODEL_SWITCH = 'model_switch',
  LOAD_BALANCING = 'load_balancing',
  COST_OPTIMIZATION = 'cost_optimization',
  PERFORMANCE_IMPROVEMENT = 'performance_improvement',
  CONFIGURATION_CHANGE = 'configuration_change',
  PROTOCOL_CHANGE = 'protocol_change'
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ImplementationDetails {
  steps: string[];
  estimatedTime: number;
  complexity: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  requiredChanges: string[];
  rollbackPlan: string;
}

export interface RecommendationResult {
  success: boolean;
  actualImpact: string;
  metrics: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  issues?: string[];
  timestamp: Date;
}