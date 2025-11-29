import { HiveMindSwarm } from '../../src/HiveMindSwarm';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';
import { testDb } from '../helpers/TestDatabase';
import { WebSocket } from 'ws';

describe('Agent Communication Integration', () => {
  let swarm: HiveMindSwarm;
  let wsServer: any;
  let agents: any[];
  let tasks: any[];

  beforeAll(async () => {
    await testDb.start();

    // Setup WebSocket server for agent communication
    wsServer = new WebSocket.Server({ port: 8080 });

    swarm = new HiveMindSwarm({
      database: testDb.getDatabase(),
      wsPort: 8080,
      maxAgents: 10,
      consensusTimeout: 30000
    });
  });

  afterAll(async () => {
    if (swarm) {
      await swarm.shutdown();
    }
    if (wsServer) {
      await new Promise(resolve => wsServer.close(resolve));
    }
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.reset();
    agents = AgentFactory.createSwarm(1, 5, 2);
    tasks = TaskFactory.createMany(15);

    await swarm.initialize();
    await swarm.addAgents(agents);
  });

  afterEach(async () => {
    await swarm.removeAllAgents();
  });

  describe('Task Assignment Communication', () => {
    it('should distribute tasks from queen to workers via WebSocket', async () => {
      const queenAgent = agents.find(a => a.type === 'queen');
      const workerAgents = agents.filter(a => a.type === 'worker');

      const taskDistribution = await swarm.distributeTasks(tasks.slice(0, 5));

      expect(taskDistribution.distributed).toHaveLength(5);

      // Verify workers received assignments
      for (const assignment of taskDistribution.distributed) {
        const assignedWorker = workerAgents.find(a => a.id === assignment.agentId);
        expect(assignedWorker).toBeDefined();

        // Check if worker has the task in its queue
        const workerTasks = await swarm.getAgentTasks(assignment.agentId);
        expect(workerTasks.some(t => t.id === assignment.taskId)).toBe(true);
      }
    });

    it('should handle task status updates from workers', async () => {
      const worker = agents.find(a => a.type === 'worker');
      const task = TaskFactory.create({
        assignedAgentId: worker.id,
        status: 'in_progress'
      });

      await swarm.addTask(task);

      // Simulate worker updating task status
      await swarm.updateTaskStatus(task.id, 'completed', {
        result: { processed: 100, success: true },
        executionTime: 2500
      });

      const updatedTask = await swarm.getTask(task.id);
      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.result).toBeDefined();
      expect(updatedTask.executionTime).toBe(2500);
    });

    it('should broadcast task completion to all agents', async () => {
      const task = TaskFactory.create({
        status: 'in_progress'
      });

      await swarm.addTask(task);

      // Mock WebSocket broadcasting
      const broadcastSpy = jest.spyOn(swarm, 'broadcastMessage');

      await swarm.updateTaskStatus(task.id, 'completed', {
        result: { output: 'test result' }
      });

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task_completed',
          taskId: task.id,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle task failure and reassignment', async () => {
      const worker = agents.find(a => a.type === 'worker');
      const task = TaskFactory.create({
        assignedAgentId: worker.id,
        status: 'in_progress'
      });

      await swarm.addTask(task);

      // Simulate task failure
      await swarm.updateTaskStatus(task.id, 'failed', {
        error: { message: 'Processing timeout', code: 408 }
      });

      // Check if task was reassigned
      const reassignedTask = await swarm.getTask(task.id);
      expect(reassignedTask.metadata.retries).toBe(1);

      // Should trigger reassignment after timeout
      setTimeout(async () => {
        const currentAssignment = await swarm.getTaskAssignment(task.id);
        if (currentAssignment) {
          expect(currentAssignment.agentId).not.toBe(worker.id);
        }
      }, 1000);
    });
  });

  describe('Real-time Agent Coordination', () => {
    it('should establish WebSocket connections for all agents', async () => {
      const connections = await swarm.getAgentConnections();

      expect(connections).toHaveLength(agents.length);
      connections.forEach(conn => {
        expect(conn.connected).toBe(true);
        expect(conn.agentId).toBeDefined();
      });
    });

    it('should handle agent heartbeat messages', async () => {
      const worker = agents.find(a => a.type === 'worker');

      // Simulate agent heartbeat
      await swarm.sendHeartbeat(worker.id, {
        status: 'active',
        currentTasks: 2,
        resourceUsage: {
          cpu: 65,
          memory: 512,
          network: 100
        }
      });

      const agentStatus = await swarm.getAgentStatus(worker.id);
      expect(agentStatus.status).toBe('active');
      expect(agentStatus.currentTasks).toBe(2);
      expect(agentStatus.resourceUsage.cpu).toBe(65);
    });

    it('should detect and handle agent disconnection', async () => {
      const worker = agents.find(a => a.type === 'worker');

      // Simulate agent disconnection
      await swarm.handleAgentDisconnection(worker.id);

      const agentStatus = await swarm.getAgentStatus(worker.id);
      expect(agentStatus.status).toBe('offline');

      // Should trigger reassignment of active tasks
      const activeTasks = await swarm.getAgentTasks(worker.id);
      expect(activeTasks.every(t => t.status === 'reassigning')).toBe(true);
    });

    it('should coordinate consensus among multiple agents', async () => {
      const proposal = {
        id: 'scaling-proposal',
        type: 'swarm_scaling',
        data: {
          action: 'scale_up',
          targetCount: 8,
          reason: 'high_task_load'
        },
        timeout: 5000
      };

      const consensusResult = await swarm.initiateConsensus(proposal);

      expect(consensusResult.consensusReached).toBeDefined();
      expect(consensusResult.votes).toHaveLength(agents.length - 1); // Excluding queen

      // Check if consensus was stored in memory
      const consensusMemory = await swarm.getConsensusRecord(proposal.id);
      expect(consensusMemory).toBeDefined();
    });
  });

  describe('Memory Coordination Integration', () => {
    it('should synchronize memory across all agents', async () => {
      const memoryEntry = {
        type: 'task_assignment',
        data: {
          taskId: 'task-123',
          agentId: 'worker-1',
          timestamp: Date.now()
        }
      };

      await swarm.storeSharedMemory(memoryEntry);

      // Verify memory is accessible to all agents
      const retrievedMemory = await swarm.getSharedMemory({
        type: 'task_assignment'
      });

      expect(retrievedMemory).toHaveLength(1);
      expect(retrievedMemory[0].data.taskId).toBe('task-123');
    });

    it('should maintain session consistency during agent operations', async () => {
      const worker = agents.find(a => a.type === 'worker');

      const session = await swarm.createAgentSession(worker.id, {
        startTime: Date.now(),
        metadata: {
          capabilities: worker.capabilities,
          maxTasks: worker.configuration.maxConcurrentTasks
        }
      });

      expect(session.agentId).toBe(worker.id);
      expect(session.status).toBe('active');

      // Perform some operations
      await swarm.assignTask('task-1', worker.id);
      await swarm.assignTask('task-2', worker.id);

      const updatedSession = await swarm.getAgentSession(worker.id);
      expect(updatedSession.metadata.activeTasks).toBe(2);
    });

    it('should handle memory cleanup and garbage collection', async () => {
      // Store old memory entries
      const oldTimestamp = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 days ago

      for (let i = 0; i < 50; i++) {
        await swarm.storeSharedMemory({
          type: 'test_memory',
          data: { index: i },
          timestamp: oldTimestamp + i
        });
      }

      // Run cleanup
      const cleanupResult = await swarm.cleanupMemory(Date.now() - (24 * 60 * 60 * 1000));

      expect(cleanupResult.deletedCount).toBeGreaterThan(0);
      expect(cleanupResult.deletedCount).toBeLessThanOrEqual(50);
    });
  });

  describe('Load Balancing Communication', () => {
    it('should redistribute tasks based on agent workload', async () => {
      const tasks = TaskFactory.createMany(20);
      await swarm.addTasks(tasks);

      // Get initial task distribution
      const initialDistribution = await swarm.getTaskDistribution();

      // Simulate some agents becoming overloaded
      const overloadedAgent = agents.find(a => a.type === 'worker');
      await swarm.updateAgentLoad(overloadedAgent.id, {
        currentTasks: 10,
        resourceUsage: { cpu: 95, memory: 90 }
      });

      // Trigger load balancing
      await swarm.balanceLoad();

      const newDistribution = await swarm.getTaskDistribution();

      // Overloaded agent should have fewer tasks after balancing
      const overloadedAgentTasks = newDistribution.find(
        d => d.agentId === overloadedAgent.id
      );
      expect(overloadedAgentTasks.taskCount).toBeLessThan(10);
    });

    it('should communicate scaling decisions to all agents', async () => {
      const scalingDecision = {
        action: 'scale_up',
        targetCount: 8,
        reason: 'high_load',
        newAgents: [
          {
            id: 'new-worker-1',
            type: 'worker',
            capabilities: ['data_processing']
          }
        ]
      };

      const broadcastSpy = jest.spyOn(swarm, 'broadcastMessage');

      await swarm.executeScalingDecision(scalingDecision);

      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'swarm_scaling',
          action: 'scale_up',
          targetCount: 8
        })
      );

      // Verify new agents were added
      const updatedAgents = await swarm.getAllAgents();
      expect(updatedAgents.length).toBe(9); // 8 + 1 queen
    });
  });

  describe('Error Recovery Communication', () => {
    it('should coordinate agent failure recovery', async () => {
      const failingAgent = agents.find(a => a.type === 'worker');
      const tasks = TaskFactory.createMany(5, {
        assignedAgentId: failingAgent.id,
        status: 'in_progress'
      });

      await swarm.addTasks(tasks);

      // Simulate agent failure
      await swarm.handleAgentFailure(failingAgent.id, {
        reason: 'process_crash',
        lastSeen: Date.now()
      });

      // Verify recovery steps
      const recoveryPlan = await swarm.getRecoveryPlan(failingAgent.id);
      expect(recoveryPlan.affectedTasks).toHaveLength(5);
      expect(recoveryPlan.reassignmentPlan).toHaveLength(5);

      // Verify tasks were reassigned
      setTimeout(async () => {
        const reassignedTasks = await Promise.all(
          tasks.map(task => swarm.getTask(task.id))
        );

        reassignedTasks.forEach(task => {
          expect(task.assignedAgentId).not.toBe(failingAgent.id);
          expect(task.status).toBe('pending' || 'assigned');
        });
      }, 1000);
    });

    it('should handle network partition scenarios', async () => {
      // Simulate network partition
      const partitionedAgents = agents.slice(0, 3);

      await swarm.handleNetworkPartition(partitionedAgents.map(a => a.id));

      partitionedAgents.forEach(async agent => {
        const status = await swarm.getAgentStatus(agent.id);
        expect(status.status).toBe('partitioned');
      });

      // Verify swarm continues with remaining agents
      const activeAgents = await swarm.getActiveAgents();
      expect(activeAgents.length).toBe(agents.length - 3);

      // Test recovery from partition
      await swarm.handleNetworkRecovery(partitionedAgents.map(a => a.id));

      const recoveredAgents = await Promise.all(
        partitionedAgents.map(agent => swarm.getAgentStatus(agent.id))
      );

      recoveredAgents.forEach(status => {
        expect(status.status).toBe('active');
      });
    });

    it('should maintain data consistency during failures', async () => {
      const criticalTask = TaskFactory.create({
        priority: 'critical',
        type: 'data_processing'
      });

      await swarm.addTask(criticalTask);

      // Store critical memory state
      await swarm.storeSharedMemory({
        type: 'critical_state',
        data: {
          taskId: criticalTask.id,
          checkpoint: 'processing_complete',
          timestamp: Date.now()
        }
      });

      // Simulate system failure and recovery
      await swarm.simulateSystemFailure();
      await swarm.recoverFromBackup();

      // Verify data consistency
      const recoveredTask = await swarm.getTask(criticalTask.id);
      expect(recoveredTask.id).toBe(criticalTask.id);

      const recoveredMemory = await swarm.getSharedMemory({
        type: 'critical_state',
        'data.taskId': criticalTask.id
      });

      expect(recoveredMemory).toHaveLength(1);
      expect(recoveredMemory[0].data.checkpoint).toBe('processing_complete');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume message passing', async () => {
      const messageCount = 1000;
      const startTime = performance.now();

      const messages = Array.from({ length: messageCount }, (_, index) => ({
        type: 'test_message',
        agentId: agents[index % agents.length].id,
        data: { index, timestamp: Date.now() }
      }));

      await Promise.all(
        messages.map(msg => swarm.sendMessage(msg.agentId, msg))
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all messages were processed
      const processedMessages = await swarm.getProcessedMessages();
      expect(processedMessages.length).toBeGreaterThanOrEqual(messageCount * 0.95); // 95% success rate
    });

    it('should scale efficiently with multiple agents', async () => {
      const initialAgents = await swarm.getAllAgents();
      const initialPerformance = await swarm.getPerformanceMetrics();

      // Add more agents
      const newAgents = AgentFactory.createMany(10, { type: 'worker' });
      await swarm.addAgents(newAgents);

      const scaledAgents = await swarm.getAllAgents();
      const scaledPerformance = await swarm.getPerformanceMetrics();

      expect(scaledAgents.length).toBe(initialAgents.length + 10);

      // Performance should not degrade significantly
      expect(scaledPerformance.averageResponseTime)
        .toBeLessThan(initialPerformance.averageResponseTime * 2);
    });
  });
});