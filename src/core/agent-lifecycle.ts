import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type {
  AgentConfig,
  AgentState,
  AgentStatus,
  HealthStatus,
  Task,
  PerformanceMetrics,
  ResourceUsage
} from '@/types';
import { Logger, PerformanceLogger } from '@/utils/logger';

export interface AgentLifecycleEvents {
  'agent:created': (agentId: string, config: AgentConfig) => void;
  'agent:started': (agentId: string) => void;
  'agent:stopped': (agentId: string) => void;
  'agent:paused': (agentId: string) => void;
  'agent:resumed': (agentId: string) => void;
  'agent:failed': (agentId: string, error: Error) => void;
  'agent:recovered': (agentId: string) => void;
  'agent:terminated': (agentId: string) => void;
  'agent:health-changed': (agentId: string, status: HealthStatus) => void;
  'agent:task-assigned': (agentId: string, task: Task) => void;
  'agent:task-completed': (agentId: string, task: Task) => void;
  'agent:task-failed': (agentId: string, task: Task, error: Error) => void;
  'agent:metrics-updated': (agentId: string, metrics: PerformanceMetrics) => void;
}

export class AgentLifecycleManager extends EventEmitter<AgentLifecycleEvents> {
  private agents: Map<string, AgentInstance> = new Map();
  private logger: Logger;
  private performanceLogger: PerformanceLogger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'AgentLifecycleManager' });
    this.performanceLogger = new PerformanceLogger(this.logger);
    this.startPeriodicTasks();
  }

  public async createAgent(config: AgentConfig): Promise<string> {
    const agentId = config.id || uuidv4();

    try {
      await this.performanceLogger.measure('createAgent', async () => {
        const agent = new AgentInstance(agentId, config, this.logger);
        this.agents.set(agentId, agent);

        agent.on('status-changed', (newStatus: AgentStatus) => {
          this.handleStatusChange(agentId, newStatus);
        });

        agent.on('health-changed', (newHealth: HealthStatus) => {
          this.emit('agent:health-changed', agentId, newHealth);
        });

        agent.on('metrics-updated', (metrics: PerformanceMetrics) => {
          this.emit('agent:metrics-updated', agentId, metrics);
        });

        await agent.initialize();
      });

      this.logger.info('Agent created successfully', { agentId, type: config.type });
      this.emit('agent:created', agentId, config);
      return agentId;

    } catch (error) {
      this.logger.error('Failed to create agent', error instanceof Error ? error : new Error(String(error)), { agentId, config });
      throw error;
    }
  }

  public async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    try {
      await this.performanceLogger.measure(`startAgent:${agentId}`, async () => {
        await agent.start();
      });

      this.logger.info('Agent started successfully', { agentId });
      this.emit('agent:started', agentId);
    } catch (error) {
      this.logger.error('Failed to start agent', error instanceof Error ? error : new Error(String(error)), { agentId });
      await this.handleAgentFailure(agentId, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async stopAgent(agentId: string, graceful: boolean = true): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    try {
      await this.performanceLogger.measure(`stopAgent:${agentId}`, async () => {
        await agent.stop(graceful);
      });

      this.logger.info('Agent stopped successfully', { agentId, graceful });
      this.emit('agent:stopped', agentId);
    } catch (error) {
      this.logger.error('Failed to stop agent', error instanceof Error ? error : new Error(String(error)), { agentId });
      throw error;
    }
  }

  public async pauseAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    await agent.pause();
    this.logger.info('Agent paused', { agentId });
    this.emit('agent:paused', agentId);
  }

  public async resumeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    await agent.resume();
    this.logger.info('Agent resumed', { agentId });
    this.emit('agent:resumed', agentId);
  }

  public async terminateAgent(agentId: string, reason?: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    try {
      await this.performanceLogger.measure(`terminateAgent:${agentId}`, async () => {
        await agent.terminate(reason);
      });

      this.agents.delete(agentId);
      this.logger.info('Agent terminated', { agentId, reason });
      this.emit('agent:terminated', agentId);
    } catch (error) {
      this.logger.error('Failed to terminate agent', error instanceof Error ? error : new Error(String(error)), { agentId });
      throw error;
    }
  }

  public getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  public getAgentsByType(type: 'queen' | 'worker' | 'specialist'): AgentInstance[] {
    return Array.from(this.agents.values()).filter(agent => agent.config.type === type);
  }

  public getAgentsByStatus(status: AgentStatus): AgentInstance[] {
    return Array.from(this.agents.values()).filter(agent => agent.getStatus() === status);
  }

  public getHealthyAgents(): AgentInstance[] {
    return Array.from(this.agents.values()).filter(agent => agent.isHealthy());
  }

  public getAgentState(agentId: string): AgentState | undefined {
    const agent = this.agents.get(agentId);
    return agent?.getState();
  }

  public async assignTask(agentId: string, task: Task): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    try {
      await agent.assignTask(task);
      this.logger.debug('Task assigned to agent', { agentId, taskId: task.id });
      this.emit('agent:task-assigned', agentId, task);
    } catch (error) {
      this.logger.error('Failed to assign task to agent', error instanceof Error ? error : new Error(String(error)), { agentId, taskId: task.id });
      throw error;
    }
  }

  public async scaleAgentPool(type: 'queen' | 'worker' | 'specialist', targetCount: number): Promise<void> {
    const currentAgents = this.getAgentsByType(type);
    const currentCount = currentAgents.length;

    if (targetCount > currentCount) {
      const agentsToAdd = targetCount - currentCount;
      this.logger.info(`Scaling up ${type} agents`, { currentCount, targetCount, agentsToAdd });

      for (let i = 0; i < agentsToAdd; i++) {
        const config = this.createAgentConfig(type);
        const agentId = await this.createAgent(config);
        await this.startAgent(agentId);
      }
    } else if (targetCount < currentCount) {
      const agentsToRemove = currentCount - targetCount;
      this.logger.info(`Scaling down ${type} agents`, { currentCount, targetCount, agentsToRemove });

      const idleAgents = currentAgents
        .filter(agent => agent.getStatus() === AgentStatus.IDLE)
        .slice(0, agentsToRemove);

      for (const agent of idleAgents) {
        await this.terminateAgent(agent.id, 'Scale down');
      }

      if (idleAgents.length < agentsToRemove) {
        const busyAgents = currentAgents
          .filter(agent => agent.getStatus() === AgentStatus.BUSY)
          .slice(0, agentsToRemove - idleAgents.length);

        for (const agent of busyAgents) {
          await this.terminateAgent(agent.id, 'Scale down');
        }
      }
    }
  }

  private handleStatusChange(agentId: string, newStatus: AgentStatus): void {
    this.logger.debug('Agent status changed', { agentId, status: newStatus });
  }

  private async handleAgentFailure(agentId: string, error: Error): Promise<void> {
    this.logger.error('Agent failure detected', error, { agentId });
    this.emit('agent:failed', agentId, error);

    const agent = this.agents.get(agentId);
    if (agent) {
      try {
        await agent.recover();
        this.logger.info('Agent recovered successfully', { agentId });
        this.emit('agent:recovered', agentId);
      } catch (recoveryError) {
        this.logger.error('Agent recovery failed', recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)), { agentId });
        await this.terminateAgent(agentId, 'Recovery failed');
      }
    }
  }

  private startPeriodicTasks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    this.metricsUpdateInterval = setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  private async performHealthChecks(): Promise<void> {
    const agents = Array.from(this.agents.values());
    await Promise.allSettled(agents.map(agent => agent.performHealthCheck()));
  }

  private async updateMetrics(): Promise<void> {
    const agents = Array.from(this.agents.values());
    await Promise.allSettled(agents.map(agent => agent.updateMetrics()));
  }

  private createAgentConfig(type: 'queen' | 'worker' | 'specialist'): AgentConfig {
    return {
      id: uuidv4(),
      name: `${type}-${Date.now()}`,
      type,
      role: {
        type: type === 'queen' ? 'strategic' : 'operational',
        permissions: [],
        expertise: [],
        priority: type === 'queen' ? 10 : 5
      },
      provider: {
        type: 'qwen',
        model: 'qwen-max',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 30000,
        rateLimit: {
          requestsPerSecond: 10,
          tokensPerSecond: 10000,
          burstLimit: 100,
          retryAfter: 1000
        }
      },
      capabilities: [],
      maxConcurrency: type === 'queen' ? 1 : 5,
      memorySize: type === 'queen' ? 50000 : 10000,
      autoScale: true,
      healthCheckInterval: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMIT']
      },
      securityContext: {
        encryptionEnabled: false,
        authenticationRequired: true,
        allowedOrigins: ['*'],
        permissions: [],
        auditEnabled: true
      }
    };
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Agent Lifecycle Manager');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
      this.metricsUpdateInterval = null;
    }

    const agents = Array.from(this.agents.values());
    await Promise.allSettled(agents.map(agent => agent.terminate('System shutdown')));
    this.agents.clear();

    this.logger.info('Agent Lifecycle Manager shutdown complete');
  }
}

