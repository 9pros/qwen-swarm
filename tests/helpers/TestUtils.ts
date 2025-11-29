import { performance } from 'perf_hooks';
import { WebSocket } from 'ws';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';
import { testDb } from './TestDatabase';

export class TestUtils {
  /**
   * Performance measurement utilities
   */
  static async measureTime<T>(
    operation: () => Promise<T>,
    label?: string
  ): Promise<{ result: T; duration: number; label?: string }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === 'test') {
      console.log(`${label ? `${label}: ` : ''}Operation completed in ${duration.toFixed(2)}ms`);
    }

    return { result, duration, label };
  }

  static async benchmarkOperation<T>(
    operation: () => Promise<T>,
    iterations: number = 100
  ): Promise<{
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    iterations: number;
  }> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureTime(operation, `Iteration ${i + 1}`);
      durations.push(duration);
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      averageDuration,
      minDuration,
      maxDuration,
      totalDuration,
      iterations
    };
  }

  /**
   * Memory usage monitoring
   */
  static getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  static trackMemoryUsage(
    label: string
  ): { initial: NodeJS.MemoryUsage; final: NodeJS.MemoryUsage; delta: any } {
    const initial = this.getMemoryUsage();

    return {
      initial,
      final: {} as NodeJS.MemoryUsage,
      delta: {} as any,

      stop() {
        this.final = this.getMemoryUsage();
        this.delta = {
          rss: this.final.rss - this.initial.rss,
          heapUsed: this.final.heapUsed - this.initial.heapUsed,
          heapTotal: this.final.heapTotal - this.initial.heapTotal,
          external: this.final.external - this.initial.external,
          arrayBuffers: this.final.arrayBuffers - this.initial.arrayBuffers
        };

        if (process.env.NODE_ENV === 'test') {
          console.log(`${label} Memory Delta:`, {
            rss: `${(this.delta.rss / 1024 / 1024).toFixed(2)}MB`,
            heapUsed: `${(this.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(this.delta.heapTotal / 1024 / 1024).toFixed(2)}MB`
          });
        }

        return this.delta;
      }
    };
  }

  /**
   * WebSocket testing utilities
   */
  static createTestWebSocket(port: number = 8080): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);

      ws.on('open', () => resolve(ws));
      ws.on('error', reject);

      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });
  }

  static async sendAndWaitForResponse<T>(
    ws: WebSocket,
    message: any,
    responseType: string,
    timeout: number = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Response timeout for ${responseType}`));
      }, timeout);

      const messageHandler = (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === responseType) {
            clearTimeout(timeoutId);
            ws.removeListener('message', messageHandler);
            resolve(parsed);
          }
        } catch (error) {
          // Ignore JSON parse errors
        }
      };

      ws.on('message', messageHandler);
      ws.send(JSON.stringify(message));
    });
  }

  /**
   * Test data generation with realistic scenarios
   */
  static createRealisticSwarm(
    queenCount: number = 1,
    workerCount: number = 8,
    specialistCount: number = 3,
    taskCount: number = 100
  ): {
    agents: any[];
    tasks: any[];
    scenarios: string[];
  } {
    const agents = AgentFactory.createSwarm(queenCount, workerCount, specialistCount);
    const tasks = TaskFactory.createMany(taskCount);

    // Create realistic task distribution
    const taskTypes = ['data_processing', 'analysis', 'computation', 'file_operation', 'api_call'];
    const priorities = ['critical', 'high', 'normal', 'low'];

    tasks.forEach((task, index) => {
      task.type = taskTypes[index % taskTypes.length] as any;
      task.priority = priorities[Math.floor(Math.random() * priorities.length)] as any;
      task.dependencies = index > 10 ? [tasks[index - 10].id] : [];
    });

    // Define test scenarios
    const scenarios = [
      'normal_operation',
      'high_load',
      'agent_failure',
      'network_partition',
      'resource_exhaustion',
      'consensus_timeout',
      'task_distribution',
      'auto_scaling',
      'security_breach',
      'data_corruption'
    ];

    return { agents, tasks, scenarios };
  }

  /**
   * Chaos engineering utilities
   */
  static async simulateRandomFailure(
    agents: any[],
    failureRate: number = 0.3
  ): Promise<string[]> {
    const failedAgents: string[] = [];
    const failureCount = Math.floor(agents.length * failureRate);

    for (let i = 0; i < failureCount; i++) {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const agent = agents[randomIndex];

      if (!failedAgents.includes(agent.id)) {
        failedAgents.push(agent.id);
      }
    }

    return failedAgents;
  }

  static async simulateNetworkLatency(
    ws: WebSocket,
    minLatency: number = 100,
    maxLatency: number = 1000
  ): Promise<void> {
    const latency = Math.random() * (maxLatency - minLatency) + minLatency;

    return new Promise(resolve => {
      setTimeout(() => {
        // Simulate packet loss
        if (Math.random() > 0.05) { // 5% packet loss
          resolve();
        }
      }, latency);
    });
  }

  /**
   * Security testing utilities
   */
  static generateMaliciousPayloads(): any[] {
    return [
      {
        name: "SQL Injection",
        payload: "'; DROP TABLE agents; --"
      },
      {
        name: "XSS",
        payload: "<script>alert('XSS')</script>"
      },
      {
        name: "Command Injection",
        payload: "`rm -rf /`"
      },
      {
        name: "NoSQL Injection",
        payload: { "$ne": null }
      },
      {
        name: "Prototype Pollution",
        payload: "__proto__.polluted = true"
      },
      {
        name: "Buffer Overflow",
        payload: "A".repeat(10000)
      },
      {
        name: "Type Confusion",
        payload: { number: "not_a_number" }
      },
      {
        name: "Regex DoS",
        payload: "a".repeat(100000) + "b"
      }
    ];
  }

  static async testSecurityVulnerability(
    target: string,
    payload: any,
    expectedStatus: number = 400
  ): Promise<{ vulnerable: boolean; response?: any }> {
    try {
      const response = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const vulnerable = response.status !== expectedStatus;
      return {
        vulnerable,
        response: await response.json().catch(() => null)
      };
    } catch (error) {
      return { vulnerable: true, response: error };
    }
  }

  /**
   * Load testing utilities
   */
  static async generateLoad(
    target: string,
    concurrentUsers: number = 100,
    duration: number = 60000,
    requestGenerator: () => any
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  }> {
    const startTime = Date.now();
    const endTime = startTime + duration;

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];

    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      workers.push(this.workerThread(target, endTime, requestGenerator));
    }

    const results = await Promise.all(workers);

    results.forEach(result => {
      totalRequests += result.totalRequests;
      successfulRequests += result.successfulRequests;
      failedRequests += result.failedRequests;
      responseTimes.push(...result.responseTimes);
    });

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const actualDuration = Date.now() - startTime;
    const requestsPerSecond = totalRequests / (actualDuration / 1000);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsPerSecond
    };
  }

  private static async workerThread(
    target: string,
    endTime: number,
    requestGenerator: () => any
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    responseTimes: number[];
  }> {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];

    while (Date.now() < endTime) {
      try {
        const startTime = performance.now();
        const payload = requestGenerator();

        const response = await fetch(target, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);
        totalRequests++;

        if (response.ok) {
          successfulRequests++;
        } else {
          failedRequests++;
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

      } catch (error) {
        failedRequests++;
        totalRequests++;
      }
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      responseTimes
    };
  }

  /**
   * Test environment utilities
   */
  static async setupTestEnvironment(): Promise<void> {
    await testDb.reset();

    // Create test indexes
    const db = testDb.getDatabase();
    await db.collection('agents').createIndex({ id: 1 }, { unique: true });
    await db.collection('tasks').createIndex({ id: 1 }, { unique: true });
    await db.collection('memory').createIndex({ timestamp: 1 });
  }

  static async cleanupTestEnvironment(): Promise<void> {
    await testDb.reset();
  }

  static async createTestSnapshot(label: string): Promise<string> {
    const timestamp = Date.now();
    const snapshotId = `${label}-${timestamp}`;

    const collections = ['agents', 'tasks', 'memory', 'sessions'];
    const snapshot: any = { id: snapshotId, timestamp };

    for (const collectionName of collections) {
      const data = await testDb.findDocuments(collectionName);
      snapshot[collectionName] = data;
    }

    await testDb.getCollection('test_snapshots').insertOne(snapshot);
    return snapshotId;
  }

  static async restoreTestSnapshot(snapshotId: string): Promise<void> {
    const snapshot = await testDb.getCollection('test_snapshots').findOne({ id: snapshotId });

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    await testDb.reset();

    const collections = ['agents', 'tasks', 'memory', 'sessions'];
    for (const collectionName of collections) {
      if (snapshot[collectionName] && snapshot[collectionName].length > 0) {
        await testDb.insertTestData(collectionName, snapshot[collectionName]);
      }
    }
  }

  /**
   * Assertion helpers
   */
  static assertValidAgent(agent: any): void {
    expect(agent).toHaveProperty('id');
    expect(agent).toHaveProperty('type');
    expect(agent).toHaveProperty('status');
    expect(agent).toHaveProperty('capabilities');
    expect(agent).toHaveProperty('performance');
    expect(agent).toHaveProperty('configuration');
    expect(['queen', 'worker', 'specialist']).toContain(agent.type);
    expect(['idle', 'active', 'busy', 'offline']).toContain(agent.status);
  }

  static assertValidTask(task: any): void {
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('type');
    expect(task).toHaveProperty('status');
    expect(task).toHaveProperty('priority');
    expect(task).toHaveProperty('payload');
    expect(['pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled']).toContain(task.status);
    expect(['low', 'normal', 'high', 'critical']).toContain(task.priority);
  }

  static assertSystemHealth(health: any, expectedFunctional: boolean = true): void {
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('functional');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('resourceUtilization');
    expect(health.functional).toBe(expectedFunctional);
    expect(health.uptime).toBeGreaterThan(0);
    expect(health.resourceUtilization).toHaveProperty('cpu');
    expect(health.resourceUtilization).toHaveProperty('memory');
    expect(health.resourceUtilization).toHaveProperty('network');
  }

  /**
   * Test report generation
   */
  static generateTestReport(testResults: any[]): string {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(test => test.status === 'passed').length;
    const failedTests = testResults.filter(test => test.status === 'failed').length;
    const skippedTests = testResults.filter(test => test.status === 'skipped').length;

    const passRate = ((passedTests / totalTests) * 100).toFixed(2);

    const report = `
# Test Report

## Summary
- Total Tests: ${totalTests}
- Passed: ${passedTests}
- Failed: ${failedTests}
- Skipped: ${skippedTests}
- Pass Rate: ${passRate}%

## Failed Tests
${testResults
  .filter(test => test.status === 'failed')
  .map(test => `- ${test.name}: ${test.error || 'Unknown error'}`)
  .join('\n')}

## Performance Metrics
${testResults
  .filter(test => test.duration)
  .map(test => `- ${test.name}: ${test.duration}ms`)
  .join('\n')}

## Coverage Report
Coverage: ${process.env.COVERAGE || 'Not available'}
`;

    return report;
  }
}