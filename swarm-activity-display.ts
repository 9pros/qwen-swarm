/**
 * Real-time Swarm Activity Display System for Qwen Code CLI
 * Visualizes 10 parallel agents working in perfect harmony
 */

import { EventEmitter } from 'events';

export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  THINKING = 'thinking',
  ERROR = 'error',
  COORDINATING = 'coordinating',
  COMMUNICATING = 'communicating'
}

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: AgentStatus;
  currentTask: string;
  progress: number;
  messages: number;
  lastActivity: Date;
  performance: number;
}

export interface SwarmMetrics {
  totalMessages: number;
  consensusLevel: number;
  efficiency: number;
  activeTasks: number;
  completedTasks: number;
  averagePerformance: number;
  communicationFlow: Array<{ from: string; to: string; message: string }>;
}

export class SwarmActivityDisplay extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private metrics: SwarmMetrics;
  private isVisible = true;
  private isCollapsed = false;
  private terminalWidth = 120;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeAgents();
    this.metrics = {
      totalMessages: 0,
      consensusLevel: 100,
      efficiency: 100,
      activeTasks: 0,
      completedTasks: 0,
      averagePerformance: 100,
      communicationFlow: []
    };
    this.setupTerminalHandling();
  }

  private initializeAgents(): void {
    const agentConfigs = [
      { id: 'queen', name: 'Queen Agent', emoji: '🧠' },
      { id: 'code', name: 'Code Agent', emoji: '💻' },
      { id: 'analysis', name: 'Analysis Agent', emoji: '📊' },
      { id: 'architecture', name: 'Architecture Agent', emoji: '🏗️' },
      { id: 'testing', name: 'Testing Agent', emoji: '🧪' },
      { id: 'documentation', name: 'Documentation Agent', emoji: '📝' },
      { id: 'security', name: 'Security Agent', emoji: '🔒' },
      { id: 'performance', name: 'Performance Agent', emoji: '⚡' },
      { id: 'ui', name: 'UI/UX Agent', emoji: '🎨' },
      { id: 'integration', name: 'Integration Agent', emoji: '🔧' }
    ];

    agentConfigs.forEach(config => {
      this.agents.set(config.id, {
        ...config,
        status: AgentStatus.IDLE,
        currentTask: 'Ready',
        progress: 0,
        messages: 0,
        lastActivity: new Date(),
        performance: 100
      });
    });
  }

  private setupTerminalHandling(): void {
    process.stdout.on('resize', () => {
      this.terminalWidth = process.stdout.columns || 120;
      this.render();
    });

    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  public startRealTimeUpdates(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.render();
    }, 100);
  }

  public stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public updateAgent(agentId: string, updates: Partial<Agent>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, updates);
      agent.lastActivity = new Date();
      this.emit('agentUpdated', agentId, agent);
    }
  }

  public addCommunication(from: string, to: string, message: string): void {
    this.metrics.communicationFlow.push({ from, to, message });
    this.metrics.totalMessages++;

    const fromAgent = this.agents.get(from);
    const toAgent = this.agents.get(to);

    if (fromAgent) fromAgent.messages++;
    if (toAgent) toAgent.messages++;

    this.emit('communicationAdded', from, to, message);
  }

  public setConsensus(level: number): void {
    this.metrics.consensusLevel = Math.max(0, Math.min(100, level));
  }

  public setEfficiency(efficiency: number): void {
    this.metrics.efficiency = Math.max(0, Math.min(100, efficiency));
  }

  public incrementActiveTasks(): void {
    this.metrics.activeTasks++;
  }

  public incrementCompletedTasks(): void {
    this.metrics.activeTasks--;
    this.metrics.completedTasks++;
  }

  private updateMetrics(): void {
    const agents = Array.from(this.agents.values());
    this.metrics.averagePerformance = agents.reduce((sum, agent) => sum + agent.performance, 0) / agents.length;

    // Simulate some dynamic activity
    agents.forEach(agent => {
      if (agent.status === AgentStatus.ACTIVE && agent.progress < 100) {
        agent.progress = Math.min(100, agent.progress + Math.random() * 5);
      }
    });
  }

  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.render();
    } else {
      this.clear();
    }
  }

  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  public render(): void {
    if (!this.isVisible) return;

    this.clear();
    const output = this.generateDisplay();
    process.stdout.write(output);
  }

  private clear(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  private generateDisplay(): string {
    if (this.isCollapsed) {
      return this.generateCollapsedView();
    }

    return [
      this.generateHeader(),
      this.generateAgentsDisplay(),
      this.generateMetricsRow(),
      this.generateCommunicationFlow()
    ].join('\n') + '\n';
  }

  private generateHeader(): string {
    const timestamp = new Date().toLocaleTimeString();
    const title = `🚀 QWEN SWARM ACTIVITY - ${timestamp} 🚀`;
    const border = '='.repeat(this.terminalWidth);

    return [
      this.colorize(border, 'cyan'),
      this.colorize(this.centerText(title), 'bold'),
      this.colorize(border, 'cyan')
    ].join('\n');
  }

  private generateAgentsDisplay(): string {
    const agents = Array.from(this.agents.values());
    const rows = [];

    // First row: 5 agents
    const firstRow = agents.slice(0, 5).map(agent => this.generateAgentBlock(agent)).join(' ');
    rows.push(firstRow);

    // Second row: 5 agents
    const secondRow = agents.slice(5, 10).map(agent => this.generateAgentBlock(agent)).join(' ');
    rows.push(secondRow);

    return rows.join('\n');
  }

  private generateAgentBlock(agent: Agent): string {
    const statusColor = this.getStatusColor(agent.status);
    const statusIcon = this.getStatusIcon(agent.status);
    const progressBar = this.generateProgressBar(agent.progress);

    const block = [
      `${agent.emoji} ${agent.name}`,
      `${statusIcon} ${this.colorize(agent.status.toUpperCase(), statusColor)}`,
      `📋 ${this.truncateText(agent.currentTask, 15)}`,
      `${progressBar} ${agent.progress.toFixed(0)}%`,
      `💬 ${agent.messages} | ⚡ ${agent.performance.toFixed(0)}`
    ];

    return this.boxText(block.join('\n'), statusColor);
  }

  private generateMetricsRow(): string {
    const consensusBar = this.generateConsensusBar(this.metrics.consensusLevel);
    const efficiencyIcons = '⚡'.repeat(Math.ceil(this.metrics.efficiency / 20));

    const metrics = [
      `💬 Messages: ${this.colorize(this.metrics.totalMessages.toString(), 'yellow')} active`,
      `🤝 Consensus: ${consensusBar} ${this.metrics.consensusLevel.toFixed(0)}%`,
      `⚡ Efficiency: ${this.colorize(efficiencyIcons, 'green')}`,
      `📋 Tasks: ${this.colorize(this.metrics.activeTasks.toString(), 'blue')} active, ${this.colorize(this.metrics.completedTasks.toString(), 'green')} completed`,
      `📊 Performance: ${this.colorize(this.metrics.averagePerformance.toFixed(1) + '%', 'magenta')}`
    ];

    return `\n${this.colorize('═'.repeat(this.terminalWidth), 'cyan')}\n${
      metrics.map(metric => this.colorize(`[${metric}]`, 'white')).join(' ')
    }`;
  }

  private generateCommunicationFlow(): string {
    const recentComm = this.metrics.communicationFlow.slice(-3);
    if (recentComm.length === 0) return '';

    const commDisplay = recentComm.map(comm => {
      const fromAgent = this.agents.get(comm.from);
      const toAgent = this.agents.get(comm.to);
      return `${fromAgent?.emoji} → ${toAgent?.emoji}: ${this.truncateText(comm.message, 30)}`;
    }).join(' | ');

    return `\n${this.colorize('🔄 Recent Communication:', 'cyan')} ${commDisplay}`;
  }

  private generateProgressBar(progress: number): string {
    const barLength = 10;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  private generateConsensusBar(level: number): string {
    const barLength = 10;
    const filled = Math.round((level / 100) * barLength);
    const empty = barLength - filled;
    const color = level >= 80 ? 'green' : level >= 50 ? 'yellow' : 'red';
    return this.colorize(`[${'█'.repeat(filled)}${'░'.repeat(empty)}]`, color);
  }

  private getStatusColor(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.ACTIVE: return 'green';
      case AgentStatus.THINKING: return 'yellow';
      case AgentStatus.ERROR: return 'red';
      case AgentStatus.COORDINATING: return 'blue';
      case AgentStatus.COMMUNICATING: return 'magenta';
      default: return 'gray';
    }
  }

  private getStatusIcon(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.ACTIVE: return '🟢';
      case AgentStatus.THINKING: return '🟡';
      case AgentStatus.ERROR: return '🔴';
      case AgentStatus.COORDINATING: return '🔵';
      case AgentStatus.COMMUNICATING: return '🟣';
      default: return '⚪';
    }
  }

  private boxText(text: string, color: string): string {
    const lines = text.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const border = '─'.repeat(maxLineLength + 2);

    const boxed = [
      `┌${border}┐`,
      ...lines.map(line => `│ ${this.colorize(line.padEnd(maxLineLength), color)} │`),
      `└${border}┘`
    ];

    return boxed.join('\n');
  }

  private centerText(text: string): string {
    const padding = Math.max(0, this.terminalWidth - text.length) / 2;
    return ' '.repeat(Math.floor(padding)) + text + ' '.repeat(Math.ceil(padding));
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private colorize(text: string, color: string): string {
    const colors: { [key: string]: string } = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      bold: '\x1b[1m',
      reset: '\x1b[0m'
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  private generateCollapsedView(): string {
    const activeAgents = Array.from(this.agents.values()).filter(a => a.status !== AgentStatus.IDLE);
    const activeCount = activeAgents.length;
    const efficiencyIcons = '⚡'.repeat(Math.ceil(this.metrics.efficiency / 20));

    return `${this.colorize('🚀 SWARM:', 'cyan')} ${activeCount}/10 agents active | ${efficiencyIcons} | Messages: ${this.metrics.totalMessages}`;
  }

  public cleanup(): void {
    this.stopRealTimeUpdates();
    this.clear();
  }

  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getMetrics(): SwarmMetrics {
    return { ...this.metrics };
  }
}