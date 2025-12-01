/**
 * Swarm Coordination Testing Patterns
 * Tests for collective intelligence, consensus mechanisms, and distributed decision-making
 */

import { SwarmOrchestrator } from '../../src/core/orchestrator';
import { ConsensusManager } from '../../src/consensus/manager';
import { CommunicationManager } from '../../src/communication/manager';
import { MemoryCoordination } from '../../src/memory/manager';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';

interface SwarmTopology {
  type: 'mesh' | 'hierarchical' | 'ring' | 'star';
  agentCount: number;
  communicationLatency: number;
  failureRate: number;
}

interface ConsensusScenario {
  id: string;
  name: string;
  description: string;
  topology: SwarmTopology;
  proposal: any;
  expectedOutcome: 'consensus' | 'no_consensus' | 'partial';
  timeout: number;
}

export class SwarmCoordinationTester {
  private orchestrator: SwarmOrchestrator;
  private consensus: ConsensusManager;
  private communication: CommunicationManager;
  private memory: MemoryCoordination;
  private testAgents: any[] = [];

  constructor() {
    this.setupConsensusScenarios();
  }

  private consensusScenarios: Map<string, ConsensusScenario> = new Map();

  private setupConsensusScenarios(): void {
    this.consensusScenarios.set('basic_majority', {
      id: 'basic_majority',
      name: 'Basic Majority Consensus',
      description: 'Simple majority vote on swarm scaling decision',
      topology: { type: 'mesh', agentCount: 8, communicationLatency: 50, failureRate: 0 },
      proposal: {
        id: 'scale-up-1',
        type: 'swarm_scaling',
        data: { action: 'scale_up', targetCount: 12, reason: 'high_load' },
        timeout: 5000
      },
      expectedOutcome: 'consensus',
      timeout: 5000
    });

    this.consensusScenarios.set('byzantine_tolerance', {
      id: 'byzantine_tolerance',
      name: 'Byzantine Fault Tolerance',
      description: 'Consensus with malicious agents',
      topology: { type: 'hierarchical', agentCount: 10, communicationLatency: 100, failureRate: 0.2 },
      proposal: {
        id: 'critical-decision-1',
        type: 'critical_task_assignment',
        data: { taskId: 'critical-task-123', priority: 'maximum' },
        timeout: 10000
      },
      expectedOutcome: 'consensus',
      timeout: 10000
    });

    this.consensusScenarios.set('network_partition', {
      id: 'network_partition',
      name: 'Network Partition Recovery',
      description: 'Consensus during network partition',
      topology: { type: 'mesh', agentCount: 12, communicationLatency: 200, failureRate: 0.3 },
      proposal: {
        id: 'emergency-scaling',
        type: 'emergency_scaling',
        data: { immediate: true, factor: 2 },
        timeout: 15000
      },
      expectedOutcome: 'partial',
      timeout: 15000
    });

    this.consensusScenarios.set('consensus_timeout', {
      id: 'consensus_timeout',
      name: 'Consensus Timeout Handling',
      description: 'Handling consensus timeout scenarios',
      topology: { type: 'ring', agentCount: 6, communicationLatency: 300, failureRate: 0.1 },
      proposal: {
        id: 'complex-allocation',
        type: 'resource_reallocation',
        data: { complex: true, agents: 'all' },
        timeout: 3000
      },
      expectedOutcome: 'no_consensus',
      timeout: 3000
    });
  }

  async initialize(): Promise<void> {
    this.orchestrator = new SwarmOrchestrator({
      system: { name: 'Swarm-Coordination-Test', version: '1.0.0', environment: 'test' },
      agents: { maxConcurrent: 20, resourceLimits: { memory: 8192, cpu: 16 } },
      consensus: { timeout: 10000, algorithm: 'raft', byzantineTolerance: true }
    });

    this.consensus = new ConsensusManager();
    this.communication = new CommunicationManager();
    this.memory = new MemoryCoordination();

    await this.orchestrator.initialize();
  }

