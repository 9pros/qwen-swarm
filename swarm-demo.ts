#!/usr/bin/env node

/**
 * Qwen Code CLI - Real-time Swarm Activity Display Demo
 * Shows 10 parallel agents working in perfect harmony with beautiful visualization
 */

import { SwarmActivityDisplay, AgentStatus } from './swarm-activity-display';
import { AgentStatusManager, AgentTask } from './agent-status-manager';
import { VisualRenderer, RenderConfig } from './visual-renderer';
import { CommunicationFlowVisualizer } from './communication-flow-visualizer';
import { PerformanceMetrics } from './performance-metrics';
import { ConsensusMeter } from './consensus-meter';

class SwarmDemo {
  private swarmDisplay: SwarmActivityDisplay;
  private statusManager: AgentStatusManager;
  private visualRenderer: VisualRenderer;
  private communicationVisualizer: CommunicationFlowVisualizer;
  private performanceMetrics: PerformanceMetrics;
  private consensusMeter: ConsensusMeter;
  private isRunning = true;
  private demoMode: 'full' | 'compact' | 'minimal' = 'full';
  private animationFrame = 0;

  constructor() {
    console.log('\x1b[2J\x1b[H'); // Clear screen
    console.log('\x1b[?25l'); // Hide cursor

    // Initialize all components
    this.swarmDisplay = new SwarmActivityDisplay();
    this.statusManager = new AgentStatusManager();
    this.visualRenderer = new VisualRenderer({
      terminalWidth: process.stdout.columns || 120,
      terminalHeight: process.stdout.rows || 30,
      colorScheme: 'default',
      animationSpeed: 'normal',
      compactMode: false,
      showPerformance: true,
      showCommunication: true,
      showProgressBars: true,
      showIcons: true
    });
    this.communicationVisualizer = new CommunicationFlowVisualizer(60, 15);
    this.performanceMetrics = new PerformanceMetrics();
    this.consensusMeter = new ConsensusMeter();

    this.setupEventHandlers();
    this.startDemo();
  }

