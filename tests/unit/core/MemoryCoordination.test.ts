import { MemoryCoordination } from '../../../src/core/MemoryCoordination';
import { testDb } from '../../helpers/TestDatabase';
import { AgentFactory } from '../../factories/AgentFactory';
import { TaskFactory } from '../../factories/TaskFactory';
import type { MemoryEntry, MemoryType, Session } from '../../../src/types';

describe('MemoryCoordination', () => {
  let memoryCoordination: MemoryCoordination;
  let testAgents: any[];
  let testTasks: any[];

  beforeAll(async () => {
    await testDb.start();
  });

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.reset();
    memoryCoordination = new MemoryCoordination(testDb.getDatabase());
    testAgents = AgentFactory.createMany(5);
    testTasks = TaskFactory.createMany(10);
  });

  describe('constructor', () => {
    it('should initialize with database connection', () => {
      expect(memoryCoordination).toBeInstanceOf(MemoryCoordination);
    });

    it('should throw error without database connection', () => {
      expect(() => {
        new MemoryCoordination(null as any);
      }).toThrow('MemoryCoordination requires a valid database connection');
    });
  });

  describe('store', () => {
    it('should store memory entry with correct structure', async () => {
      const entry: MemoryEntry = {
        id: 'memory-1',
        type: 'task_assignment',
        sessionId: 'session-1',
        data: {
          taskId: 'task-1',
          agentId: 'agent-1',
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        metadata: {
          source: 'queen-agent',
          priority: 'high'
        }
      };

      const result = await memoryCoordination.store(entry);

      expect(result).toBeDefined();
      expect(result.id).toBe(entry.id);
      expect(result.type).toBe(entry.type);
      expect(result.timestamp).toBe(entry.timestamp);
    });

    it('should generate ID if not provided', async () => {
      const entry: Partial<MemoryEntry> = {
        type: 'agent_status',
        sessionId: 'session-1',
        data: { agentId: 'agent-1', status: 'active' },
        timestamp: Date.now()
      };

      const result = await memoryCoordination.store(entry as MemoryEntry);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });

    it('should validate required fields', async () => {
      const invalidEntry = {
        sessionId: 'session-1',
        data: {}
      } as any;

      await expect(memoryCoordination.store(invalidEntry))
        .rejects.toThrow('Memory entry must have type and data fields');
    });

    it('should store multiple entries efficiently', async () => {
      const entries: MemoryEntry[] = Array.from({ length: 100 }, (_, index) => ({
        id: `memory-${index}`,
        type: 'test' as MemoryType,
        sessionId: `session-${index % 10}`,
        data: { index },
        timestamp: Date.now() + index
      }));

      const startTime = performance.now();
      const results = await Promise.all(
        entries.map(entry => memoryCoordination.store(entry))
      );
      const endTime = performance.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('retrieve', () => {
    beforeEach(async () => {
      // Store test data
      const entries: MemoryEntry[] = [
        {
          id: 'memory-1',
          type: 'task_assignment',
          sessionId: 'session-1',
          data: { taskId: 'task-1' },
          timestamp: Date.now()
        },
        {
          id: 'memory-2',
          type: 'agent_status',
          sessionId: 'session-1',
          data: { agentId: 'agent-1' },
          timestamp: Date.now() + 1000
        },
        {
          id: 'memory-3',
          type: 'task_assignment',
          sessionId: 'session-2',
          data: { taskId: 'task-2' },
          timestamp: Date.now() + 2000
        }
      ];

      await Promise.all(entries.map(entry => memoryCoordination.store(entry)));
    });

    it('should retrieve entries by session ID', async () => {
      const entries = await memoryCoordination.retrieve('session-1');

      expect(entries).toHaveLength(2);
      expect(entries.map(e => e.id)).toContain('memory-1');
      expect(entries.map(e => e.id)).toContain('memory-2');
    });

    it('should retrieve entries by type', async () => {
      const entries = await memoryCoordination.retrieve(undefined, {
        type: 'task_assignment'
      });

      expect(entries).toHaveLength(2);
      expect(entries.every(e => e.type === 'task_assignment')).toBe(true);
    });

    it('should retrieve entries with time range filter', async () => {
      const now = Date.now();
      const entries = await memoryCoordination.retrieve(undefined, {
        startTime: now,
        endTime: now + 1500
      });

      expect(entries).toHaveLength(2);
    });

    it('should retrieve entries with limit and offset', async () => {
      const entries = await memoryCoordination.retrieve(undefined, {
        limit: 1,
        offset: 1
      });

      expect(entries).toHaveLength(1);
    });

    it('should sort entries by timestamp', async () => {
      const entries = await memoryCoordination.retrieve('session-1', {
        sort: 'timestamp',
        order: 'desc'
      });

      expect(entries[0].id).toBe('memory-2'); // More recent
      expect(entries[1].id).toBe('memory-1'); // Less recent
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Store diverse test data
      const entries: MemoryEntry[] = [
        {
          id: 'memory-1',
          type: 'task_assignment',
          sessionId: 'session-1',
          data: { taskId: 'task-1', agentId: 'agent-1', priority: 'high' },
          timestamp: Date.now(),
          metadata: { source: 'queen-agent' }
        },
        {
          id: 'memory-2',
          type: 'agent_status',
          sessionId: 'session-2',
          data: { agentId: 'agent-2', status: 'active' },
          timestamp: Date.now(),
          metadata: { source: 'worker-agent' }
        }
      ];

      await Promise.all(entries.map(entry => memoryCoordination.store(entry)));
    });

    it('should query entries by data field', async () => {
      const entries = await memoryCoordination.query({
        'data.taskId': 'task-1'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('memory-1');
    });

    it('should query entries by metadata field', async () => {
      const entries = await memoryCoordination.query({
        'metadata.source': 'queen-agent'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('memory-1');
    });

    it('should support complex queries with multiple conditions', async () => {
      const entries = await memoryCoordination.query({
        type: 'task_assignment',
        'data.priority': 'high'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].data.priority).toBe('high');
    });

    it('should return empty array for non-matching queries', async () => {
      const entries = await memoryCoordination.query({
        'data.nonexistent': 'value'
      });

      expect(entries).toHaveLength(0);
    });
  });

  describe('session management', () => {
    describe('createSession', () => {
      it('should create new session with valid structure', async () => {
        const session: Session = {
          id: 'session-1',
          agentId: 'agent-1',
          startTime: Date.now(),
          endTime: null,
          status: 'active',
          metadata: {
            agentType: 'worker',
            capabilities: ['data_processing']
          }
        };

        const result = await memoryCoordination.createSession(session);

        expect(result.id).toBe(session.id);
        expect(result.agentId).toBe(session.agentId);
        expect(result.status).toBe('active');
      });

      it('should generate session ID if not provided', async () => {
        const session: Partial<Session> = {
          agentId: 'agent-1',
          startTime: Date.now(),
          status: 'active'
        };

        const result = await memoryCoordination.createSession(session as Session);

        expect(result.id).toBeDefined();
        expect(result.id).toMatch(/^[a-f0-9-]{36}$/);
      });
    });

    describe('getSession', () => {
      it('should retrieve session by ID', async () => {
        const session: Session = {
          id: 'session-1',
          agentId: 'agent-1',
          startTime: Date.now(),
          endTime: null,
          status: 'active'
        };

        await memoryCoordination.createSession(session);
        const retrieved = await memoryCoordination.getSession('session-1');

        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe('session-1');
        expect(retrieved!.agentId).toBe('agent-1');
      });

      it('should return null for non-existent session', async () => {
        const retrieved = await memoryCoordination.getSession('non-existent');
        expect(retrieved).toBeNull();
      });
    });

    describe('updateSession', () => {
      it('should update session status and metadata', async () => {
        const session: Session = {
          id: 'session-1',
          agentId: 'agent-1',
          startTime: Date.now(),
          endTime: null,
          status: 'active'
        };

        await memoryCoordination.createSession(session);

        const updates = {
          status: 'completed' as const,
          endTime: Date.now(),
          metadata: {
            tasksCompleted: 10,
            successRate: 0.95
          }
        };

        const updated = await memoryCoordination.updateSession('session-1', updates);

        expect(updated.status).toBe('completed');
        expect(updated.endTime).toBe(updates.endTime);
        expect(updated.metadata.tasksCompleted).toBe(10);
      });

      it('should throw error for non-existent session', async () => {
        await expect(memoryCoordination.updateSession('non-existent', {
          status: 'completed'
        })).rejects.toThrow('Session not found');
      });
    });

    describe('closeSession', () => {
      it('should close session and set end time', async () => {
        const session: Session = {
          id: 'session-1',
          agentId: 'agent-1',
          startTime: Date.now(),
          endTime: null,
          status: 'active'
        };

        await memoryCoordination.createSession(session);
        const closed = await memoryCoordination.closeSession('session-1');

        expect(closed.status).toBe('completed');
        expect(closed.endTime).toBeDefined();
        expect(closed.endTime).toBeGreaterThan(closed.startTime);
      });
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      // Store test data with various timestamps
      const now = Date.now();
      const oldTimestamp = now - (2 * 24 * 60 * 60 * 1000); // 2 days ago

      const entries: MemoryEntry[] = [
        {
          id: 'memory-recent',
          type: 'test',
          sessionId: 'session-1',
          data: {},
          timestamp: now
        },
        {
          id: 'memory-old',
          type: 'test',
          sessionId: 'session-2',
          data: {},
          timestamp: oldTimestamp
        }
      ];

      await Promise.all(entries.map(entry => memoryCoordination.store(entry)));
    });

    it('should clean up old entries', async () => {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 1 day ago
      const deleted = await memoryCoordination.cleanup(cutoffTime);

      expect(deleted.deletedCount).toBe(1);
      expect(deleted.deletedIds).toContain('memory-old');
    });

    it('should clean up old sessions', async () => {
      // Create an old completed session
      const oldSession: Session = {
        id: 'session-old',
        agentId: 'agent-1',
        startTime: Date.now() - (2 * 24 * 60 * 60 * 1000),
        endTime: Date.now() - (2 * 24 * 60 * 60 * 1000) + 60000,
        status: 'completed'
      };

      await memoryCoordination.createSession(oldSession);

      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
      const deleted = await memoryCoordination.cleanup(cutoffTime);

      expect(deleted.deletedSessionsCount).toBe(1);
      expect(deleted.deletedSessionIds).toContain('session-old');
    });
  });

  describe('performance monitoring', () => {
    it('should track operation performance', async () => {
      const entry: MemoryEntry = {
        id: 'perf-test',
        type: 'test',
        sessionId: 'session-1',
        data: { test: 'performance' },
        timestamp: Date.now()
      };

      const startTime = performance.now();
      await memoryCoordination.store(entry);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent operations', async () => {
      const entries: MemoryEntry[] = Array.from({ length: 50 }, (_, index) => ({
        id: `concurrent-${index}`,
        type: 'concurrent_test' as MemoryType,
        sessionId: `session-${index % 5}`,
        data: { index },
        timestamp: Date.now() + index
      }));

      const startTime = performance.now();
      const results = await Promise.all(
        entries.map(entry => memoryCoordination.store(entry))
      );
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      await testDb.stop();

      const entry: MemoryEntry = {
        id: 'error-test',
        type: 'test',
        sessionId: 'session-1',
        data: {},
        timestamp: Date.now()
      };

      await expect(memoryCoordination.store(entry))
        .rejects.toThrow();

      // Restart for other tests
      await testDb.start();
    });

    it('should validate input data', async () => {
      const invalidEntry = {
        type: null,
        sessionId: 'session-1',
        data: {}
      } as any;

      await expect(memoryCoordination.store(invalidEntry))
        .rejects.toThrow('Invalid memory entry');
    });
  });
});