export class AgentInstance extends EventEmitter {
  public readonly id: string;
  public readonly config: AgentConfig;
  private state: AgentState;
  private logger: Logger;
  private currentTasks: Map<string, Task> = new Map();
  private taskHistory: Task[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor(id: string, config: AgentConfig, logger: Logger) {
    super();
    this.id = id;
    this.config = config;
    this.logger = logger.withContext({ agentId: id });
    this.state = this.createInitialState();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing agent', { type: this.config.type });
    this.state = {
      ...this.state,
      status: AgentStatus.IDLE,
      lastActivity: new Date()
    };
  }

  public async start(): Promise<void> {
    this.logger.info('Starting agent');
    this.state.status = AgentStatus.BUSY;
    this.state.lastActivity = new Date();

    this.startHealthCheck();
    this.startMetricsUpdate();

    this.emit('status-changed', AgentStatus.BUSY);
  }

  public async stop(graceful: boolean = true): Promise<void> {
    this.logger.info('Stopping agent', { graceful });

    if (graceful && this.currentTasks.size > 0) {
      this.logger.info('Waiting for current tasks to complete', { taskCount: this.currentTasks.size });
      await this.waitForTasksCompletion(30000);
    }

    this.stopHealthCheck();
    this.stopMetricsUpdate();

    this.state.status = AgentStatus.IDLE;
    this.state.lastActivity = new Date();

    this.emit('status-changed', AgentStatus.IDLE);
  }

  public async pause(): Promise<void> {
    this.logger.info('Pausing agent');
    this.state.status = AgentStatus.SUSPENDED;
    this.state.lastActivity = new Date();
    this.emit('status-changed', AgentStatus.SUSPENDED);
  }

  public async resume(): Promise<void> {
    this.logger.info('Resuming agent');
    this.state.status = AgentStatus.BUSY;
    this.state.lastActivity = new Date();
    this.emit('status-changed', AgentStatus.BUSY);
  }

  public async terminate(reason?: string): Promise<void> {
    this.logger.info('Terminating agent', { reason });

    this.stopHealthCheck();
    this.stopMetricsUpdate();

    this.state.status = AgentStatus.TERMINATED;
    this.state.lastActivity = new Date();

    this.currentTasks.clear();
    this.taskHistory = [];

    this.emit('status-changed', AgentStatus.TERMINATED);
    this.removeAllListeners();
  }

  public async recover(): Promise<void> {
    this.logger.info('Attempting agent recovery');

    this.state.status = AgentStatus.SUSPENDED;
    this.state.health = HealthStatus.DEGRADED;

    this.stopHealthCheck();
    this.stopMetricsUpdate();

    await this.performHealthCheck();

    if (this.isHealthy()) {
      this.state.status = AgentStatus.IDLE;
      this.state.health = HealthStatus.HEALTHY;
      this.startHealthCheck();
      this.startMetricsUpdate();
      this.logger.info('Agent recovery successful');
    } else {
      throw new Error('Agent recovery failed - health check still failing');
    }
  }

  public getStatus(): AgentStatus {
    return this.state.status;
  }

  public getHealth(): HealthStatus {
    return this.state.health;
  }

  public isHealthy(): boolean {
    return this.state.health === HealthStatus.HEALTHY || this.state.health === HealthStatus.DEGRADED;
  }

  public getState(): AgentState {
    return {
      ...this.state,
      currentTasks: Array.from(this.currentTasks.values()),
      completedTasks: this.taskHistory.filter(task => task.status === 'completed').length,
      failedTasks: this.taskHistory.filter(task => task.status === 'failed').length
    };
  }

  public async assignTask(task: Task): Promise<void> {
    if (this.currentTasks.size >= this.config.maxConcurrency) {
      throw new Error(`Agent ${this.id} is at maximum capacity`);
    }

    this.currentTasks.set(task.id, task);
    this.state.lastActivity = new Date();

    this.logger.debug('Task assigned', { taskId: task.id });
  }

  public completeTask(taskId: string, result?: unknown): void {
    const task = this.currentTasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;

    this.currentTasks.delete(taskId);
    this.taskHistory.push(task);

    this.state.lastActivity = new Date();
    this.logger.debug('Task completed', { taskId });
  }

  public failTask(taskId: string, error: Error): void {
    const task = this.currentTasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'failed';
    task.error = error;
    task.retryCount++;

    this.currentTasks.delete(taskId);
    this.taskHistory.push(task);

    this.state.lastActivity = new Date();
    this.logger.warn('Task failed', { taskId, error: error.message });
  }

  private createInitialState(): AgentState {
    return {
      id: this.id,
      status: AgentStatus.IDLE,
      health: HealthStatus.HEALTHY,
      currentTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      performance: {
        tasksPerSecond: 0,
        averageResponseTime: 0,
        successRate: 1,
        errorRate: 0,
        resourceEfficiency: 1,
        uptime: 0,
        memoryEfficiency: 1
      },
      lastActivity: new Date(),
      resources: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
        tokens: 0
      },
      memory: {
        size: 0,
        entries: [],
        lastAccessed: new Date(),
        compressionRatio: 1
      }
    };
  }

