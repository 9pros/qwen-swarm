import EventEmitter from 'eventemitter3';
import { AgentLifecycleManager } from './agent-lifecycle';
import { ProviderManager } from '@/providers/manager';
import { CommunicationManager } from '@/communication/manager';
import { ConsensusManager } from '@/consensus/manager';
import { MemoryManager } from '@/memory/manager';
import { LearningManager } from '@/learning/manager';
import { SecurityManager } from '@/security/manager';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';
import type {
  AgentConfig,
  SystemConfig,
  AgentStatus,
  Task,
  SystemHealth,
  AgentState,
  ProviderMetrics,
  CommunicationMetrics,
  ConsensusMetrics
} from '@/types';

export interface OrchestratorEvents {
  'system:started': () => void;
  'system:stopped': () => void;
  'system:ready': () => void;
  'system:error': (error: Error) => void;
  'agent:registered': (agentId: string, config: AgentConfig) => void;
  'agent:unregistered': (agentId: string) => void;
  'task:assigned': (taskId: string, agentId: string) => void;
  'task:completed': (taskId: string, result: unknown) => void;
  'consensus:reached': (proposalId: string, result: unknown) => void;
  'learning:improvement': (improvementType: string, metric: number) => void;
  'security:alert': (alertType: string, details: unknown) => void;
  'health:changed': (health: SystemHealth) => void;
}

export interface SystemState {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  uptime: number;
  startTime: Date;
  lastActivity: Date;
  agents: AgentState[];
  health: SystemHealth;
  metrics: {
    agentCount: number;
    activeAgents: number;
    taskQueue: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export class SwarmOrchestrator extends EventEmitter<OrchestratorEvents> {
  private config: SystemConfig;
  private logger: Logger;
  private agentLifecycle: AgentLifecycleManager;
  private providerManager: ProviderManager;
  private communicationManager: CommunicationManager;
  private consensusManager: ConsensusManager;
  private memoryManager: MemoryManager;
  private learningManager: LearningManager;
  private securityManager: SecurityManager;

  private state: SystemState;
  private taskQueue: Task[] = [];
  private isRunning: boolean = false;
  private metricsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: SystemConfig) {
    super();

    this.config = config || ConfigManager.prototype.getDefaultConfig();
    this.logger = new Logger().withContext({ component: 'SwarmOrchestrator' });
    this.state = this.createInitialState();

    this.initializeManagers();
    this.setupEventHandlers();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Swarm Orchestrator', {
        name: this.config.system.name,
        version: this.config.system.version,
        environment: this.config.system.environment
      });

      this.state.status = 'starting';
      this.state.startTime = new Date();

      await this.initializeManagersAsync();
      await this.setupDefaultAgents();
      await this.setupDefaultProviders();
      await this.initializeCommunication();
      await this.initializeConsensus();
      await this.initializeSecurity();

      this.state.status = 'running';
      this.isRunning = true;

      this.startPeriodicTasks();

