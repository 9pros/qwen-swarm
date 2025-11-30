/**
 * Advanced Agent Status Manager for 10 Parallel Agents
 * Handles complex state management, performance tracking, and coordination
 */

import { EventEmitter } from 'events';
import { Agent, AgentStatus, SwarmMetrics } from './swarm-activity-display';

export interface AgentTask {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  dependencies: string[];
  startTime?: Date;
  endTime?: Date;
  progress: number;
}

export interface AgentPerformance {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  tasksCompleted: number;
  averageTaskDuration: number;
}

export interface AgentCommunication {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'broadcast' | 'coordination' | 'status';
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  delivered: boolean;
  responseRequired: boolean;
}

export class AgentStatusManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private agentTasks: Map<string, AgentTask[]> = new Map();
  private agentPerformance: Map<string, AgentPerformance> = new Map();
  private communications: AgentCommunication[] = [];
  private taskQueue: AgentTask[] = [];
  private coordinationMatrix: Map<string, Map<string, number>> = new Map();
  private performanceHistory: Map<string, number[]> = new Map();
  private lastUpdate = new Date();

  constructor() {
    super();
    this.initializeAgents();
    this.initializeCoordinationMatrix();
    this.startPerformanceMonitoring();
  }

  private initializeAgents(): void {
    const agentConfigs = [
      { id: 'queen', name: 'Queen Agent', emoji: '🧠', specialty: 'coordination' },
      { id: 'code', name: 'Code Agent', emoji: '💻', specialty: 'development' },
      { id: 'analysis', name: 'Analysis Agent', emoji: '📊', specialty: 'analysis' },
      { id: 'architecture', name: 'Architecture Agent', emoji: '🏗️', specialty: 'design' },
      { id: 'testing', name: 'Testing Agent', emoji: '🧪', specialty: 'quality' },
      { id: 'documentation', name: 'Documentation Agent', emoji: '📝', specialty: 'documentation' },
      { id: 'security', name: 'Security Agent', emoji: '🔒', specialty: 'security' },
      { id: 'performance', name: 'Performance Agent', emoji: '⚡', specialty: 'optimization' },
      { id: 'ui', name: 'UI/UX Agent', emoji: '🎨', specialty: 'design' },
      { id: 'integration', name: 'Integration Agent', emoji: '🔧', specialty: 'integration' }
    ];

    agentConfigs.forEach(config => {
      this.agents.set(config.id, {
        id: config.id,
        name: config.name,
        emoji: config.emoji,
        status: AgentStatus.IDLE,
        currentTask: 'Ready for tasks',
        progress: 0,
        messages: 0,
        lastActivity: new Date(),
        performance: 100
      });

      this.agentTasks.set(config.id, []);

      this.agentPerformance.set(config.id, {
        cpuUsage: 0,
        memoryUsage: 0,
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        successRate: 100,
        tasksCompleted: 0,
        averageTaskDuration: 0
      });

      this.performanceHistory.set(config.id, []);
    });
  }

  private initializeCoordinationMatrix(): void {
    const agentIds = Array.from(this.agents.keys());

    agentIds.forEach(fromId => {
      this.coordinationMatrix.set(fromId, new Map());
      agentIds.forEach(toId => {
        if (fromId !== toId) {
          this.coordinationMatrix.get(fromId)!.set(toId, 0);
        }
      });
    });
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.analyzeCoordinationPatterns();
      this.optimizeTaskDistribution();
    }, 1000);
  }

  public updateAgentStatus(agentId: string, status: AgentStatus, task?: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const previousStatus = agent.status;
    agent.status = status;
    agent.lastActivity = new Date();

    if (task) {
      agent.currentTask = task;
      if (status === AgentStatus.ACTIVE && previousStatus !== AgentStatus.ACTIVE) {
        agent.progress = 0;
      }
    }

    this.emit('agentStatusChanged', agentId, status, previousStatus);
  }

  public assignTask(agentId: string, task: AgentTask): boolean {
    const agent = this.agents.get(agentId);
    const agentTasks = this.agentTasks.get(agentId);

    if (!agent || !agentTasks || agent.status === AgentStatus.ERROR) {
      return false;
    }

    // Check dependencies
    const dependenciesMet = task.dependencies.every(dep =>
      this.isTaskCompleted(dep)
    );

    if (!dependenciesMet) {
      this.taskQueue.push(task);
      return false;
    }

    task.startTime = new Date();
    agentTasks.push(task);
    this.updateAgentStatus(agentId, AgentStatus.ACTIVE, task.name);

    this.emit('taskAssigned', agentId, task);
    return true;
  }

  public completeTask(agentId: string, taskId: string): void {
    const agentTasks = this.agentTasks.get(agentId);
    const agent = this.agents.get(agentId);
    const performance = this.agentPerformance.get(agentId);

    if (!agentTasks || !agent || !performance) return;

    const taskIndex = agentTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = agentTasks[taskIndex];
    task.endTime = new Date();
    task.progress = 100;

    // Update performance metrics
    const duration = task.endTime.getTime() - task.startTime!.getTime();
    performance.tasksCompleted++;
    performance.averageTaskDuration =
      (performance.averageTaskDuration * (performance.tasksCompleted - 1) + duration) /
      performance.tasksCompleted;

    // Update agent progress and status
    agentTasks.splice(taskIndex, 1);

    if (agentTasks.length === 0) {
      this.updateAgentStatus(agentId, AgentStatus.IDLE, 'Ready for tasks');
      agent.progress = 0;
    } else {
      agent.progress = agentTasks.reduce((sum, t) => sum + t.progress, 0) / agentTasks.length;
    }

    this.emit('taskCompleted', agentId, task);
    this.processTaskQueue();
  }

  public updateTaskProgress(agentId: string, taskId: string, progress: number): void {
    const agentTasks = this.agentTasks.get(agentId);
    const agent = this.agents.get(agentId);

    if (!agentTasks || !agent) return;

    const task = agentTasks.find(t => t.id === taskId);
    if (!task) return;

    task.progress = Math.max(0, Math.min(100, progress));
    agent.progress = agentTasks.reduce((sum, t) => sum + t.progress, 0) / agentTasks.length;

    this.emit('taskProgressUpdated', agentId, taskId, progress);
  }

  public sendCommunication(
    from: string,
    to: string,
    message: string,
    type: AgentCommunication['type'] = 'coordination',
    priority: AgentCommunication['priority'] = 'medium'
  ): void {
    const communication: AgentCommunication = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      type,
      message,
      timestamp: new Date(),
      priority,
      delivered: false,
      responseRequired: type === 'request'
    };

    this.communications.push(communication);

    // Update coordination matrix
    if (this.coordinationMatrix.has(from) && this.coordinationMatrix.get(from)!.has(to)) {
      const currentStrength = this.coordinationMatrix.get(from)!.get(to)!;
      this.coordinationMatrix.get(from)!.set(to, currentStrength + 1);
    }

    // Update agent message counts
    const fromAgent = this.agents.get(from);
    const toAgent = this.agents.get(to);

    if (fromAgent) fromAgent.messages++;
    if (toAgent) {
      toAgent.messages++;
      this.updateAgentStatus(to.id, AgentStatus.COMMUNICATING, `Processing: ${message.substring(0, 20)}...`);

      // Simulate communication processing
      setTimeout(() => {
        this.updateAgentStatus(to.id, AgentStatus.IDLE, 'Ready for tasks');
        communication.delivered = true;
      }, 100 + Math.random() * 200);
    }

    this.emit('communicationSent', communication);
  }

  public broadcastMessage(
    from: string,
    message: string,
    priority: AgentCommunication['priority'] = 'medium'
  ): void {
    const allAgentIds = Array.from(this.agents.keys()).filter(id => id !== from);

    allAgentIds.forEach(toId => {
      this.sendCommunication(from, toId, message, 'broadcast', priority);
    });

    // Update queen agent for coordination
    const queenAgent = this.agents.get('queen');
    if (queenAgent && from !== 'queen') {
      this.updateAgentStatus('queen', AgentStatus.COORDINATING, `Coordinating broadcast: ${message.substring(0, 20)}...`);
    }
  }

  private updatePerformanceMetrics(): void {
    const now = new Date();
    const timeDelta = (now.getTime() - this.lastUpdate.getTime()) / 1000;

    this.agents.forEach((agent, agentId) => {
      const performance = this.agentPerformance.get(agentId);
      const history = this.performanceHistory.get(agentId);

      if (!performance || !history) return;

      // Simulate performance metrics based on agent status and workload
      const agentTasks = this.agentTasks.get(agentId) || [];
      const workload = agentTasks.length;

      if (agent.status === AgentStatus.ACTIVE) {
        performance.cpuUsage = Math.min(100, 30 + workload * 15 + Math.random() * 20);
        performance.memoryUsage = Math.min(100, 40 + workload * 10 + Math.random() * 15);
        performance.responseTime = 50 + workload * 10 + Math.random() * 50;
        performance.throughput = Math.max(0, 100 - workload * 5 - Math.random() * 20);
      } else if (agent.status === AgentStatus.THINKING) {
        performance.cpuUsage = 20 + Math.random() * 30;
        performance.memoryUsage = 30 + Math.random() * 20;
        performance.responseTime = 100 + Math.random() * 100;
        performance.throughput = 50 + Math.random() * 30;
      } else {
        performance.cpuUsage = 5 + Math.random() * 10;
        performance.memoryUsage = 10 + Math.random() * 10;
        performance.responseTime = 10 + Math.random() * 20;
        performance.throughput = 90 + Math.random() * 10;
      }

      // Calculate overall performance score
      const cpuScore = Math.max(0, 100 - performance.cpuUsage);
      const memoryScore = Math.max(0, 100 - performance.memoryUsage);
      const responseScore = Math.max(0, 100 - performance.responseTime / 2);
      const throughputScore = performance.throughput;

      agent.performance = (cpuScore + memoryScore + responseScore + throughputScore) / 4;

      // Update performance history
      history.push(agent.performance);
      if (history.length > 60) { // Keep last 60 data points
        history.shift();
      }
    });

    this.lastUpdate = now;
  }

  private analyzeCoordinationPatterns(): void {
    // Analyze communication patterns and identify bottlenecks
    const communicationCounts = new Map<string, number>();

    this.communications.forEach(comm => {
      if (comm.timestamp.getTime() > Date.now() - 60000) { // Last minute
        communicationCounts.set(comm.from, (communicationCounts.get(comm.from) || 0) + 1);
      }
    });

    // Identify most active coordinators
    const sortedAgents = Array.from(communicationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (sortedAgents.length > 0) {
      this.emit('coordinationAnalysis', sortedAgents);
    }
  }

  private optimizeTaskDistribution(): void {
    // Find idle agents and assign queued tasks
    const queuedTasks = this.taskQueue.filter(task =>
      task.dependencies.every(dep => this.isTaskCompleted(dep))
    );

    if (queuedTasks.length === 0) return;

    const idleAgents = Array.from(this.agents.entries())
      .filter(([_, agent]) => agent.status === AgentStatus.IDLE)
      .map(([id, _]) => id);

    // Assign tasks to idle agents based on priority
    queuedTasks
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .forEach((task, index) => {
        if (index < idleAgents.length) {
          this.assignTask(idleAgents[index], task);
          const queueIndex = this.taskQueue.indexOf(task);
          if (queueIndex > -1) {
            this.taskQueue.splice(queueIndex, 1);
          }
        }
      });
  }

  private processTaskQueue(): void {
    // Try to assign queued tasks to newly available agents
    this.optimizeTaskDistribution();
  }

  private isTaskCompleted(taskId: string): boolean {
    for (const agentTasks of this.agentTasks.values()) {
      if (agentTasks.some(task => task.id === taskId && task.progress === 100)) {
        return true;
      }
    }
    return false;
  }

  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getAgentTasks(agentId: string): AgentTask[] {
    return this.agentTasks.get(agentId) || [];
  }

  public getAgentPerformance(agentId: string): AgentPerformance | undefined {
    return this.agentPerformance.get(agentId);
  }

  public getRecentCommunications(limit: number = 10): AgentCommunication[] {
    return this.communications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getCoordinationMatrix(): Map<string, Map<string, number>> {
    return this.coordinationMatrix;
  }

  public getPerformanceHistory(agentId: string): number[] {
    return this.performanceHistory.get(agentId) || [];
  }

  public calculateSwarmMetrics(): SwarmMetrics {
    const agents = this.getAllAgents();
    const activeAgents = agents.filter(a => a.status !== AgentStatus.IDLE);
    const totalMessages = agents.reduce((sum, a) => sum + a.messages, 0);
    const averagePerformance = agents.reduce((sum, a) => sum + a.performance, 0) / agents.length;

    // Calculate consensus based on communication patterns
    const recentCommunications = this.getRecentCommunications(20);
    const consensusLevel = Math.min(100, 50 + recentCommunications.length * 2.5);

    // Calculate efficiency based on active agents and performance
    const efficiency = (activeAgents.length / agents.length) * averagePerformance;

    const activeTasks = agents.reduce((sum, a) => {
      const tasks = this.getAgentTasks(a.id);
      return sum + tasks.filter(t => t.progress < 100).length;
    }, 0);

    const completedTasks = agents.reduce((sum, a) => {
      const performance = this.getAgentPerformance(a.id);
      return sum + (performance?.tasksCompleted || 0);
    }, 0);

    return {
      totalMessages,
      consensusLevel,
      efficiency,
      activeTasks,
      completedTasks,
      averagePerformance,
      communicationFlow: recentCommunications.map(c => ({
        from: c.from,
        to: c.to,
        message: c.message
      }))
    };
  }

  public simulateError(agentId: string, error: string): void {
    this.updateAgentStatus(agentId, AgentStatus.ERROR, error);

    const performance = this.agentPerformance.get(agentId);
    if (performance) {
      performance.errorRate = Math.min(100, performance.errorRate + 10);
      performance.successRate = Math.max(0, performance.successRate - 10);
    }

    this.emit('agentError', agentId, error);

    // Auto-recovery after 3 seconds
    setTimeout(() => {
      this.updateAgentStatus(agentId, AgentStatus.IDLE, 'Recovered from error');
    }, 3000);
  }

  public reset(): void {
    this.communications = [];
    this.taskQueue = [];

    this.agents.forEach(agent => {
      agent.status = AgentStatus.IDLE;
      agent.currentTask = 'Ready for tasks';
      agent.progress = 0;
      agent.messages = 0;
      agent.performance = 100;
      agent.lastActivity = new Date();
    });

    this.agentTasks.forEach(tasks => {
      tasks.length = 0;
    });

    this.agentPerformance.forEach(performance => {
      performance.cpuUsage = 0;
      performance.memoryUsage = 0;
      performance.responseTime = 0;
      performance.throughput = 100;
      performance.errorRate = 0;
      performance.successRate = 100;
      performance.tasksCompleted = 0;
      performance.averageTaskDuration = 0;
    });

    this.performanceHistory.forEach(history => {
      history.length = 0;
    });

    this.emit('systemReset');
  }
}