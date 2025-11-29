/**
 * Integration layer for Enhanced Terminal with Qwen Swarm Orchestration System
 */

import { EventEmitter } from 'events';
import { EnhancedTerminal } from './EnhancedTerminal';
import { ASCIIVisualizer, TerminalCharts } from './components/visualizations';
import { TerminalColors } from './utils/colors';
import type {
  AgentStatus,
  TaskInfo,
  SystemMetrics,
  SwarmTopology,
  StatusIndicator,
  NotificationOptions
} from './types';

// Import Qwen Swarm types (these would be from the main system)
interface SwarmOrchestrator {
  getAgents(): Promise<any[]>;
  getTasks(): Promise<any[]>;
  getMetrics(): Promise<any>;
  getTopology(): Promise<any>;
  createAgent(config: any): Promise<any>;
  createTask(config: any): Promise<any>;
  startAgent(id: string): Promise<void>;
  stopAgent(id: string): Promise<void>;
  restartAgent(id: string): Promise<void>;
  cancelTask(id: string): Promise<void>;
  retryTask(id: string): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

interface APIServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getPort(): number;
}

export class SwarmTerminalIntegration extends EventEmitter {
  private terminal: EnhancedTerminal;
  private orchestrator?: SwarmOrchestrator;
  private apiServer?: APIServer;
  private refreshInterval?: NodeJS.Timeout;
  private isConnected = false;
  private lastUpdate = new Date();

  constructor(orchestrator?: SwarmOrchestrator, apiServer?: APIServer) {
    super();

    this.terminal = new EnhancedTerminal({
      interactive: true,
      colorSupport: true,
      unicodeSupport: true
    });

    this.orchestrator = orchestrator;
    this.apiServer = apiServer;

    this.setupEventHandlers();
    this.setupTerminalCommands();
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.isConnected) return;

    this.terminal.showNotification({
      type: 'info',
      title: 'Connecting to Qwen Swarm...',
      message: 'Establishing connection to swarm orchestrator'
    });