      this.logger.info('Swarm Orchestrator initialized successfully');
      this.emit('system:started');
      this.emit('system:ready');

    } catch (error) {
      this.state.status = 'error';
      this.logger.error('Failed to initialize Swarm Orchestrator', error instanceof Error ? error : new Error(String(error)));
      this.emit('system:error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Orchestrator is not running');
      return;
    }

    try {
      this.logger.info('Shutting down Swarm Orchestrator');
      this.state.status = 'stopping';
      this.isRunning = false;

      this.stopPeriodicTasks();

      const shutdownPromises = [
        this.agentLifecycle.shutdown(),
        this.providerManager.shutdown(),
        this.communicationManager.shutdown(),
        this.consensusManager.shutdown(),
        this.memoryManager.shutdown(),
        this.learningManager.shutdown(),
        this.securityManager.shutdown()
      ];

      await Promise.allSettled(shutdownPromises);

      this.state.status = 'stopped';
      this.taskQueue = [];

      this.logger.info('Swarm Orchestrator shutdown complete');
      this.emit('system:stopped');

    } catch (error) {
      this.logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async registerAgent(config: AgentConfig): Promise<string> {
    try {
      const agentId = await this.agentLifecycle.createAgent(config);
      await this.agentLifecycle.startAgent(agentId);

      this.state.agents.push(this.agentLifecycle.getAgentState(agentId)!);

      this.logger.info('Agent registered successfully', {
        agentId,
        name: config.name,
        type: config.type
      });

      this.emit('agent:registered', agentId, config);
      return agentId;

    } catch (error) {
      this.logger.error('Failed to register agent', error instanceof Error ? error : new Error(String(error)), { config });
      throw error;
    }
  }

  public async unregisterAgent(agentId: string, reason?: string): Promise<void> {
    try {
      await this.agentLifecycle.terminateAgent(agentId, reason);
      this.state.agents = this.state.agents.filter(agent => agent.id !== agentId);

      this.logger.info('Agent unregistered successfully', { agentId, reason });
      this.emit('agent:unregistered', agentId);

    } catch (error) {
      this.logger.error('Failed to unregister agent', error instanceof Error ? error : new Error(String(error)), { agentId });
      throw error;
    }
  }

  public async submitTask(task: Task): Promise<string> {
    try {
      this.taskQueue.push(task);
      this.state.metrics.taskQueue = this.taskQueue.length;
      this.state.lastActivity = new Date();

      await this.assignTaskToAgent(task);

      this.logger.debug('Task submitted', {
        taskId: task.id,
        type: task.type,
        priority: task.priority
      });

      this.emit('task:assigned', task.id, task.assignedAgent!);
      return task.id;

    } catch (error) {
      this.logger.error('Failed to submit task', error instanceof Error ? error : new Error(String(error)), { taskId: task.id });
      throw error;
    }
  }

  public async scaleAgents(type: 'queen' | 'worker' | 'specialist', targetCount: number): Promise<void> {
    try {
      await this.agentLifecycle.scaleAgentPool(type, targetCount);
      await this.updateSystemMetrics();

      this.logger.info('Agent scaling completed', { type, targetCount });

    } catch (error) {
      this.logger.error('Failed to scale agents', error instanceof Error ? error : new Error(String(error)), { type, targetCount });
      throw error;
    }
  }

  public getSystemState(): SystemState {
    this.updateSystemMetrics();
    return { ...this.state };
  }

  public getAgentStates(): AgentState[] {
    return this.agentLifecycle.getAllAgents().map(agent => agent.getState());
  }

  public getProviderMetrics(): Map<string, ProviderMetrics> {
    return this.providerManager.getAllProviderMetrics();
  }

  public getCommunicationMetrics(): CommunicationMetrics {
    return this.communicationManager.getMetrics();
  }

  public getConsensusMetrics(): ConsensusMetrics {
    return this.consensusManager.getMetrics();
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    const healthChecks = await Promise.allSettled([
      this.performAgentHealthCheck(),
      this.performProviderHealthCheck(),
      this.performCommunicationHealthCheck(),
      this.performSystemHealthCheck()
    ]);

    const agentHealth = healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : null;
    const providerHealth = healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : null;
    const communicationHealth = healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : null;
    const systemHealth = healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : null;

    return this.calculateSystemHealth(agentHealth, providerHealth, communicationHealth, systemHealth);
  }

  private initializeManagers(): void {
    this.agentLifecycle = new AgentLifecycleManager();
    this.providerManager = new ProviderManager();
    this.communicationManager = new CommunicationManager('orchestrator', this.config.websocket.port);
    this.consensusManager = new ConsensusManager();
    this.memoryManager = new MemoryManager();
    this.learningManager = new LearningManager();
    this.securityManager = new SecurityManager();
  }

  private async initializeManagersAsync(): Promise<void> {
    await this.memoryManager.initialize(this.config.database);
    await this.learningManager.initialize(this.config.learning);
    await this.securityManager.initialize(this.config.security);
  }

  private async setupDefaultAgents(): Promise<void> {
    const defaultAgents = [
      {
        id: 'queen-1',
        name: 'Primary Queen Agent',
        type: 'queen' as const,
        role: {
          type: 'strategic' as const,
          permissions: [],
          expertise: ['coordination', 'planning', 'decision-making'],
          priority: 10
        },
        provider: {
          type: 'qwen' as const,
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
        maxConcurrency: 1,
        memorySize: 50000,
        autoScale: true,
        healthCheckInterval: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMIT']
        },
        securityContext: this.config.security
      }
    ];

    for (const agentConfig of defaultAgents) {
      await this.registerAgent(agentConfig);
    }
  }

  private async setupDefaultProviders(): Promise<void> {
    const defaultProviders = [
      {
        id: 'qwen-primary',
        config: {
          type: 'qwen' as const,
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
        }
      }
    ];

    for (const provider of defaultProviders) {
      await this.providerManager.registerProvider(provider.id, provider.config);
    }
  }

  private async initializeCommunication(): Promise<void> {
    this.communicationManager.registerMessageHandler('task_assignment', async (message) => {
      this.logger.debug('Task assignment received', { messageId: message.id });
    });

    this.communicationManager.registerMessageHandler('health_check', async (message) => {
      await this.communicationManager.sendMessage(
        message.from as string,
        'health_response',
        await this.getSystemHealth()
      );
    });
  }

  private async initializeConsensus(): Promise<void> {
    this.consensusManager.on('proposal:resolved', async (proposal) => {
      this.logger.info('Consensus proposal resolved', {
        proposalId: proposal.id,
        status: proposal.status,
        result: proposal.result
      });

      if (proposal.status === 'accepted') {
        this.emit('consensus:reached', proposal.id, proposal.result);
      }
    });
  }

  private async initializeSecurity(): Promise<void> {
    this.securityManager.on('security:alert', (alertType, details) => {
      this.logger.warn('Security alert', { alertType, details });
      this.emit('security:alert', alertType, details);
    });
  }

  private setupEventHandlers(): void {
    this.agentLifecycle.on('agent:task-completed', (agentId, task) => {
      this.logger.debug('Task completed by agent', { agentId, taskId: task.id });
      this.emit('task:completed', task.id, task.result);
      this.processTaskQueue();
    });

    this.agentLifecycle.on('agent:failed', async (agentId, error) => {
      this.logger.error('Agent failure detected', error, { agentId });
      await this.handleAgentFailure(agentId, error);
    });

    this.learningManager.on('improvement', (improvementType, metric) => {
      this.logger.info('Learning improvement detected', { improvementType, metric });
      this.emit('learning:improvement', improvementType, metric);
    });
  }

  private async assignTaskToAgent(task: Task): Promise<void> {
    const suitableAgents = this.findSuitableAgents(task);

    if (suitableAgents.length === 0) {
      throw new Error(`No suitable agents found for task ${task.id}`);
    }

    const selectedAgent = suitableAgents[0];
    await this.agentLifecycle.assignTask(selectedAgent.id, task);
    task.assignedAgent = selectedAgent.id;
  }

  private findSuitableAgents(task: Task): any[] {
    const agents = this.agentLifecycle.getHealthyAgents();
    return agents.filter(agent =>
      agent.getStatus() === AgentStatus.IDLE ||
      (agent.getStatus() === AgentStatus.BUSY && agent.getState().currentTasks.length < agent.config.maxConcurrency)
    ).sort((a, b) => a.config.role.priority - b.config.role.priority);
  }

  private async processTaskQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];

      try {
        await this.assignTaskToAgent(task);
        this.taskQueue.shift();
        this.state.metrics.taskQueue = this.taskQueue.length;
      } catch (error) {
        this.logger.error('Failed to assign queued task', error instanceof Error ? error : new Error(String(error)), { taskId: task.id });
        break;
      }
    }
  }

  private async handleAgentFailure(agentId: string, error: Error): Promise<void> {
    try {
      await this.agentLifecycle.recover(agentId);
    } catch (recoveryError) {
      this.logger.error('Agent recovery failed', recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)), { agentId });

      const agent = this.agentLifecycle.getAgent(agentId);
      if (agent) {
        for (const task of agent.getState().currentTasks) {
          task.assignedAgent = undefined;
          this.taskQueue.push(task);
        }
      }
    }
  }

  private startPeriodicTasks(): void {
    this.metricsInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 10000);

    this.healthCheckInterval = setInterval(async () => {
      const health = await this.getSystemHealth();
      this.state.health = health;
      this.emit('health:changed', health);
    }, 30000);
  }

  private stopPeriodicTasks(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private updateSystemMetrics(): void {
    this.state.uptime = Date.now() - this.state.startTime.getTime();
    this.state.metrics.agentCount = this.agentLifecycle.getAllAgents().length;
    this.state.metrics.activeAgents = this.agentLifecycle.getHealthyAgents().length;
    this.state.metrics.taskQueue = this.taskQueue.length;
    this.state.lastActivity = new Date();
    this.state.agents = this.getAgentStates();
  }

  private async performAgentHealthCheck(): Promise<any> {
    const agents = this.agentLifecycle.getAllAgents();
    const healthyAgents = agents.filter(agent => agent.isHealthy());

    return {
      total: agents.length,
      healthy: healthyAgents.length,
      unhealthy: agents.length - healthyAgents.length,
      status: healthyAgents.length === agents.length ? 'healthy' : 'degraded'
    };
  }

  private async performProviderHealthCheck(): Promise<any> {
    const healthResults = await this.providerManager.performAllHealthChecks();
    const healthyCount = Array.from(healthResults.values()).filter(healthy => healthy).length;

    return {
      total: healthResults.size,
      healthy: healthyCount,
      unhealthy: healthResults.size - healthyCount,
      status: healthyCount === healthResults.size ? 'healthy' : 'degraded'
    };
  }

  private async performCommunicationHealthCheck(): Promise<any> {
    const metrics = this.communicationManager.getMetrics();
    const connections = this.communicationManager.getConnectedAgents();

    return {
      total: connections.length,
      messages: metrics.messagesSent + metrics.messagesReceived,
      errorRate: metrics.messagesSent > 0 ? metrics.messagesFailed / metrics.messagesSent : 0,
      status: metrics.errorRate < 0.05 ? 'healthy' : 'degraded'
    };
  }

  private async performSystemHealthCheck(): Promise<any> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: memUsage.heapUsed / memUsage.heapTotal,
      uptime: process.uptime(),
      status: 'healthy'
    };
  }

  private calculateSystemHealth(
    agentHealth: any,
    providerHealth: any,
    communicationHealth: any,
    systemHealth: any
  ): SystemHealth {
    const components = [
      { name: 'agents', ...agentHealth },
      { name: 'providers', ...providerHealth },
      { name: 'communication', ...communicationHealth },
      { name: 'system', ...systemHealth }
    ];

    const unhealthyComponents = components.filter(comp => comp.status !== 'healthy');
    const overallStatus = unhealthyComponents.length === 0 ? 'healthy' :
                         unhealthyComponents.length <= 1 ? 'degraded' : 'unhealthy';

    return {
      overall: overallStatus,
      components,
      alerts: [],
      metrics: {
        agentCount: this.state.metrics.agentCount,
        activeAgents: this.state.metrics.activeAgents,
        taskQueue: this.state.metrics.taskQueue,
        tasksPerSecond: 0,
        averageResponseTime: 0,
        memoryUsage: systemHealth.memory,
        cpuUsage: 0,
        networkLatency: 0,
        errorRate: communicationHealth.errorRate,
        uptime: this.state.uptime
      },
      lastAssessment: new Date()
    };
  }

  private createInitialState(): SystemState {
    return {
      status: 'stopped',
      uptime: 0,
      startTime: new Date(),
      lastActivity: new Date(),
      agents: [],
      health: {
        overall: 'unhealthy',
        components: [],
        alerts: [],
        metrics: {
          agentCount: 0,
          activeAgents: 0,
          taskQueue: 0,
          tasksPerSecond: 0,
          averageResponseTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkLatency: 0,
          errorRate: 0,
          uptime: 0
        },
        lastAssessment: new Date()
      },
      metrics: {
        agentCount: 0,
        activeAgents: 0,
        taskQueue: 0,
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0
      }
    };
  }
}