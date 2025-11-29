import { HiveMindSwarm } from '../../src/HiveMindSwarm';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';
import { testDb } from '../helpers/TestDatabase';

describe('Chaos Engineering: Agent Failure Simulation', () => {
  let swarm: HiveMindSwarm;
  let agents: any[];
  let tasks: any[];

  beforeAll(async () => {
    await testDb.start();
  });

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.reset();
    swarm = new HiveMindSwarm({
      database: testDb.getDatabase(),
      maxAgents: 20,
      consensusTimeout: 10000,
      selfHealingEnabled: true
    });

    agents = AgentFactory.createSwarm(1, 10, 3);
    tasks = TaskFactory.createMany(50);

    await swarm.initialize();
    await swarm.addAgents(agents);
    await swarm.addTasks(tasks);
  });

  afterEach(async () => {
    if (swarm) {
      await swarm.shutdown();
    }
  });

  describe('Random Agent Failure', () => {
    it('should maintain swarm operation when 30% of agents fail randomly', async () => {
      const initialActiveAgents = await swarm.getActiveAgents();
      const initialTaskQueue = await swarm.getTaskQueue();

      // Fail 30% of agents randomly
      const agentsToFail = agents.slice(0, Math.floor(agents.length * 0.3));

      const failurePromises = agentsToFail.map(async agent => {
        await swarm.simulateAgentFailure(agent.id, {
          type: 'random_failure',
          timestamp: Date.now()
        });
      });

      await Promise.all(failurePromises);

      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalActiveAgents = await swarm.getActiveAgents();
      const finalTaskQueue = await swarm.getTaskQueue();
      const systemHealth = await swarm.getSystemHealth();

      // System resilience validations
      expect(finalActiveAgents.length).toBeGreaterThan(initialActiveAgents.length * 0.6);
      expect(finalActiveAgents.length).toBeLessThan(initialActiveAgents.length);

      // Critical tasks should still be processed
      const criticalTasks = finalTaskQueue.filter(t => t.priority === 'critical');
      expect(criticalTasks.every(t => t.status !== 'failed')).toBe(true);

      // System should be in degraded but functional state
      expect(systemHealth.status).toBe('degraded');
      expect(systemHealth.functional).toBe(true);
    });

    it('should recover gracefully from cascading failures', async () => {
      // Simulate cascading failure scenario
      const initialAgents = await swarm.getActiveAgents();

      // First failure triggers secondary failures
      const primaryFailureAgent = agents[0];
      await swarm.simulateAgentFailure(primaryFailureAgent.id, {
        type: 'system_overload',
        timestamp: Date.now()
      });

      // Wait and then cause secondary failures
      await new Promise(resolve => setTimeout(resolve, 1000));

      const secondaryFailureAgents = agents.slice(1, 4);
      await Promise.all(
        secondaryFailureAgents.map(agent =>
          swarm.simulateAgentFailure(agent.id, {
            type: 'cascading_failure',
            cause: primaryFailureAgent.id,
            timestamp: Date.now()
          })
        )
      );

      await new Promise(resolve => setTimeout(resolve, 10000));

      const finalHealth = await swarm.getSystemHealth();
      const recoveryActions = await swarm.getRecoveryActions();

      // System should attempt recovery
      expect(finalHealth.recoveryActive).toBe(true);
      expect(recoveryActions.length).toBeGreaterThan(0);

      // At least one agent should remain functional
      const functionalAgents = await swarm.getFunctionalAgents();
      expect(functionalAgents.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory exhaustion and maintain core functions', async () => {
      // Fill memory with large tasks
      const memoryHeavyTasks = Array.from({ length: 1000 }, (_, index) =>
        TaskFactory.create({
          id: `memory-heavy-${index}`,
          payload: {
            data: 'x'.repeat(1024 * 1024), // 1MB per task
            processingRequired: true
          }
        })
      );

      await swarm.addTasks(memoryHeavyTasks);

      // Monitor memory usage during processing
      const memoryMetrics = await swarm.getMemoryMetrics();
      const initialMemoryUsage = memoryMetrics.usagePercent;

      // Trigger memory pressure simulation
      await swarm.simulateMemoryPressure(0.95); // 95% memory usage

      const highMemoryMetrics = await swarm.getMemoryMetrics();
      expect(highMemoryMetrics.usagePercent).toBeGreaterThan(0.9);

      // System should activate memory management
      const memoryManagementActive = await swarm.isMemoryManagementActive();
      expect(memoryManagementActive).toBe(true);

      // Critical operations should still work
      const queenAgent = agents.find(a => a.type === 'queen');
      const queenStatus = await swarm.getAgentStatus(queenAgent.id);
      expect(queenStatus.status).not.toBe('failed');

      // Memory should be freed after processing
      await new Promise(resolve => setTimeout(resolve, 15000));

      const finalMemoryMetrics = await swarm.getMemoryMetrics();
      expect(finalMemoryMetrics.usagePercent).toBeLessThan(0.8);
    });

    it('should handle CPU overload and prioritize critical tasks', async () => {
      // Create CPU-intensive tasks
      const cpuHeavyTasks = Array.from({ length: 200 }, (_, index) =>
        TaskFactory.create({
          id: `cpu-heavy-${index}`,
          type: 'computation',
          priority: index % 10 === 0 ? 'critical' : 'normal',
          payload: {
            algorithm: 'matrix_multiplication',
            complexity: 'high',
            iterations: 10000
          }
        })
      );

      await swarm.addTasks(cpuHeavyTasks);

      // Simulate CPU overload
      await swarm.simulateCPUOverload(0.95);

      const cpuMetrics = await swarm.getCPUMetrics();
      expect(cpuMetrics.usagePercent).toBeGreaterThan(0.9);

      // Critical tasks should be prioritized
      const criticalTasks = await swarm.getTasksByPriority('critical');
      const criticalTaskStatuses = await Promise.all(
        criticalTasks.map(task => swarm.getTaskStatus(task.id))
      );

      expect(criticalTaskStatuses.every(status =>
        status === 'completed' || status === 'in_progress'
      )).toBe(true);

      // System should implement load shedding
      const loadSheddingActive = await swarm.isLoadSheddingActive();
      expect(loadSheddingActive).toBe(true);
    });
  });

  describe('Network Partition Simulation', () => {
    it('should handle network partition with split-brain prevention', async () => {
      const initialAgents = await swarm.getAllAgents();
      const partitionSize = Math.floor(initialAgents.length / 2);

      // Create network partition
      const partition1Agents = initialAgents.slice(0, partitionSize);
      const partition2Agents = initialAgents.slice(partitionSize);

      await swarm.simulateNetworkPartition([
        {
          agents: partition1Agents.map(a => a.id),
          isolation: true
        },
        {
          agents: partition2Agents.map(a => a.id),
          isolation: true
        }
      ]);

      // Both partitions should attempt to maintain functionality
      const partition1Health = await swarm.getPartitionHealth(partition1Agents.map(a => a.id));
      const partition2Health = await swarm.getPartitionHealth(partition2Agents.map(a => a.id));

      expect(partition1Health.functional).toBe(true);
      expect(partition2Health.functional).toBe(true);

      // Split-brain should be prevented
      const consensusAttempts = await swarm.getConsensusAttempts();
      expect(consensusAttempts.filter(a => a.result === 'split_brain_prevented')).toHaveLength(0);

      // Recovery when network is restored
      await swarm.healNetworkPartition();

      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalHealth = await swarm.getSystemHealth();
      expect(finalHealth.status).toBe('recovering');
    });

    it('should maintain data consistency during partition', async () => {
      // Store critical data before partition
      const criticalData = {
        type: 'system_checkpoint',
        data: {
          timestamp: Date.now(),
          taskStates: await swarm.getAllTaskStates(),
          agentStates: await swarm.getAllAgentStates()
        }
      };

      await swarm.storeSharedMemory(criticalData);

      // Create partition
      const partitionAgents = agents.slice(0, 5);
      await swarm.simulateNetworkPartition([{
        agents: partitionAgents.map(a => a.id),
        isolation: true
      }]);

      // Perform operations in both partitions
      await Promise.all([
        swarm.updateAgentStatus(partitionAgents[0].id, 'busy'),
        swarm.updateAgentStatus(partitionAgents[1].id, 'active')
      ]);

      // Heal partition
      await swarm.healNetworkPartition();

      // Verify data consistency
      const currentData = await swarm.getSharedMemory({
        type: 'system_checkpoint'
      });

      expect(currentData).toHaveLength(1);
      expect(currentData[0].data.taskStates).toBeDefined();
      expect(currentData[0].data.agentStates).toBeDefined();
    });
  });

  describe('Consensus Failure Scenarios', () => {
    it('should handle consensus timeout and implement fallback strategies', async () => {
      const proposal = {
        id: 'chaos-consensus-test',
        type: 'critical_scaling',
        data: {
          action: 'emergency_scale_up',
          reason: 'overload_detected'
        },
        timeout: 1000 // Very short timeout
      };

      // Make some agents unresponsive
      const unresponsiveAgents = agents.slice(0, 6);
      await Promise.all(
        unresponsiveAgents.map(agent =>
          swarm.simulateAgentUnresponsiveness(agent.id, 5000)
        )
      );

      const consensusResult = await swarm.initiateConsensus(proposal);

      expect(consensusResult.consensusReached).toBe(false);
      expect(consensusResult.reason).toContain('timeout');

      // System should implement fallback
      const fallbackActions = await swarm.getFallbackActions();
      expect(fallbackActions.length).toBeGreaterThan(0);

      // System should continue functioning
      const systemHealth = await swarm.getSystemHealth();
      expect(systemHealth.functional).toBe(true);
    });

    it('should recover from consensus divergence', async () => {
      // Create conflicting proposals
      const proposal1 = {
        id: 'conflict-1',
        type: 'resource_allocation',
        data: { allocate: 'cpu', amount: 80 },
        priority: 'high'
      };

      const proposal2 = {
        id: 'conflict-2',
        type: 'resource_allocation',
        data: { allocate: 'memory', amount: 80 },
        priority: 'high'
      };

      // Agents vote differently on conflicting proposals
      const agentGroups = [
        agents.slice(0, 5).map(a => a.id),
        agents.slice(5, 10).map(a => a.id)
      ];

      await Promise.all([
        swarm.simulateConsensusVote(proposal1, agentGroups[0], true),
        swarm.simulateConsensusVote(proposal2, agentGroups[1], true)
      ]);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // System should detect divergence
      const divergenceDetected = await swarm.hasConsensusDivergence();
      expect(divergenceDetected).toBe(true);

      // Recovery mechanisms should activate
      const recoveryPlan = await swarm.getConsensusRecoveryPlan();
      expect(recoveryPlan.steps.length).toBeGreaterThan(0);

      // Execute recovery
      await swarm.executeConsensusRecovery(recoveryPlan);

      const finalConsensus = await swarm.getConsensusState();
      expect(finalConsensus.divergent).toBe(false);
    });
  });

  describe('Database Failure Simulation', () => {
    it('should handle temporary database disconnection', async () => {
      // Monitor current operations
      const activeOperations = await swarm.getActiveOperations();
      expect(activeOperations.length).toBeGreaterThan(0);

      // Simulate database failure
      await testDb.stop();

      // Operations should be buffered
      const bufferedOperations = await swarm.getBufferedOperations();
      expect(bufferedOperations.length).toBeGreaterThan(0);

      // System should switch to degraded mode
      const systemStatus = await swarm.getSystemStatus();
      expect(systemStatus.mode).toBe('degraded');

      // Restart database
      await testDb.start();

      // Buffered operations should be processed
      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalActiveOperations = await swarm.getActiveOperations();
      expect(finalActiveOperations.length).toBeGreaterThanOrEqual(activeOperations.length);

      // System should recover
      const finalStatus = await swarm.getSystemStatus();
      expect(finalStatus.mode).toBe('normal');
    });

    it('should maintain data integrity during database corruption', async () => {
      // Store critical state
      const criticalState = {
        systemConfig: await swarm.getSystemConfig(),
        agentRegistry: await swarm.getAgentRegistry(),
        taskQueue: await swarm.getTaskQueue()
      };

      await swarm.createSystemSnapshot('pre-corruption', criticalState);

      // Simulate database corruption
      await swarm.simulateDatabaseCorruption({
        type: 'index_corruption',
        affectedCollections: ['agents', 'tasks']
      });

      // System should detect corruption
      const corruptionDetected = await swarm.detectDatabaseCorruption();
      expect(corruptionDetected).toBe(true);

      // System should attempt repair
      const repairResult = await swarm.repairDatabaseCorruption();
      expect(repairResult.repairAttempted).toBe(true);

      // Verify data integrity
      const postRepairState = {
        systemConfig: await swarm.getSystemConfig(),
        agentRegistry: await swarm.getAgentRegistry(),
        taskQueue: await swarm.getTaskQueue()
      };

      expect(postRepairState.systemConfig).toBeDefined();
      expect(postRepairState.agentRegistry.length).toBeGreaterThan(0);
    });
  });

  describe('Self-Healing Validation', () => {
    it('should automatically detect and heal system issues', async () => {
      // Enable self-healing
      await swarm.enableSelfHealing({
        automaticRecovery: true,
        healthCheckInterval: 1000,
        maxRetries: 3
      });

      // Introduce multiple types of failures
      await Promise.all([
        swarm.simulateAgentFailure(agents[0].id, { type: 'memory_leak' }),
        swarm.simulateAgentFailure(agents[1].id, { type: 'cpu_hang' }),
        swarm.simulateNetworkPartition([{
          agents: [agents[2], agents[3]].map(a => a.id),
          isolation: true
        }])
      ]);

      // Wait for self-healing to activate
      await new Promise(resolve => setTimeout(resolve, 10000));

      const healingReport = await swarm.getSelfHealingReport();

      expect(healingReport.issuesDetected).toBeGreaterThan(0);
      expect(healingReport.healingActionsTaken).toBeGreaterThan(0);
      expect(healingReport.successfulRecoveries).toBeGreaterThan(0);

      // System should be functional
      const finalHealth = await swarm.getSystemHealth();
      expect(finalHealth.functional).toBe(true);
    });

    it('should learn from failures and improve resilience', async () => {
      // Cause same type of failure multiple times
      const failureType = 'resource_exhaustion';

      for (let i = 0; i < 5; i++) {
        await swarm.simulateAgentFailure(agents[i].id, {
          type: failureType,
          iteration: i
        });

        // Wait for recovery
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const learningReport = await swarm.getLearningReport();

      // System should have learned patterns
      expect(learningReport.failurePatterns[failureType]).toBeDefined();
      expect(learningReport.failurePatterns[failureType].occurrences).toBe(5);

      // Prevention strategies should be improved
      const preventionStrategies = await swarm.getPreventionStrategies(failureType);
      expect(preventionStrategies.length).toBeGreaterThan(0);

      // Future similar failures should be prevented
      const resilienceScore = await swarm.getResilienceScore(failureType);
      expect(resilienceScore).toBeGreaterThan(0.8); // 80% improvement
    });
  });
});