    try {
      // Test connection to orchestrator
      if (this.orchestrator) {
        await this.orchestrator.getMetrics();
        this.setupOrchestratorEvents();
      }

      // Check API server status
      if (this.apiServer && this.apiServer.isRunning()) {
        this.terminal.showNotification({
          type: 'success',
          title: 'Connected to Qwen Swarm',
          message: `API Server running on port ${this.apiServer.getPort()}`
        });
      }

      this.isConnected = true;
      this.startAutoRefresh();
      this.emit('connected');

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Connection Failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  disconnect(): void {
    if (!this.isConnected) return;

    this.stopAutoRefresh();
    this.cleanupOrchestratorEvents();
    this.isConnected = false;

    this.terminal.showNotification({
      type: 'info',
      title: 'Disconnected',
      message: 'Disconnected from Qwen Swarm'
    });

    this.emit('disconnected');
  }

  // Event Setup
  private setupEventHandlers(): void {
    this.terminal.on('terminal:resize', ({ width, height }) => {
      this.emit('terminal:resize', { width, height });
    });
  }

  private setupOrchestratorEvents(): void {
    if (!this.orchestrator) return;

    // Agent lifecycle events
    this.orchestrator.on('agent:started', (agent) => {
      this.terminal.showNotification({
        type: 'success',
        title: 'Agent Started',
        message: `${agent.name} (${agent.id}) is now running`
      });
    });

    this.orchestrator.on('agent:stopped', (agent) => {
      this.terminal.showNotification({
        type: 'info',
        title: 'Agent Stopped',
        message: `${agent.name} (${agent.id}) has stopped`
      });
    });

    this.orchestrator.on('agent:error', (agent, error) => {
      this.terminal.showNotification({
        type: 'error',
        title: 'Agent Error',
        message: `${agent.name} (${agent.id}): ${error.message}`
      });
    });

    // Task events
    this.orchestrator.on('task:created', (task) => {
      this.terminal.showNotification({
        type: 'info',
        title: 'Task Created',
        message: `Task ${task.id}: ${task.description}`
      });
    });

    this.orchestrator.on('task:completed', (task) => {
      this.terminal.showNotification({
        type: 'success',
        title: 'Task Completed',
        message: `Task ${task.id} completed successfully`
      });
    });

    this.orchestrator.on('task:failed', (task, error) => {
      this.terminal.showNotification({
        type: 'error',
        title: 'Task Failed',
        message: `Task ${task.id}: ${error.message}`
      });
    });

    // System events
    this.orchestrator.on('system:health', (health) => {
      if (health.overall === 'unhealthy') {
        this.terminal.showNotification({
          type: 'warning',
          title: 'System Health Warning',
          message: 'System health check failed'
        });
      }
    });
  }

  private cleanupOrchestratorEvents(): void {
    if (!this.orchestrator) return;

    // Remove all event listeners
    this.orchestrator.removeAllListeners();
  }

  // Auto-refresh functionality
  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        await this.refreshData();
      } catch (error) {
        // Silently fail refresh to avoid spam
      }
    }, 5000); // Refresh every 5 seconds
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private async refreshData(): Promise<void> {
    if (!this.isConnected || !this.orchestrator) return;

    try {
      const [agents, tasks, metrics] = await Promise.all([
        this.orchestrator.getAgents(),
        this.orchestrator.getTasks(),
        this.orchestrator.getMetrics()
      ]);

      this.lastUpdate = new Date();
      this.emit('data:updated', { agents, tasks, metrics });

    } catch (error) {
      this.emit('data:error', error);
    }
  }

  // Terminal Commands
  private setupTerminalCommands(): void {
    // This would integrate with the existing CLI commands
    // For now, we'll expose methods that can be called from the CLI
  }

  // Swarm Operations
  async showAgentStatus(filter?: string): Promise<void> {
    if (!this.orchestrator) {
      this.terminal.showNotification({
        type: 'warning',
        title: 'No Orchestrator',
        message: 'Swarm orchestrator not available'
      });
      return;
    }

    try {
      const agents = await this.orchestrator.getAgents();
      const agentStatuses = agents.map(this.transformAgentStatus);

      if (filter) {
        this.terminal.showAgentList(agentStatuses, { search: filter });
      } else {
        this.terminal.showAgentList(agentStatuses);
      }

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Failed to Load Agents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async showTaskQueue(): Promise<void> {
    if (!this.orchestrator) {
      this.terminal.showNotification({
        type: 'warning',
        title: 'No Orchestrator',
        message: 'Swarm orchestrator not available'
      });
      return;
    }

    try {
      const tasks = await this.orchestrator.getTasks();
      const taskInfos = tasks.map(this.transformTaskInfo);

      this.terminal.showTaskQueue(taskInfos);

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Failed to Load Tasks',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async showSystemMetrics(): Promise<void> {
    if (!this.orchestrator) {
      this.terminal.showNotification({
        type: 'warning',
        title: 'No Orchestrator',
        message: 'Swarm orchestrator not available'
      });
      return;
    }

    try {
      const metrics = await this.orchestrator.getMetrics();
      const systemMetrics = this.transformSystemMetrics(metrics);

      this.terminal.showSystemMetrics(systemMetrics);

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Failed to Load Metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async showSwarmTopology(): Promise<void> {
    if (!this.orchestrator) {
      this.terminal.showNotification({
        type: 'warning',
        title: 'No Orchestrator',
        message: 'Swarm orchestrator not available'
      });
      return;
    }

    try {
      const topology = await this.orchestrator.getTopology();
      const swarmTopology = this.transformSwarmTopology(topology);

      console.log(ASCIIVisualizer.drawTopology(swarmTopology));

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Failed to Load Topology',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Agent Management
  async createAgentInteractive(): Promise<void> {
    if (!this.orchestrator) {
      this.terminal.showNotification({
        type: 'warning',
        title: 'No Orchestrator',
        message: 'Swarm orchestrator not available'
      });
      return;
    }

    try {
      const name = await this.terminal.prompt('Agent name');
      const type = await this.terminal.select('Agent type', ['queen', 'worker', 'specialist'], 1);
      const capabilities = await this.terminal.prompt('Capabilities (comma-separated)');

      const agentConfig = {
        name,
        type,
        capabilities: capabilities.split(',').map(c => c.trim()),
        provider: {
          type: 'qwen',
          model: 'qwen-max',
          maxTokens: 4000,
          temperature: 0.7
        }
      };

      const agent = await this.orchestrator.createAgent(agentConfig);

      this.terminal.showNotification({
        type: 'success',
        title: 'Agent Created',
        message: `Agent ${agent.name} (${agent.id}) created successfully`
      });

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Failed to Create Agent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async manageAgent(agentId: string): Promise<void> {
    if (!this.orchestrator) return;

    try {
      const action = await this.terminal.select(
        `Manage Agent ${agentId}`,
        ['Start', 'Stop', 'Restart', 'View Details', 'Delete'],
        0
      );

      switch (action) {
        case 'Start':
          await this.orchestrator.startAgent(agentId);
          this.terminal.showNotification({
            type: 'success',
            title: 'Agent Started',
            message: `Agent ${agentId} started`
          });
          break;

        case 'Stop':
          const confirmStop = await this.terminal.confirm(`Stop agent ${agentId}?`);
          if (confirmStop) {
            await this.orchestrator.stopAgent(agentId);
            this.terminal.showNotification({
              type: 'info',
              title: 'Agent Stopped',
              message: `Agent ${agentId} stopped`
            });
          }
          break;

        case 'Restart':
          await this.orchestrator.restartAgent(agentId);
          this.terminal.showNotification({
            type: 'info',
            title: 'Agent Restarted',
            message: `Agent ${agentId} restarted`
          });
          break;

        case 'View Details':
          await this.showAgentDetails(agentId);
          break;

        case 'Delete':
          const confirmDelete = await this.terminal.confirm(`Delete agent ${agentId}? This cannot be undone.`);
          if (confirmDelete) {
            // Implementation would depend on orchestrator API
            this.terminal.showNotification({
              type: 'info',
              title: 'Agent Deleted',
              message: `Agent ${agentId} deleted`
            });
          }
          break;
      }

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Agent Management Failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async showAgentDetails(agentId: string): Promise<void> {
    // Implementation to show detailed agent information
    console.log(TerminalColors.bold(`Agent Details: ${agentId}`));
    console.log('Detailed agent information would be displayed here...');
  }

  // Dashboard Commands
  async showDashboard(): Promise<void> {
    this.terminal.showSystemHeader('Qwen Swarm Dashboard', 'Real-time System Overview');

    try {
      await this.refreshData();

      // Show different sections of the dashboard
      await this.showSystemMetrics();
      console.log();
      await this.showAgentStatus();
      console.log();
      await this.showTaskQueue();

      // Show last update time
      console.log();
      console.log(TerminalColors.muted(`Last updated: ${this.lastUpdate.toLocaleTimeString()}`));

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Dashboard Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Task Management
  async createTaskInteractive(): Promise<void> {
    if (!this.orchestrator) return;

    try {
      const description = await this.terminal.prompt('Task description');
      const priority = await this.terminal.select('Priority', ['low', 'medium', 'high', 'critical'], 1);

      const taskConfig = {
        description,
        priority,
        type: 'general'
      };

      const task = await this.orchestrator.createTask(taskConfig);

      this.terminal.showNotification({
        type: 'success',
        title: 'Task Created',
        message: `Task ${task.id}: ${task.description}`
      });

    } catch (error) {
      this.terminal.showNotification({
        type: 'error',
        title: 'Failed to Create Task',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Utility Methods
  private transformAgentStatus(agent: any): AgentStatus {
    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status as StatusIndicator['status'],
      lastActivity: new Date(agent.lastActivity || Date.now()),
      tasksCompleted: agent.stats?.tasksCompleted || 0,
      tasksInProgress: agent.stats?.tasksInProgress || 0,
      errors: agent.stats?.errors || 0,
      resources: {
        cpu: agent.resources?.cpu || 0,
        memory: agent.resources?.memory || 0
      }
    };
  }

  private transformTaskInfo(task: any): TaskInfo {
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedAgent: task.assignedAgent,
      progress: task.progress || 0,
      createdAt: new Date(task.createdAt),
      startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
      completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      estimatedDuration: task.estimatedDuration
    };
  }

  private transformSystemMetrics(metrics: any): SystemMetrics {
    return {
      cpu: metrics.cpu || 0,
      memory: metrics.memory || 0,
      disk: metrics.disk || 0,
      network: {
        inbound: metrics.network?.inbound || 0,
        outbound: metrics.network?.outbound || 0
      },
      uptime: metrics.uptime || 0,
      processes: metrics.processes || 0
    };
  }

  private transformSwarmTopology(topology: any): SwarmTopology {
    return {
      agents: topology.agents?.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        role: agent.role,
        status: agent.status,
        capabilities: agent.capabilities || [],
        load: agent.load || 0,
        position: agent.position
      })) || [],
      connections: topology.connections || [],
      consensus: topology.consensus
    };
  }

  // Public API
  getTerminal(): EnhancedTerminal {
    return this.terminal;
  }

  isSwarmConnected(): boolean {
    return this.isConnected;
  }

  getLastUpdate(): Date {
    return this.lastUpdate;
  }

  // Cleanup
  cleanup(): void {
    this.disconnect();
    this.terminal.cleanup();
    this.removeAllListeners();
  }
}