  async testConsensusMechanisms(): Promise<{
    successRate: number;
    averageTime: number;
    faultTolerance: number;
    scalability: number;
    detailed: Record<string, any>;
  }> {
    const results: Record<string, any> = {};
    let totalSuccesses = 0;
    let totalTime = 0;

    for (const [scenarioId, scenario] of this.consensusScenarios) {
      try {
        const result = await this.runConsensusScenario(scenario);
        results[scenarioId] = result;

        if (result.consensusReached) totalSuccesses++;
        totalTime += result.consensusTime || 0;
      } catch (error) {
        results[scenarioId] = { success: false, error: error.message };
      }
    }

    const successRate = totalSuccesses / this.consensusScenarios.size;
    const averageTime = totalTime / this.consensusScenarios.size;

    return {
      successRate,
      averageTime,
      faultTolerance: await this.testFaultTolerance(),
      scalability: await this.testScalability(),
      detailed: results
    };
  }

  private async runConsensusScenario(scenario: ConsensusScenario): Promise<any> {
    // Setup agents based on topology
    await this.setupSwarmTopology(scenario.topology);

    // Inject failures if specified
    if (scenario.topology.failureRate > 0) {
      await this.injectFailures(scenario.topology.failureRate);
    }

    const startTime = performance.now();

    // Initiate consensus
    const consensusResult = await this.consensus.initiateConsensus(
      scenario.proposal,
      this.testAgents,
      scenario.timeout
    );

    const endTime = performance.now();
    const consensusTime = endTime - startTime;

    return {
      consensusReached: consensusResult.reached,
      consensusTime,
      votes: consensusResult.votes,
      agreement: consensusResult.agreement,
      topology: scenario.topology,
      expectedOutcome: scenario.expectedOutcome,
      correctOutcome: this.validateOutcome(consensusResult, scenario.expectedOutcome)
    };
  }

  private async setupSwarmTopology(topology: SwarmTopology): Promise<void> {
    this.testAgents = [];

    switch (topology.type) {
      case 'mesh':
        this.testAgents = AgentFactory.createMeshTopology(topology.agentCount);
        break;
      case 'hierarchical':
        this.testAgents = AgentFactory.createHierarchicalTopology(topology.agentCount);
        break;
      case 'ring':
        this.testAgents = AgentFactory.createRingTopology(topology.agentCount);
        break;
      case 'star':
        this.testAgents = AgentFactory.createStarTopology(topology.agentCount);
        break;
    }

    await this.orchestrator.addAgents(this.testAgents);
  }

  private async injectFailures(failureRate: number): Promise<void> {
    const failureCount = Math.floor(this.testAgents.length * failureRate);
    const failingAgents = this.testAgents
      .sort(() => Math.random() - 0.5)
      .slice(0, failureCount);

    for (const agent of failingAgents) {
      await this.simulateAgentFailure(agent);
    }
  }

