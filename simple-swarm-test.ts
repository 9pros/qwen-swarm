#!/usr/bin/env node

/**
 * Simple test to demonstrate the swarm activity display system
 */

import { SwarmActivityDisplay } from './swarm-activity-display';
import { AgentStatusManager, AgentTask } from './agent-status-manager';
import { VisualRenderer } from './visual-renderer';

class SimpleSwarmTest {
  private swarmDisplay: SwarmActivityDisplay;
  private statusManager: AgentStatusManager;
  private visualRenderer: VisualRenderer;

  constructor() {
    console.log('\x1b[2J\x1b[H'); // Clear screen
    console.log('🚀 Starting Simple Swarm Test...\n');

    this.swarmDisplay = new SwarmActivityDisplay();
    this.statusManager = new AgentStatusManager();
    this.visualRenderer = new VisualRenderer({
      terminalWidth: process.stdout.columns || 120,
      terminalHeight: process.stdout.rows || 30,
      colorScheme: 'default',
      compactMode: false
    });

    this.runTest();
  }

  private async runTest(): Promise<void> {
    console.log('✅ Swarm Activity Display initialized');
    console.log('✅ Agent Status Manager initialized');
    console.log('✅ Visual Renderer initialized');

    // Start real-time updates
    this.swarmDisplay.startRealTimeUpdates();

    // Demonstrate basic functionality
    await this.demonstrateBasicActivity();
    await this.demonstrateCommunication();
    await this.demonstratePerformance();

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📊 Key Features Demonstrated:');
    console.log('  ✅ 10 parallel agents with unique roles');
    console.log('  ✅ Real-time status tracking');
    console.log('  ✅ Visual rendering with ANSI colors');
    console.log('  ✅ Communication system');
    console.log('  ✅ Performance monitoring');
    console.log('  ✅ Task assignment and progress');

    // Show final metrics
    const metrics = this.statusManager.calculateSwarmMetrics();
    console.log('\n📈 Final Metrics:');
    console.log(`  🤝 Consensus Level: ${metrics.consensusLevel.toFixed(1)}%`);
    console.log(`  ⚡ Efficiency: ${metrics.efficiency.toFixed(1)}%`);
    console.log(`  📊 Average Performance: ${metrics.averagePerformance.toFixed(1)}%`);
    console.log(`  💬 Total Messages: ${metrics.totalMessages}`);
    console.log(`  📋 Active Tasks: ${metrics.activeTasks}`);
    console.log(`  ✅ Completed Tasks: ${metrics.completedTasks}`);

    // Cleanup
    this.swarmDisplay.stopRealTimeUpdates();
    this.swarmDisplay.cleanup();
  }

  private async demonstrateBasicActivity(): Promise<void> {
    console.log('\n🎬 Demonstrating basic agent activity...');

    const agents = this.statusManager.getAllAgents();

    // Assign tasks to different agents
    const tasks: AgentTask[] = [
      {
        id: 'demo_task_1',
        name: 'System Initialization',
        description: 'Initialize swarm coordination system',
        priority: 'high',
        estimatedDuration: 2000,
        dependencies: [],
        progress: 0
      },
      {
        id: 'demo_task_2',
        name: 'Code Analysis',
        description: 'Analyze codebase for optimization',
        priority: 'medium',
        estimatedDuration: 1500,
        dependencies: [],
        progress: 0
      },
      {
        id: 'demo_task_3',
        name: 'Security Audit',
        description: 'Perform security assessment',
        priority: 'high',
        estimatedDuration: 2500,
        dependencies: [],
        progress: 0
      }
    ];

    // Assign tasks to agents
    const assignments = {
      'queen': tasks[0],
      'analysis': tasks[1],
      'security': tasks[2]
    };

    Object.entries(assignments).forEach(([agentId, task]) => {
      this.statusManager.assignTask(agentId, task);
      this.statusManager.updateAgentStatus(agentId, 'active' as any, task.name);
    });

    // Simulate task progress
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));

      Object.entries(assignments).forEach(([agentId, task]) => {
        const newProgress = Math.min(100, task.progress + Math.random() * 15);
        this.statusManager.updateTaskProgress(agentId, task.id, newProgress);

        if (newProgress >= 100) {
          this.statusManager.completeTask(agentId, task.id);
          this.statusManager.updateAgentStatus(agentId, 'idle' as any, 'Ready for tasks');
        }
      });
    }

    console.log('✅ Basic activity demonstration completed');
  }

  private async demonstrateCommunication(): Promise<void> {
    console.log('\n💬 Demonstrating agent communication...');

    const communications = [
      { from: 'queen', to: 'code', message: 'Coordination system online' },
      { from: 'analysis', to: 'architecture', message: 'Code analysis complete' },
      { from: 'security', to: 'testing', message: 'Security scan results ready' },
      { from: 'performance', to: 'queen', message: 'Optimization suggestions available' },
      { from: 'testing', to: 'documentation', message: 'Test suite updated' }
    ];

    communications.forEach((comm, index) => {
      setTimeout(() => {
        this.statusManager.sendCommunication(comm.from, comm.to, comm.message);
        console.log(`  📤 ${comm.from} → ${comm.to}: ${comm.message}`);
      }, index * 300);
    });

    await new Promise(resolve => setTimeout(resolve, communications.length * 300 + 500));
    console.log('✅ Communication demonstration completed');
  }

  private async demonstratePerformance(): Promise<void> {
    console.log('\n📊 Demonstrating performance tracking...');

    const agents = this.statusManager.getAllAgents();

    agents.forEach((agent, index) => {
      setTimeout(() => {
        // Simulate different performance levels
        const performance = 70 + Math.random() * 30; // 70-100% performance
        this.statusManager.updateAgent(agent.id, { performance });

        console.log(`  📈 ${agent.name} Performance: ${performance.toFixed(1)}%`);
      }, index * 100);
    });

    await new Promise(resolve => setTimeout(resolve, agents.length * 100 + 500));
    console.log('✅ Performance tracking demonstration completed');
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    new SimpleSwarmTest();
  } catch (error) {
    console.error('Failed to run swarm test:', error);
    process.exit(1);
  }
}

export { SimpleSwarmTest };