  private setupEventHandlers(): void {
    // Handle terminal resize
    process.stdout.on('resize', () => {
      const width = process.stdout.columns || 120;
      const height = process.stdout.rows || 30;

      this.visualRenderer.updateConfig({ terminalWidth: width, terminalHeight: height });
      this.communicationVisualizer.updateDimensions(width - 20, 12);
    });

    // Handle keyboard input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
      switch (key.toString()) {
        case 'q':
        case '\u0003': // Ctrl+C
          this.shutdown();
          break;
        case ' ':
          this.swarmDisplay.toggleVisibility();
          break;
        case 'c':
          this.swarmDisplay.toggleCollapse();
          break;
        case 'm':
          this.cycleDemoMode();
          break;
        case 's':
          this.triggerScenario();
          break;
        case 'v':
          this.triggerVotingRound();
          break;
        case 'e':
          this.triggerEmergencyScenario();
          break;
        case 'r':
          this.statusManager.reset();
          break;
      }
    });
  }

  private cycleDemoMode(): void {
    const modes: Array<'full' | 'compact' | 'minimal'> = ['full', 'compact', 'minimal'];
    const currentIndex = modes.indexOf(this.demoMode);
    this.demoMode = modes[(currentIndex + 1) % modes.length];

    this.visualRenderer.updateConfig({
      compactMode: this.demoMode === 'compact' || this.demoMode === 'minimal',
      showPerformance: this.demoMode !== 'minimal',
      showCommunication: this.demoMode === 'full'
    });
  }

  private startDemo(): void {
    console.log(this.visualRenderer.colorize(
      '\n🚀 STARTING QWEN SWARM ACTIVITY DEMO\n' +
      'Controls: [Space] Toggle | [C] Collapse | [M] Mode | [S] Scenario | [V] Vote | [E] Emergency | [R] Reset | [Q] Quit\n',
      'cyan'
    ));

    // Start real-time updates
    this.swarmDisplay.startRealTimeUpdates();

    // Start demo scenarios
    setTimeout(() => this.startBasicActivity(), 1000);
    setTimeout(() => this.startComplexScenario(), 5000);
    setTimeout(() => this.startCommunicationFlow(), 8000);
    setTimeout(() => this.startPerformanceMonitoring(), 10000);
    setTimeout(() => this.startVotingSimulation(), 15000);

    // Main render loop
    this.renderLoop();

    // Periodic scenario triggers
    setInterval(() => this.triggerRandomScenario(), 20000);
    setInterval(() => this.updateAgentActivity(), 1000);
  }

  private async startBasicActivity(): Promise<void> {
    console.log(this.visualRenderer.colorize('\n🎬 Initializing basic agent activity...', 'yellow'));

    const agents = this.statusManager.getAllAgents();

    // Start with simple tasks
    const basicTasks: AgentTask[] = [
      {
        id: 'task_init_1',
        name: 'System Initialization',
        description: 'Initialize swarm coordination system',
        priority: 'high',
        estimatedDuration: 3000,
        dependencies: [],
        progress: 0
      },
      {
        id: 'task_init_2',
        name: 'Load Configuration',
        description: 'Load swarm configuration parameters',
        priority: 'high',
        estimatedDuration: 2000,
        dependencies: ['task_init_1'],
        progress: 0
      },
      {
        id: 'task_init_3',
        name: 'Establish Communication',
        description: 'Setup inter-agent communication channels',
        priority: 'high',
        estimatedDuration: 2500,
        dependencies: ['task_init_2'],
        progress: 0
      }
    ];

    // Assign tasks to different agents
    const agentIds = ['queen', 'code', 'architecture'];
    basicTasks.forEach((task, index) => {
      this.statusManager.assignTask(agentIds[index], task);
    });
  }

  private async startComplexScenario(): Promise<void> {
    console.log(this.visualRenderer.colorize('\n🎭 Starting complex swarm scenario...', 'magenta'));

    // Create a complex multi-agent task scenario
    const complexTasks: AgentTask[] = [
      {
        id: 'task_analysis_1',
        name: 'Code Analysis',
        description: 'Analyze existing codebase for optimization opportunities',
        priority: 'medium',
        estimatedDuration: 5000,
        dependencies: [],
        progress: 0
      },
      {
        id: 'task_architecture_1',
        name: 'Architecture Review',
        description: 'Review system architecture for scalability',
        priority: 'medium',
        estimatedDuration: 4000,
        dependencies: [],
        progress: 0
      },
      {
        id: 'task_security_1',
        name: 'Security Audit',
        description: 'Perform comprehensive security assessment',
        priority: 'high',
        estimatedDuration: 6000,
        dependencies: [],
        progress: 0
      },
      {
        id: 'task_testing_1',
        name: 'Test Suite Update',
        description: 'Update test suite with new test cases',
        priority: 'medium',
        estimatedDuration: 4500,
        dependencies: ['task_analysis_1'],
        progress: 0
      },
      {
        id: 'task_docs_1',
        name: 'Documentation Update',
        description: 'Update technical documentation',
        priority: 'low',
        estimatedDuration: 3000,
        dependencies: ['task_testing_1'],
        progress: 0
      }
    ];

    // Assign tasks to specialized agents
    const taskAssignments = {
      'task_analysis_1': 'analysis',
      'task_architecture_1': 'architecture',
      'task_security_1': 'security',
      'task_testing_1': 'testing',
      'task_docs_1': 'documentation'
    };

    Object.entries(taskAssignments).forEach(([taskId, agentId]) => {
      const task = complexTasks.find(t => t.id === taskId);
      if (task) {
        this.statusManager.assignTask(agentId, task);
      }
    });

    // Start communications between agents
    setTimeout(() => {
      this.statusManager.sendCommunication('analysis', 'architecture', 'Found optimization opportunities in module structure');
      this.statusManager.sendCommunication('security', 'testing', 'Security findings require additional test coverage');
      this.statusManager.sendCommunication('queen', 'analysis', 'Provide performance impact assessment');
    }, 1000);
  }

  private async startCommunicationFlow(): Promise<void> {
    console.log(this.visualRenderer.colorize('\n💬 Initiating communication flow simulation...', 'cyan'));

    // Simulate active communication between agents
    const communications = [
      { from: 'queen', to: 'code', message: 'Prioritize performance optimization tasks' },
      { from: 'code', to: 'performance', message: 'Need analysis of current bottlenecks' },
      { from: 'performance', to: 'code', message: 'Identified 3 critical optimization areas' },
      { from: 'analysis', to: 'architecture', message: 'Architecture analysis complete' },
      { from: 'architecture', to: 'ui', message: 'New component design patterns available' },
      { from: 'ui', to: 'documentation', message: 'UI components documented and ready' },
      { from: 'testing', to: 'code', message: 'Test coverage at 85%, need edge cases' },
      { from: 'security', to: 'integration', message: 'Security protocols updated for API endpoints' },
      { from: 'integration', to: 'performance', message: 'API integration performance metrics ready' },
      { from: 'performance', to: 'queen', message: 'Swarm efficiency at 87%' }
    ];

    // Send communications with delays
    communications.forEach((comm, index) => {
      setTimeout(() => {
        this.statusManager.sendCommunication(comm.from, comm.to, comm.message);
      }, index * 800);
    });

    // Broadcast message from queen
    setTimeout(() => {
      this.statusManager.broadcastMessage('queen', 'Swarm coordination optimization complete - all systems operational');
    }, communications.length * 800);
  }

  private async startPerformanceMonitoring(): Promise<void> {
    console.log(this.visualRenderer.colorize('\n📊 Activating performance monitoring...', 'green'));

    // Simulate performance data updates
    const agents = this.statusManager.getAllAgents();

    setInterval(() => {
      agents.forEach(agent => {
        const performance = this.statusManager.getAgentPerformance(agent.id);
        if (performance) {
          // Simulate realistic performance variations
          const cpuMultiplier = agent.status === AgentStatus.ACTIVE ? 1.5 : 0.5;
          performance.cpuUsage = Math.min(100, performance.cpuUsage * cpuMultiplier + (Math.random() - 0.5) * 10);
          performance.memoryUsage = Math.min(100, performance.memoryUsage + (Math.random() - 0.5) * 5);
          performance.responseTime = Math.max(10, performance.responseTime + (Math.random() - 0.5) * 20);
          performance.throughput = Math.max(0, Math.min(100, performance.throughput + (Math.random() - 0.5) * 10));

          this.performanceMetrics.updateAgentPerformance(agent.id, performance);
        }
      });
    }, 2000);
  }

  private async startVotingSimulation(): Promise<void> {
    console.log(this.visualRenderer.colorize('\n🗳️  Starting consensus voting simulation...', 'yellow'));

    const agents = this.statusManager.getAllAgents();
    this.consensusMeter.simulateVotingRound(agents);

    // Start periodic voting
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance
        this.consensusMeter.simulateVotingRound(agents);
      }
    }, 25000);
  }

  private updateAgentActivity(): void {
    const agents = this.statusManager.getAllAgents();
    const swarmMetrics = this.statusManager.calculateSwarmMetrics();

    // Update swarm display with current metrics
    this.swarmDisplay.setConsensus(swarmMetrics.consensusLevel);
    this.swarmDisplay.setEfficiency(swarmMetrics.efficiency);
    this.swarmDisplay.incrementActiveTasks();
    this.swarmDisplay.incrementCompletedTasks();

    // Update system performance metrics
    this.performanceMetrics.updateSystemMetrics(
      swarmMetrics.averagePerformance,
      swarmMetrics.consensusLevel,
      swarmMetrics.efficiency
    );

    // Randomly update agent statuses to simulate activity
    agents.forEach(agent => {
      if (Math.random() > 0.8) { // 20% chance of status change
        const statuses: AgentStatus[] = [
          AgentStatus.ACTIVE,
          AgentStatus.THINKING,
          AgentStatus.COORDINATING,
          AgentStatus.COMMUNICATING,
          AgentStatus.IDLE
        ];

        // Weight status probabilities
        const weights = [0.4, 0.2, 0.15, 0.15, 0.1];
        const newStatus = this.weightedRandomChoice(statuses, weights);

        const taskNames = [
          'Processing data',
          'Analyzing patterns',
          'Optimizing performance',
          'Coordinating tasks',
          'Generating insights',
          'Validating results',
          'Communicating updates',
          'Monitoring systems',
          'Handling requests',
          'Ready for tasks'
        ];

        const taskName = newStatus === AgentStatus.IDLE ?
          'Ready for tasks' :
          taskNames[Math.floor(Math.random() * taskNames.length)];

        this.statusManager.updateAgentStatus(agent.id, newStatus, taskName);
      }
    });

    // Update task progress
    const agentIds = ['queen', 'code', 'analysis', 'architecture', 'testing'];
    agentIds.forEach(agentId => {
      const tasks = this.statusManager.getAgentTasks(agentId);
      tasks.forEach(task => {
        if (task.progress < 100) {
          const progressIncrement = Math.random() * 15;
          const newProgress = Math.min(100, task.progress + progressIncrement);
          this.statusManager.updateTaskProgress(agentId, task.id, newProgress);

          if (newProgress >= 100) {
            this.statusManager.completeTask(agentId, task.id);
          }
        }
      });
    });
  }

  private triggerRandomScenario(): void {
    const scenarios = [
      () => this.triggerHighLoadScenario(),
      () => this.triggerCommunicationBurst(),
      () => this.triggerConsensusChallenge(),
      () => this.triggerPerformanceTest(),
      () => this.triggerErrorRecovery()
    ];

    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    randomScenario();
  }

  private triggerHighLoadScenario(): void {
    console.log(this.visualRenderer.colorize('\n⚡ High Load Scenario Triggered!', 'yellow'));

    // Assign multiple tasks to multiple agents
    const agents = ['code', 'performance', 'integration', 'testing', 'analysis'];
    const tasks: AgentTask[] = agents.map((agentId, index) => ({
      id: `highload_task_${Date.now()}_${index}`,
      name: `High Priority Task ${index + 1}`,
      description: 'Emergency system optimization required',
      priority: 'critical' as const,
      estimatedDuration: 3000,
      dependencies: [],
      progress: 0
    }));

    agents.forEach((agentId, index) => {
      this.statusManager.assignTask(agentId, tasks[index]);
    });
  }

  private triggerCommunicationBurst(): void {
    console.log(this.visualRenderer.colorize('\n💥 Communication Burst Scenario!', 'cyan'));

    const agents = this.statusManager.getAllAgents();
    const agentIds = agents.map(a => a.id);

    // Create communication burst
    for (let i = 0; i < 15; i++) {
      const from = agentIds[Math.floor(Math.random() * agentIds.length)];
      let to = agentIds[Math.floor(Math.random() * agentIds.length)];

      // Ensure different agents
      while (to === from) {
        to = agentIds[Math.floor(Math.random() * agentIds.length)];
      }

      const messages = [
        'System update available',
        'Performance optimization needed',
        'Security patch required',
        'New task assigned',
        'Coordination request',
        'Status update complete',
        'Analysis results ready',
        'Integration test passed'
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];

      setTimeout(() => {
        this.statusManager.sendCommunication(from, to, message);
      }, i * 200);
    }
  }

  private triggerConsensusChallenge(): void {
    console.log(this.visualRenderer.colorize('\n🤔 Consensus Challenge Triggered!', 'magenta'));

    const agents = this.statusManager.getAllAgents();
    this.consensusMeter.simulateVotingRound(agents);
  }

  private triggerPerformanceTest(): void {
    console.log(this.visualRenderer.colorize('\n🏃 Performance Test Scenario!', 'green'));

    // Simulate high-performance activity
    const agents = ['performance', 'code', 'integration'];
    agents.forEach(agentId => {
      this.statusManager.updateAgentStatus(agentId, AgentStatus.ACTIVE, 'Performance testing in progress');
    });
  }

  private triggerErrorRecovery(): void {
    console.log(this.visualRenderer.colorize('\n🚨 Error Recovery Scenario!', 'red'));

    // Simulate errors and recovery
    const errorAgents = ['code', 'integration', 'security'];
    errorAgents.forEach((agentId, index) => {
      setTimeout(() => {
        this.statusManager.simulateError(agentId, `Simulated error in ${agentId} agent`);
      }, index * 1000);
    });
  }

  private triggerScenario(): void {
    this.triggerRandomScenario();
  }

  private triggerVotingRound(): void {
    const agents = this.statusManager.getAllAgents();
    this.consensusMeter.simulateVotingRound(agents);
  }

  private triggerEmergencyScenario(): void {
    console.log(this.visualRenderer.colorize('\n🚨 EMERGENCY SCENARIO ACTIVATED!', 'red'));

    // Emergency coordination scenario
    this.statusManager.broadcastMessage('queen', 'EMERGENCY: All agents to coordinate immediately!', 'critical');

    // Activate all agents
    const agents = this.statusManager.getAllAgents();
    agents.forEach(agent => {
      this.statusManager.updateAgentStatus(agent.id, AgentStatus.COORDINATING, 'Emergency response active');
    });

    // After emergency, return to normal
    setTimeout(() => {
      this.statusManager.broadcastMessage('queen', 'Emergency resolved - returning to normal operations', 'high');
      agents.forEach(agent => {
        this.statusManager.updateAgentStatus(agent.id, AgentStatus.IDLE, 'Ready for tasks');
      });
    }, 8000);
  }

  private renderLoop(): void {
    if (!this.isRunning) return;

    try {
      const output = this.generateOutput();
      process.stdout.write('\x1b[H'); // Move cursor to top
      process.stdout.write(output);
    } catch (error) {
      console.error('Render error:', error);
    }

    this.animationFrame++;
    setTimeout(() => this.renderLoop(), 100); // 10 FPS
  }

  private generateOutput(): string {
    const agents = this.statusManager.getAllAgents();
    const agentTasks = new Map();
    const agentPerformance = new Map();
    const metrics = this.statusManager.calculateSwarmMetrics();

    agents.forEach(agent => {
      agentTasks.set(agent.id, this.statusManager.getAgentTasks(agent.id));
      agentPerformance.set(agent.id, this.statusManager.getAgentPerformance(agent.id));
    });

    // Update communication visualizer
    this.communicationVisualizer.updateCommunications(
      this.statusManager.getRecentCommunications(20),
      agents
    );

    switch (this.demoMode) {
      case 'compact':
        return this.visualRenderer.renderFullDisplay(
          agents, agentTasks, agentPerformance, metrics
        );

      case 'minimal':
        return this.generateMinimalDisplay(agents, metrics);

      case 'full':
      default:
        return this.generateFullDisplay(agents, agentTasks, agentPerformance, metrics);
    }
  }

  private generateFullDisplay(
    agents: Agent[],
    agentTasks: Map<string, AgentTask[]>,
    agentPerformance: Map<string, any>,
    metrics: any
  ): string {
    const sections = [];

    // Main swarm display
    sections.push(this.visualRenderer.renderFullDisplay(
      agents, agentTasks, agentPerformance, metrics
    ));

    // Communication flow visualization
    if (this.animationFrame % 5 === 0) { // Update every 5 frames
      sections.push('\n' + this.visualRenderer.colorize('🔄 COMMUNICATION NETWORK', 'cyan'));
      sections.push(this.communicationVisualizer.renderNetworkGraph());
    }

    // Consensus meter
    if (this.animationFrame % 10 === 0) { // Update every 10 frames
      sections.push('\n' + this.consensusMeter.renderConsensusMeter(agents));
    }

    // Performance metrics
    if (this.animationFrame % 15 === 0) { // Update every 15 frames
      sections.push('\n' + this.performanceMetrics.renderPerformanceDashboard(agents));
    }

    return sections.join('\n');
  }

  private generateMinimalDisplay(agents: Agent[], metrics: any): string {
    const activeAgents = agents.filter(a => a.status !== AgentStatus.IDLE);
    const efficiencyIcons = '⚡'.repeat(Math.ceil(metrics.efficiency / 20));

    const lines = [
      this.visualRenderer.bold(this.visualRenderer.colorize('🚀 QWEN SWARM - MINIMAL VIEW', 'cyan')),
      '='.repeat(process.stdout.columns || 80),
      `👥 ${activeAgents.length}/10 agents active | ${efficiencyIcons} | 💬 ${metrics.totalMessages} messages`,
      `🎯 Consensus: ${metrics.consensusLevel.toFixed(0)}% | 📊 Performance: ${metrics.averagePerformance.toFixed(0)}%`,
      ''
    ];

    agents.forEach(agent => {
      const statusIcon = this.getStatusIcon(agent.status);
      const progressBar = this.generateProgressBar(agent.progress, 10);
      lines.push(`${agent.emoji} ${statusIcon} ${agent.name}: ${progressBar} ${agent.progress.toFixed(0)}%`);
    });

    lines.push('');
    lines.push('Controls: [Space] Toggle | [M] Mode | [Q] Quit');

    return lines.join('\n');
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

  private generateProgressBar(progress: number, width: number): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;

    const color = progress >= 80 ? 'green' : progress >= 50 ? 'yellow' : 'red';
    const filledPart = this.visualRenderer.colorize('█'.repeat(filled), color);
    const emptyPart = '░'.repeat(empty);

    return `[${filledPart}${emptyPart}]`;
  }

  private weightedRandomChoice<T>(choices: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < choices.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return choices[i];
      }
    }

    return choices[choices.length - 1];
  }

  private shutdown(): void {
    this.isRunning = false;
    this.swarmDisplay.stopRealTimeUpdates();
    this.swarmDisplay.cleanup();

    console.log('\x1b[2J\x1b[H'); // Clear screen
    console.log('\x1b[?25h'); // Show cursor
    console.log(this.visualRenderer.colorize('\n👋 Thank you for using Qwen Swarm Activity Display!', 'cyan'));
    console.log(this.visualRenderer.colorize('🚀 The swarm has stood down - until next time!\n', 'green'));

    process.exit(0);
  }
}

// Start the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    new SwarmDemo();
  } catch (error) {
    console.error('Failed to start swarm demo:', error);
    process.exit(1);
  }
}

export { SwarmDemo };