import { QueenAgent } from '../../../src/agents/QueenAgent';
import { AgentFactory } from '../../factories/AgentFactory';
import { TaskFactory } from '../../factories/TaskFactory';
import type { Agent, Task } from '../../../src/types';
import { mock, MockProxy } from 'jest-mock-extended';

describe('QueenAgent', () => {
  let queenAgent: QueenAgent;
  let mockAgents: Agent[];
  let mockTasks: Task[];
  let mockMemoryCoordination: MockProxy<any>;
  let mockConsensusManager: MockProxy<any>;

  beforeEach(() => {
    mockMemoryCoordination = mock();
    mockConsensusManager = mock();

    queenAgent = new QueenAgent({
      id: 'test-queen-1',
      type: 'queen',
      status: 'active',
      name: 'Test Queen Agent',
      capabilities: ['task_distribution', 'consensus', 'monitoring', 'coordination'],
      performance: {
        tasksCompleted: 0,
        averageExecutionTime: 0,
        successRate: 1.0,
        lastActive: new Date()
      },
      configuration: {
        maxConcurrentTasks: 100,
        priority: 10,
        resourceLimits: {
          memory: 2048,
          cpu: 4,
          network: 1000
        }
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        healthScore: 1.0
      }
    }, {
      memory: mockMemoryCoordination,
      consensus: mockConsensusManager
    });

    mockAgents = AgentFactory.createSwarm(1, 5, 2);
    mockTasks = TaskFactory.createMany(10);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(queenAgent.id).toBe('test-queen-1');
      expect(queenAgent.type).toBe('queen');
      expect(queenAgent.status).toBe('active');
      expect(queenAgent.capabilities).toContain('task_distribution');
    });

    it('should throw error for invalid agent type', () => {
      expect(() => {
        new QueenAgent({
          ...mockAgents[0],
          type: 'worker' as any
        }, {});
      }).toThrow('QueenAgent must be initialized with type "queen"');
    });
  });

  describe('distributeTasks', () => {
    it('should distribute tasks based on agent capabilities', async () => {
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const distribution = await queenAgent.distributeTasks(mockTasks);

      expect(distribution).toBeDefined();
      expect(distribution.distributed).toHaveLength(mockTasks.length);
      expect(distribution.undistributed).toHaveLength(0);

      // Verify tasks were assigned to capable agents
      distribution.distributed.forEach((assignment) => {
        const agent = mockAgents.find(a => a.id === assignment.agentId);
        expect(agent).toBeDefined();
        expect(agent?.capabilities).toContain(
          expect.stringMatching(assignment.task.type)
        );
      });

      expect(mockMemoryCoordination.store).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task_distribution',
          data: expect.any(Object),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle tasks with no capable agents', async () => {
      const unsupportedTask = TaskFactory.create({
        type: 'quantum_computing' as any,
        payload: {}
      });

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const distribution = await queenAgent.distributeTasks([unsupportedTask]);

      expect(distribution.distributed).toHaveLength(0);
      expect(distribution.undistributed).toHaveLength(1);
      expect(distribution.undistributed[0].taskId).toBe(unsupportedTask.id);
    });

    it('should respect agent resource limits', async () => {
      const overloadedAgent = AgentFactory.createOverloaded({
        id: 'overloaded-agent',
        configuration: {
          maxConcurrentTasks: 1,
          priority: 5,
          resourceLimits: { memory: 512, cpu: 1, network: 100 }
        }
      });

      const agentsWithOverloaded = [...mockAgents, overloadedAgent];
      mockMemoryCoordination.retrieve.mockResolvedValue(agentsWithOverloaded);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const tasks = TaskFactory.createMany(20);
      const distribution = await queenAgent.distributeTasks(tasks);

      // Overloaded agent should not receive too many tasks
      const overloadedAssignments = distribution.distributed.filter(
        assignment => assignment.agentId === 'overloaded-agent'
      );
      expect(overloadedAssignments.length).toBeLessThanOrEqual(1);
    });

    it('should prioritize critical tasks', async () => {
      const criticalTask = TaskFactory.createHighPriority({
        priority: 'critical'
      });

      const normalTask = TaskFactory.create({
        priority: 'normal'
      });

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const distribution = await queenAgent.distributeTasks([normalTask, criticalTask]);

      // Critical task should be assigned to highest priority agent
      const criticalAssignment = distribution.distributed.find(
        assignment => assignment.taskId === criticalTask.id
      );
      expect(criticalAssignment).toBeDefined();

      const criticalAgent = mockAgents.find(a => a.id === criticalAssignment!.agentId);
      expect(criticalAgent?.configuration.priority).toBeGreaterThanOrEqual(8);
    });

    it('should handle consensus failure', async () => {
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(false);

      await expect(queenAgent.distributeTasks(mockTasks))
        .rejects.toThrow('Failed to build consensus for task distribution');

      expect(mockMemoryCoordination.store).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'consensus_failure',
          data: expect.any(Object)
        })
      );
    });
  });

  describe('monitorSwarm', () => {
    it('should collect swarm health metrics', async () => {
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);

      const healthReport = await queenAgent.monitorSwarm();

      expect(healthReport).toBeDefined();
      expect(healthReport.totalAgents).toBe(mockAgents.length);
      expect(healthReport.activeAgents).toBeGreaterThan(0);
      expect(healthReport.averageHealthScore).toBeGreaterThan(0);
      expect(healthReport.resourceUtilization).toBeDefined();
    });

    it('should identify unhealthy agents', async () => {
      const unhealthyAgent = AgentFactory.createFailed({
        metadata: { healthScore: 0.2 }
      });
      const agentsWithUnhealthy = [...mockAgents, unhealthyAgent];

      mockMemoryCoordination.retrieve.mockResolvedValue(agentsWithUnhealthy);

      const healthReport = await queenAgent.monitorSwarm();

      expect(healthReport.unhealthyAgents).toContain(unhealthyAgent.id);
      expect(healthReport.healthyAgents).not.toContain(unhealthyAgent.id);
    });

    it('should trigger self-healing for failed agents', async () => {
      const failedAgent = AgentFactory.createFailed();
      const agentsWithFailed = [...mockAgents, failedAgent];

      mockMemoryCoordination.retrieve.mockResolvedValue(agentsWithFailed);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      await queenAgent.monitorSwarm();

      expect(mockMemoryCoordination.store).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'self_healing_triggered',
          data: expect.objectContaining({
            agentId: failedAgent.id,
            reason: expect.any(String)
          })
        })
      );
    });
  });

  describe('coordinateConsensus', () => {
    it('should build consensus for critical decisions', async () => {
      const proposal = {
        id: 'test-proposal-1',
        type: 'agent_replacement',
        data: { failedAgentId: 'agent-1', replacementId: 'agent-new' },
        timeout: 30000
      };

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const result = await queenAgent.coordinateConsensus(proposal);

      expect(result.success).toBe(true);
      expect(result.consensusReached).toBe(true);
      expect(mockConsensusManager.buildConsensus).toHaveBeenCalledWith(
        proposal,
        expect.any(Array)
      );
    });

    it('should handle consensus timeout', async () => {
      const proposal = {
        id: 'test-proposal-timeout',
        type: 'task_reassignment',
        data: {},
        timeout: 100
      };

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockRejectedValue(
        new Error('Consensus timeout')
      );

      const result = await queenAgent.coordinateConsensus(proposal);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Consensus timeout');
    });

    it('should achieve majority consensus', async () => {
      const proposal = {
        id: 'test-proposal-majority',
        type: 'swarm_scaling',
        data: { scaleUp: true, targetCount: 10 },
        timeout: 30000
      };

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);

      // Mock votes: 6 out of 8 agents agree (majority)
      mockConsensusManager.buildConsensus.mockImplementation(async (prop, agents) => {
        const votes = agents.slice(0, 6).map(() => ({ agentId: 'mock', vote: true }));
        return votes.filter(v => v.vote).length > agents.length / 2;
      });

      const result = await queenAgent.coordinateConsensus(proposal);

      expect(result.success).toBe(true);
      expect(result.consensusReached).toBe(true);
    });
  });

  describe('scaleSwarm', () => {
    it('should scale up swarm under heavy load', async () => {
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const loadMetrics = {
        taskQueueSize: 100,
        averageResponseTime: 5000,
        cpuUtilization: 0.9,
        memoryUtilization: 0.85
      };

      const scalingDecision = await queenAgent.scaleSwarm(loadMetrics);

      expect(scalingDecision.action).toBe('scale_up');
      expect(scalingDecision.targetAgentCount).toBeGreaterThan(mockAgents.length);
      expect(scalingDecision.reason).toContain('high load');
    });

    it('should scale down swarm under light load', async () => {
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const loadMetrics = {
        taskQueueSize: 5,
        averageResponseTime: 100,
        cpuUtilization: 0.2,
        memoryUtilization: 0.3
      };

      const scalingDecision = await queenAgent.scaleSwarm(loadMetrics);

      expect(scalingDecision.action).toBe('scale_down');
      expect(scalingDecision.targetAgentCount).toBeLessThan(mockAgents.length);
      expect(scalingDecision.reason).toContain('low load');
    });

    it('should maintain optimal swarm size', async () => {
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const optimalMetrics = {
        taskQueueSize: 20,
        averageResponseTime: 500,
        cpuUtilization: 0.6,
        memoryUtilization: 0.7
      };

      const scalingDecision = await queenAgent.scaleSwarm(optimalMetrics);

      expect(scalingDecision.action).toBe('maintain');
      expect(scalingDecision.targetAgentCount).toBe(mockAgents.length);
    });
  });

  describe('handleAgentFailure', () => {
    it('should reassign tasks from failed agents', async () => {
      const failedAgent = AgentFactory.createFailed({ id: 'failed-agent-1' });
      const tasksForFailedAgent = TaskFactory.createMany(5, {
        assignedAgentId: 'failed-agent-1',
        status: 'in_progress'
      });

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockMemoryCoordination.query.mockResolvedValue(tasksForFailedAgent);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      const recoveryPlan = await queenAgent.handleAgentFailure(failedAgent.id);

      expect(recoveryPlan.agentId).toBe(failedAgent.id);
      expect(recoveryPlan.affectedTasks).toHaveLength(tasksForFailedAgent.length);
      expect(recoveryPlan.reassignmentPlan).toBeDefined();

      // All affected tasks should be reassigned
      recoveryPlan.reassignmentPlan.forEach(reassignment => {
        expect(reassignment.newAgentId).not.toBe(failedAgent.id);
        expect(reassignment.taskId).toBeDefined();
      });
    });

    it('should trigger consensus for critical agent failures', async () => {
      const criticalAgent = AgentFactory.create({
        id: 'critical-agent-1',
        type: 'queen',
        status: 'offline'
      });

      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      await queenAgent.handleAgentFailure(criticalAgent.id);

      expect(mockConsensusManager.buildConsensus).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical_agent_failure',
          data: expect.objectContaining({
            agentId: criticalAgent.id
          })
        }),
        expect.any(Array)
      );
    });
  });

  describe('performance metrics', () => {
    it('should track performance metrics correctly', async () => {
      const initialMetrics = queenAgent.getPerformanceMetrics();

      expect(initialMetrics.tasksDistributed).toBe(0);
      expect(initialMetrics.consensusReached).toBe(0);
      expect(initialMetrics.uptime).toBeGreaterThan(0);

      // Simulate some activity
      mockMemoryCoordination.retrieve.mockResolvedValue(mockAgents);
      mockConsensusManager.buildConsensus.mockResolvedValue(true);

      await queenAgent.distributeTasks(mockTasks.slice(0, 3));
      await queenAgent.coordinateConsensus({
        id: 'test-proposal',
        type: 'test',
        data: {},
        timeout: 30000
      });

      const updatedMetrics = queenAgent.getPerformanceMetrics();

      expect(updatedMetrics.tasksDistributed).toBe(3);
      expect(updatedMetrics.consensusReached).toBe(1);
      expect(updatedMetrics.uptime).toBeGreaterThanOrEqual(initialMetrics.uptime);
    });
  });
});