  private async performHealthCheck(): Promise<void> {
    const previousHealth = this.state.health;

    try {
      const healthIssues: string[] = [];

      if (this.currentTasks.size > this.config.maxConcurrency) {
        healthIssues.push('Task limit exceeded');
      }

      if (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.9) {
        healthIssues.push('High memory usage');
      }

      if (Date.now() - this.state.lastActivity.getTime() > 300000) {
        healthIssues.push('Agent inactive for too long');
      }

      if (healthIssues.length === 0) {
        this.state.health = HealthStatus.HEALTHY;
      } else if (healthIssues.length <= 2) {
        this.state.health = HealthStatus.DEGRADED;
      } else {
        this.state.health = HealthStatus.UNHEALTHY;
      }

      if (previousHealth !== this.state.health) {
        this.emit('health-changed', this.state.health);
        this.logger.info('Health status changed', {
          previous: previousHealth,
          current: this.state.health,
          issues: healthIssues
        });
      }

    } catch (error) {
      this.state.health = HealthStatus.CRITICAL;
      this.emit('health-changed', HealthStatus.CRITICAL);
      this.logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    const uptime = now - this.state.lastActivity.getTime();

    const completedTasks = this.taskHistory.filter(task => task.status === 'completed');
    const failedTasks = this.taskHistory.filter(task => task.status === 'failed');
    const totalTasks = completedTasks.length + failedTasks.length;

    const successRate = totalTasks > 0 ? completedTasks.length / totalTasks : 1;
    const errorRate = totalTasks > 0 ? failedTasks.length / totalTasks : 0;

    this.state.performance = {
      tasksPerSecond: this.calculateTasksPerSecond(),
      averageResponseTime: this.calculateAverageResponseTime(),
      successRate,
      errorRate,
      resourceEfficiency: this.calculateResourceEfficiency(),
      uptime,
      memoryEfficiency: this.calculateMemoryEfficiency()
    };

    this.state.resources = this.calculateResourceUsage();

    this.emit('metrics-updated', this.state.performance);
  }

  private calculateTasksPerSecond(): number {
    const recentTasks = this.taskHistory.filter(task =>
      task.completedAt && (Date.now() - task.completedAt.getTime()) < 60000
    );
    return recentTasks.length / 60;
  }

  private calculateAverageResponseTime(): number {
    const completedTasks = this.taskHistory.filter(task =>
      task.status === 'completed' && task.startedAt && task.completedAt
    );

    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      return sum + (task.completedAt!.getTime() - task.startedAt!.getTime());
    }, 0);

    return totalTime / completedTasks.length;
  }

  private calculateResourceEfficiency(): number {
    return 1 - (this.state.resources.memory / 100);
  }

  private calculateMemoryEfficiency(): number {
    return 1 - (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal);
  }

  private calculateResourceUsage(): ResourceUsage {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpu: (cpuUsage.user + cpuUsage.system) / 1000000,
      memory: memUsage.heapUsed,
      disk: 0,
      network: 0,
      tokens: 0
    };
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private startMetricsUpdate(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  private stopMetricsUpdate(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private async waitForTasksCompletion(timeout: number): Promise<void> {
    const startTime = Date.now();

    while (this.currentTasks.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.currentTasks.size > 0) {
      this.logger.warn('Timeout waiting for tasks to complete', { remainingTasks: this.currentTasks.size });
    }
  }
}