  private async simulateAgentFailure(agent: any): Promise<void> {
    // Simulate different types of failures
    const failureTypes = ['crash', 'slow_response', 'malicious_vote', 'network_partition'];
    const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)];

    switch (failureType) {
      case 'crash':
        agent.status = 'failed';
        break;
      case 'slow_response':
        agent.latency = 5000; // 5 second delay
        break;
      case 'malicious_vote':
        agent.malicious = true;
        break;
      case 'network_partition':
        agent.partitioned = true;
        break;
    }
  }

  private validateOutcome(result: any, expected: string): boolean {
    switch (expected) {
      case 'consensus':
        return result.reached && result.agreement > 0.5;
      case 'no_consensus':
        return !result.reached;
      case 'partial':
        return result.agreement > 0.3 && result.agreement <= 0.5;
      default:
        return false;
    }
  }

  private async testFaultTolerance(): Promise<number> {
    const failureRates = [0.1, 0.2, 0.3, 0.4];
    let toleranceScore = 0;

    for (const failureRate of failureRates) {
      const scenario: ConsensusScenario = {
        id: `fault-test-${failureRate}`,
        name: `Fault Tolerance Test ${failureRate}`,
        description: 'Testing fault tolerance',
        topology: { type: 'mesh', agentCount: 10, communicationLatency: 100, failureRate },
        proposal: {
          id: 'fault-test-proposal',
          type: 'test',
          data: {},
          timeout: 5000
        },
        expectedOutcome: 'consensus',
        timeout: 5000
      };

      const result = await this.runConsensusScenario(scenario);
      if (result.consensusReached) {
        toleranceScore += (1 - failureRate) * 0.25;
      }
    }

    return toleranceScore;
  }

  private async testScalability(): Promise<number> {
    const agentCounts = [5, 10, 20, 50];
    let scalabilityScore = 0;
    let lastTime = 0;

    for (const count of agentCounts) {
      const scenario: ConsensusScenario = {
        id: `scalability-test-${count}`,
        name: `Scalability Test ${count}`,
        description: 'Testing scalability',
        topology: { type: 'mesh', agentCount: count, communicationLatency: 50, failureRate: 0 },
        proposal: {
          id: 'scalability-proposal',
          type: 'test',
          data: {},
          timeout: 10000
        },
        expectedOutcome: 'consensus',
        timeout: 10000
      };

      const result = await this.runConsensusScenario(scenario);

      if (result.consensusReached) {
        if (lastTime === 0) {
          lastTime = result.consensusTime;
          scalabilityScore += 0.25;
        } else {
          const timeIncrease = result.consensusTime / lastTime;
          const expectedIncrease = count / agentCounts[agentCounts.indexOf(count) - 1];
          const efficiency = expectedIncrease / timeIncrease;
          scalabilityScore += Math.min(0.25, efficiency * 0.25);
          lastTime = result.consensusTime;
        }
      }
    }

    return scalabilityScore;
  }

  async testDistributedTaskAllocation(): Promise<{
    efficiency: number;
    loadBalancing: number;
    adaptability: number;
    fairness: number;
  }> {
    const tasks = TaskFactory.createMany(100);
    const initialMetrics = await this.orchestrator.getPerformanceMetrics();

    // Test distributed allocation
    await this.orchestrator.distributeTasks(tasks);

    const finalMetrics = await this.orchestrator.getPerformanceMetrics();
    const taskDistribution = await this.orchestrator.getTaskDistribution();

    const efficiency = this.calculateAllocationEfficiency(tasks, taskDistribution);
    const loadBalancing = this.calculateLoadBalance(taskDistribution);
    const adaptability = await this.testAdaptiveAllocation();
    const fairness = this.calculateAllocationFairness(taskDistribution);

    return { efficiency, loadBalancing, adaptability, fairness };
  }

  private calculateAllocationEfficiency(tasks: any[], distribution: any[]): number {
    const totalCapabilities = distribution.reduce((sum, agent) =>
      sum + (agent.capabilities?.length || 0), 0);
    const matchedCapabilities = tasks.filter(task => {
      const assignedAgent = distribution.find(d => d.taskIds?.includes(task.id));
      return assignedAgent?.capabilities?.includes(task.type);
    }).length;

    return totalCapabilities > 0 ? matchedCapabilities / tasks.length : 0;
  }

  private calculateLoadBalance(distribution: any[]): number {
    if (distribution.length === 0) return 0;

    const taskCounts = distribution.map(d => d.taskCount || 0);
    const average = taskCounts.reduce((a, b) => a + b, 0) / taskCounts.length;
    const variance = taskCounts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / taskCounts.length;
    const standardDeviation = Math.sqrt(variance);

    // Perfect balance would have 0 standard deviation
    return Math.max(0, 1 - (standardDeviation / average));
  }

  private async testAdaptiveAllocation(): Promise<number> {
    // Test how well the system adapts to changing conditions
    const conditions = [
      { load: 'low', expectedResponse: 100 },
      { load: 'medium', expectedResponse: 500 },
      { load: 'high', expectedResponse: 1000 }
    ];

    let adaptabilityScore = 0;

    for (const condition of conditions) {
      const startTime = performance.now();

      await this.orchestrator.simulateLoadCondition(condition.load);
      const testTasks = TaskFactory.createMany(20);
      await this.orchestrator.distributeTasks(testTasks);

      const responseTime = performance.now() - startTime;
      const efficiency = Math.min(1, condition.expectedResponse / responseTime);
      adaptabilityScore += efficiency / 3;
    }

    return adaptabilityScore;
  }

  private calculateAllocationFairness(distribution: any[]): number {
    if (distribution.length === 0) return 0;

    // Calculate fairness based on resource utilization and task distribution
    const utilizations = distribution.map(d => d.resourceUtilization || 0);
    const averageUtilization = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;

    // Fair allocation should result in similar utilizations across agents
    const fairnessIndex = 1 - (Math.max(...utilizations) - Math.min(...utilizations)) / averageUtilization;
    return Math.max(0, fairnessIndex);
  }

  async testCollectiveIntelligence(): Promise<{
    emergentBehavior: number;
    problemSolving: number;
    learning: number;
    adaptation: number;
  }> {
    // Test emergent intelligent behaviors
    const emergentBehavior = await this.testEmergentBehaviors();
    const problemSolving = await this.testCollectiveProblemSolving();
    const learning = await this.testCollectiveLearning();
    const adaptation = await this.testCollectiveAdaptation();

    return { emergentBehavior, problemSolving, learning, adaptation };
  }

  private async testEmergentBehaviors(): Promise<number> {
    // Test for unexpected emergent behaviors that benefit the swarm
    const scenarios = [
      'spontaneous_optimization',
      'self_organizing_patterns',
      'collective_decision_making',
      'distributed_coordination'
    ];

    let emergentScore = 0;

    for (const scenario of scenarios) {
      const result = await this.orchestrator.runEmergentBehaviorTest(scenario);
      emergentScore += (result.emergentBehaviorDetected ? 0.25 : 0);
    }

    return emergentScore;
  }

  private async testCollectiveProblemSolving(): Promise<number> {
    const complexProblem = {
      type: 'complex_optimization',
      constraints: ['time_limit', 'resource_constraints', 'quality_requirements'],
      complexity: 'high',
      domain: 'distributed_systems'
    };

    const solution = await this.orchestrator.solveCollectively(complexProblem);

    if (!solution.success) return 0;

    let score = 0.5; // Base score for attempting solution

    if (solution.quality >= 0.8) score += 0.2;
    if (solution.efficiency >= 0.7) score += 0.2;
    if (solution.collaborationLevel >= 0.8) score += 0.1;

    return score;
  }

  private async testCollectiveLearning(): Promise<number> {
    // Test if swarm learns from collective experiences
    const learningTasks = TaskFactory.createMany(30, {
      type: 'collective_learning',
      payload: { shareExperience: true }
    });

    const initialPerformance = await this.orchestrator.getPerformanceMetrics();

    for (const task of learningTasks) {
      await this.orchestrator.executeTask(task);
    }

    const finalPerformance = await this.orchestrator.getPerformanceMetrics();
    const improvement = (finalPerformance.collectiveIntelligence - initialPerformance.collectiveIntelligence) /
                        initialPerformance.collectiveIntelligence;

    return Math.min(1, Math.max(0, improvement + 0.5));
  }

  private async testCollectiveAdaptation(): Promise<number> {
    // Test swarm's ability to adapt as a collective
    const environmentalChanges = [
      { type: 'resource_scarcity', impact: 0.7 },
      { type: 'increased_load', impact: 0.8 },
      { type: 'communication_failure', impact: 0.5 }
    ];

    let adaptationScore = 0;

    for (const change of environmentalChanges) {
      const beforeAdaptation = await this.orchestrator.getPerformanceMetrics();

      await this.orchestrator.simulateEnvironmentalChange(change);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Allow adaptation

      const afterAdaptation = await this.orchestrator.getPerformanceMetrics();

      const resilience = beforeAdaptation.stability / (beforeAdaptation.stability - afterAdaptation.stability + 0.1);
      adaptationScore += Math.min(0.33, resilience);
    }

    return adaptationScore;
  }

  async cleanup(): Promise<void> {
    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }
  }
}

// Test Suite for Swarm Coordination
describe('Swarm Coordination Patterns', () => {
  let tester: SwarmCoordinationTester;

  beforeAll(async () => {
    tester = new SwarmCoordinationTester();
    await tester.initialize();
  }, 60000);

  afterAll(async () => {
    await tester.cleanup();
  });

  describe('Consensus Mechanisms', () => {
    it('should achieve consensus under normal conditions', async () => {
      const results = await tester.testConsensusMechanisms();

      expect(results.successRate).toBeGreaterThan(0.75); // 75% success rate minimum
      expect(results.averageTime).toBeLessThan(5000); // Average consensus time under 5 seconds
      expect(results.faultTolerance).toBeGreaterThan(0.6); // Should handle failures
      expect(results.scalability).toBeGreaterThan(0.5); // Should scale reasonably

      console.log('Consensus Test Results:', {
        successRate: `${(results.successRate * 100).toFixed(1)}%`,
        averageTime: `${results.averageTime.toFixed(0)}ms`,
        faultTolerance: `${(results.faultTolerance * 100).toFixed(1)}%`,
        scalability: `${(results.scalability * 100).toFixed(1)}%`
      });
    }, 120000);

    it('should handle Byzantine fault tolerance', async () => {
      const byzantineScenario = tester['consensusScenarios'].get('byzantine_tolerance');
      const result = await tester['runConsensusScenario'](byzantineScenario);

      expect(result.consensusReached).toBe(true);
      expect(result.correctOutcome).toBe(true);
      expect(result.votes.filter(v => v.malicious).length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Distributed Task Allocation', () => {
    it('should allocate tasks efficiently across swarm', async () => {
      const results = await tester.testDistributedTaskAllocation();

      expect(results.efficiency).toBeGreaterThan(0.7);
      expect(results.loadBalancing).toBeGreaterThan(0.6);
      expect(results.adaptability).toBeGreaterThan(0.5);
      expect(results.fairness).toBeGreaterThan(0.6);

      console.log('Task Allocation Results:', {
        efficiency: `${(results.efficiency * 100).toFixed(1)}%`,
        loadBalancing: `${(results.loadBalancing * 100).toFixed(1)}%`,
        adaptability: `${(results.adaptability * 100).toFixed(1)}%`,
        fairness: `${(results.fairness * 100).toFixed(1)}%`
      });
    }, 60000);
  });

  describe('Collective Intelligence', () => {
    it('should demonstrate emergent intelligent behaviors', async () => {
      const results = await tester.testCollectiveIntelligence();

      expect(results.emergentBehavior).toBeGreaterThan(0.3);
      expect(results.problemSolving).toBeGreaterThan(0.5);
      expect(results.learning).toBeGreaterThan(0.4);
      expect(results.adaptation).toBeGreaterThan(0.5);

      console.log('Collective Intelligence Results:', {
        emergentBehavior: `${(results.emergentBehavior * 100).toFixed(1)}%`,
        problemSolving: `${(results.problemSolving * 100).toFixed(1)}%`,
        learning: `${(results.learning * 100).toFixed(1)}%`,
        adaptation: `${(results.adaptation * 100).toFixed(1)}%`
      });
    }, 90000);
  });

  describe('Resilience and Recovery', () => {
    it('should recover from agent failures gracefully', async () => {
      const initialAgents = await tester['orchestrator'].getAllAgents();
      const criticalTask = TaskFactory.create({
        type: 'critical_operation',
        priority: 'critical',
        requiresCoordination: true
      });

      // Start critical task
      const taskPromise = tester['orchestrator'].executeTask(criticalTask);

      // Simulate random agent failures
      const failingAgents = initialAgents.slice(0, Math.floor(initialAgents.length * 0.3));
      for (const agent of failingAgents) {
        await tester['simulateAgentFailure'](agent);
      }

      // Task should still complete successfully
      const result = await taskPromise;
      expect(result.success).toBe(true);
      expect(result.recoveryActions).toBeDefined();
    }, 45000);

    it('should maintain swarm integrity under network partitions', async () => {
      const partitionScenario = tester['consensusScenarios'].get('network_partition');
      const result = await tester['runConsensusScenario'](partitionScenario);

      expect(result.topology.type).toBe('mesh');
      expect(result.correctOutcome).toBe(true);
      // Should achieve partial consensus during partition
    }, 60000);
  });
});