/**
 * Chaos Engineering Framework
 * Tests system resilience, fault tolerance, and recovery capabilities
 */

import { performance } from 'perf_hooks';
import { SwarmOrchestrator } from '../../src/core/orchestrator';
import { AgentFactory } from '../factories/AgentFactory';
import { TaskFactory } from '../factories/TaskFactory';

interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: 'network' | 'resource' | 'process' | 'data' | 'timing' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  steadyState: any;
  hypothesis: string;
  method: (orchestrator: SwarmOrchestrator) => Promise<void>;
  rollback?: (orchestrator: SwarmOrchestrator) => Promise<void>;
  metrics: string[];
  duration: number;
}

interface ExperimentResult {
  experimentId: string;
  success: boolean;
  steadyStateMaintained: boolean;
  recoveryTime: number;
  dataLoss: boolean;
  performanceDegradation: number;
  errorRate: number;
  details: any;
  metrics: Record<string, number>;
}

interface BlastRadius {
  affectedComponents: string[];
  impactRadius: 'local' | 'regional' | 'global';
  cascadeFailures: number;
  recoveryDependencies: string[];
}

export class ChaosEngineeringFramework {
  private orchestrator: SwarmOrchestrator;
  private experiments: Map<string, ChaosExperiment> = new Map();
  private baselineMetrics: Record<string, number> = {};
  private runningExperiments: Set<string> = new Set();

  constructor() {
    this.setupChaosExperiments();
  }

  private setupChaosExperiments(): void {
    // Network Chaos Experiments
    this.experiments.set('network_latency', {
      id: 'network_latency',
      name: 'Network Latency Injection',
      description: 'Inject network latency to test system responsiveness',
      type: 'network',
      severity: 'medium',
      steadyState: { averageResponseTime: 500, errorRate: 0.01 },
      hypothesis: 'System maintains responsiveness with 2s network latency',
      method: this.injectNetworkLatency.bind(this),
      rollback: this.restoreNetworkLatency.bind(this),
      metrics: ['response_time', 'error_rate', 'throughput'],
      duration: 30000
    });

    this.experiments.set('network_partition', {
      id: 'network_partition',
      name: 'Network Partition Simulation',
      description: 'Simulate network partition to test distributed coordination',
      type: 'network',
      severity: 'high',
      steadyState: { consensusSuccess: 0.95, taskCompletion: 0.98 },
      hypothesis: 'Swarm maintains consensus coordination during partial network partition',
      method: this.simulateNetworkPartition.bind(this),
      rollback: this.healNetworkPartition.bind(this),
      metrics: ['consensus_success_rate', 'task_completion_rate', 'agent_connectivity'],
      duration: 45000
    });

    this.experiments.set('packet_loss', {
      id: 'packet_loss',
      name: 'Packet Loss Injection',
      description: 'Inject packet loss to test message reliability',
      type: 'network',
      severity: 'medium',
      steadyState: { messageDelivery: 0.99, dataIntegrity: 1.0 },
      hypothesis: 'System handles 10% packet loss without data corruption',
      method: this.injectPacketLoss.bind(this),
      rollback: this.restorePacketLoss.bind(this),
      metrics: ['message_delivery_rate', 'data_integrity', 'retry_count'],
      duration: 20000
    });

    // Resource Chaos Experiments
    this.experiments.set('memory_pressure', {
      id: 'memory_pressure',
      name: 'Memory Pressure Simulation',
      description: 'Consume memory to test system behavior under memory constraints',
      type: 'resource',
      severity: 'high',
      steadyState: { memoryUsage: 0.7, responseTime: 1000 },
      hypothesis: 'System degrades gracefully under memory pressure without crashing',
      method: this.simulateMemoryPressure.bind(this),
      rollback: this.releaseMemoryPressure.bind(this),
      metrics: ['memory_usage', 'gc_frequency', 'oom_errors', 'response_time'],
      duration: 25000
    });

    this.experiments.set('cpu_exhaustion', {
      id: 'cpu_exhaustion',
      name: 'CPU Exhaustion Simulation',
      description: 'Consume CPU cycles to test system under CPU pressure',
      type: 'resource',
      severity: 'high',
      steadyState: { cpuUsage: 0.8, throughput: 100 },
      hypothesis: 'System maintains core functions under 90% CPU load',
      method: this.simulateCPUExhaustion.bind(this),
      rollback: this.releaseCPUExhaustion.bind(this),
      metrics: ['cpu_usage', 'throughput', 'response_time', 'task_queue_size'],
      duration: 20000
    });

    this.experiments.set('disk_io_pressure', {
      id: 'disk_io_pressure',
      name: 'Disk I/O Pressure',
      description: 'Generate disk I/O pressure to test persistence operations',
      type: 'resource',
      severity: 'medium',
      steadyState: { writeLatency: 50, readLatency: 10 },
      hypothesis: 'System maintains data integrity under disk I/O pressure',
      method: this.simulateDiskIOPressure.bind(this),
      rollback: this.releaseDiskIOPressure.bind(this),
      metrics: ['write_latency', 'read_latency', 'data_corruption', 'backup_success'],
      duration: 30000
    });

    // Process Chaos Experiments
    this.experiments.set('agent_crash', {
      id: 'agent_crash',
      name: 'Agent Process Crash',
      description: 'Simulate random agent process crashes',
      type: 'process',
      severity: 'high',
      steadyState: { activeAgents: 10, taskRedistribution: 1.0 },
      hypothesis: 'Swarm redistributes tasks from crashed agents without losing work',
      method: this.simulateAgentCrash.bind(this),
      rollback: this.recoverAgents.bind(this),
      metrics: ['active_agent_count', 'task_redistribution_time', 'work_loss', 'recovery_time'],
      duration: 15000
    });

    this.experiments.set('process_kill', {
      id: 'process_kill',
      name: 'Process Termination',
      description: 'Kill critical processes to test failover mechanisms',
      type: 'process',
      severity: 'critical',
      steadyState: { serviceAvailability: 1.0, failoverTime: 5000 },
      hypothesis: 'Critical services failover within 10 seconds without data loss',
      method: this.killCriticalProcesses.bind(this),
      rollback: this.restartCriticalProcesses.bind(this),
      metrics: ['service_availability', 'failover_time', 'data_consistency', 'recovery_success'],
      duration: 20000
    });

    // Data Chaos Experiments
    this.experiments.set('database_corruption', {
      id: 'database_corruption',
      name: 'Database Corruption Simulation',
      description: 'Corrupt database entries to test data integrity mechanisms',
      type: 'data',
      severity: 'critical',
      steadyState: { dataIntegrity: 1.0, backupRecovery: 1.0 },
      hypothesis: 'System detects and recovers from data corruption using backups',
      method: this.simulateDatabaseCorruption.bind(this),
      rollback: this.restoreDatabaseFromBackup.bind(this),
      metrics: ['data_integrity_score', 'corruption_detection_time', 'recovery_time', 'backup_validity'],
      duration: 25000
    });

    this.experiments.set('cache_invalidation', {
      id: 'cache_invalidation',
      name: 'Cache Invalidation',
      description: 'Invalidate cache entries to test system without caching optimization',
      type: 'data',
      severity: 'medium',
      steadyState: { cacheHitRate: 0.8, responseTime: 200 },
      hypothesis: 'System functions correctly with zero cache hits',
      method: this.invalidateCache.bind(this),
      rollback: this.rebuildCache.bind(this),
      metrics: ['cache_hit_rate', 'database_load', 'response_time', 'system_stability'],
      duration: 15000
    });

    // Timing Chaos Experiments
    this.experiments.set('clock_drift', {
      id: 'clock_drift',
      name: 'Clock Drift Simulation',
      description: 'Introduce clock drift to test time-dependent operations',
      type: 'timing',
      severity: 'medium',
      steadyState: { syncAccuracy: 0.99, timeoutReliability: 1.0 },
      hypothesis: 'System handles clock drift up to 5 seconds without breaking consensus',
      method: this.simulateClockDrift.bind(this),
      rollback: this.synchronizeClocks.bind(this),
      metrics: ['clock_sync_accuracy', 'timeout_reliability', 'consensus_consistency', 'task_timing'],
      duration: 20000
    });

    this.experiments.set('random_delays', {
      id: 'random_delays',
      name: 'Random Delay Injection',
      description: 'Inject random delays in operations to test timing robustness',
      type: 'timing',
      severity: 'low',
      steadyState: { timingVariance: 0.1, reliability: 0.99 },
      hypothesis: 'System maintains reliability with random operation delays',
      method: this.injectRandomDelays.bind(this),
      rollback: this.removeRandomDelays.bind(this),
      metrics: ['timing_variance', 'operation_reliability', 'timeout_frequency', 'user_experience'],
      duration: 25000
    });

    // Dependency Chaos Experiments
    this.experiments.set('api_dependency_failure', {
      id: 'api_dependency_failure',
      name: 'API Dependency Failure',
      description: 'Fail external API dependencies to test fallback mechanisms',
      type: 'dependency',
      severity: 'high',
      steadyState: { fallbackUsage: 0.05, serviceAvailability: 1.0 },
      hypothesis: 'System gracefully fails over to fallbacks when external APIs fail',
      method: this.failAPIDependencies.bind(this),
      rollback: this.restoreAPIDependencies.bind(this),
      metrics: ['fallback_activation_rate', 'service_degradation', 'error_handling', 'user_impact'],
      duration: 20000
    });

    this.experiments.set('service_discovery_failure', {
      id: 'service_discovery_failure',
      description: 'Fail service discovery to test static configuration fallback',
      type: 'dependency',
      severity: 'high',
      steadyState: { serviceAvailability: 1.0, configReliance: 0.1 },
      hypothesis: 'System operates with static service configuration when discovery fails',
      method: this.failServiceDiscovery.bind(this),
      rollback: this.restoreServiceDiscovery.bind(this),
      metrics: ['static_config_usage', 'service_connectivity', 'recovery_time', 'manual_intervention'],
      duration: 15000
    });
  }

  async initialize(): Promise<void> {
    this.orchestrator = new SwarmOrchestrator({
      system: { name: 'Chaos-Engineering-Test', version: '1.0.0', environment: 'chaos' },
      resilience: {
        autoRecovery: true,
        circuitBreaker: true,
        bulkheads: true,
        timeoutHandling: true
      }
    });

    await this.orchestrator.initialize();
    await this.establishBaselineMetrics();
  }

  private async establishBaselineMetrics(): Promise<void> {
    console.log('Establishing baseline metrics for chaos experiments...');

    const agents = AgentFactory.createMany(10);
    await this.orchestrator.addAgents(agents);

    const tasks = TaskFactory.createMany(50);
    await this.orchestrator.executeTasks(tasks);

    this.baselineMetrics = {
      averageResponseTime: await this.measureAverageResponseTime(),
      errorRate: await this.measureErrorRate(),
      throughput: await this.measureThroughput(),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: await this.measureCPUUsage(),
      consensusSuccessRate: await this.measureConsensusSuccess(),
      taskCompletionRate: await this.measureTaskCompletionRate(),
      messageDeliveryRate: await this.measureMessageDeliveryRate()
    };

    console.log('Baseline metrics established:', this.baselineMetrics);
  }

  async runChaosSuite(): Promise<{
    summary: {
      totalExperiments: number;
      passedExperiments: number;
      failedExperiments: number;
      overallResilience: number;
    };
    results: ExperimentResult[];
    blastRadii: Record<string, BlastRadius>;
    recommendations: string[];
  }> {
    console.log('🔥 Starting Chaos Engineering Test Suite...');

    const results: ExperimentResult[] = [];
    const blastRadii: Record<string, BlastRadius> = {};

    for (const [experimentId, experiment] of this.experiments) {
      if (this.runningExperiments.has(experimentId)) {
        console.warn(`Experiment ${experimentId} is already running, skipping...`);
        continue;
      }

      console.log(`Running chaos experiment: ${experiment.name}`);

      try {
        const result = await this.runChaosExperiment(experiment);
        results.push(result);

        const blastRadius = await this.calculateBlastRadius(experimentId, result);
        blastRadii[experimentId] = blastRadius;

        // Brief recovery period between experiments
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Chaos experiment ${experimentId} failed:`, error);
        results.push({
          experimentId,
          success: false,
          steadyStateMaintained: false,
          recoveryTime: -1,
          dataLoss: true,
          performanceDegradation: 1.0,
          errorRate: 1.0,
          details: { error: error.message },
          metrics: {}
        });
      }
    }

    const summary = this.generateChaosSummary(results);
    const recommendations = this.generateChaosRecommendations(results, blastRadii);

    return {
      summary,
      results,
      blastRadii,
      recommendations
    };
  }

  private async runChaosExperiment(experiment: ChaosExperiment): Promise<ExperimentResult> {
    this.runningExperiments.add(experiment.id);

    const startTime = performance.now();
    const steadyStateBefore = await this.captureSteadyState(experiment.metrics);

    let steadyStateMaintained = false;
    let dataLoss = false;
    let performanceDegradation = 0;
    let errorRate = 0;
    let experimentMetrics: Record<string, number> = {};

    try {
      console.log(`Injecting chaos: ${experiment.name}`);

      // Execute the chaos method
      await experiment.method(this.orchestrator);

      // Monitor during chaos
      const steadyStateDuring = await this.captureSteadyState(experiment.metrics);
      experimentMetrics = steadyStateDuring;

      // Wait for chaos duration
      await new Promise(resolve => setTimeout(resolve, experiment.duration));

      // Check steady state during chaos
      steadyStateMaintained = this.evaluateSteadyState(experiment.steadyState, steadyStateDuring);

      // Calculate performance degradation
      performanceDegradation = this.calculatePerformanceDegradation(steadyStateBefore, steadyStateDuring);
      errorRate = steadyStateDuring.error_rate || 0;

      // Check for data loss
      dataLoss = await this.checkDataLoss();

      console.log(`Chaos injected, measuring recovery...`);

    } catch (error) {
      console.error(`Chaos experiment failed:`, error);
      dataLoss = true;
      errorRate = 1.0;
    }

    // Rollback the chaos
    if (experiment.rollback) {
      try {
        await experiment.rollback(this.orchestrator);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }

    // Measure recovery time
    const recoveryStartTime = performance.now();
    const recovered = await this.waitForRecovery(experiment.steadyState, 30000); // 30 second timeout
    const recoveryTime = recovered ? performance.now() - recoveryStartTime : -1;

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    this.runningExperiments.delete(experiment.id);

    return {
      experimentId: experiment.id,
      success: recovered && !dataLoss,
      steadyStateMaintained,
      recoveryTime,
      dataLoss,
      performanceDegradation,
      errorRate,
      details: {
        duration: totalDuration,
        hypothesis: experiment.hypothesis,
        severity: experiment.severity,
        type: experiment.type
      },
      metrics: experimentMetrics
    };
  }

  private async captureSteadyState(metrics: string[]): Promise<Record<string, number>> {
    const state: Record<string, number> = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'response_time':
          state[metric] = await this.measureAverageResponseTime();
          break;
        case 'error_rate':
          state[metric] = await this.measureErrorRate();
          break;
        case 'throughput':
          state[metric] = await this.measureThroughput();
          break;
        case 'memory_usage':
          state[metric] = process.memoryUsage().heapUsed / 1024 / 1024;
          break;
        case 'cpu_usage':
          state[metric] = await this.measureCPUUsage();
          break;
        case 'consensus_success_rate':
          state[metric] = await this.measureConsensusSuccess();
          break;
        case 'task_completion_rate':
          state[metric] = await this.measureTaskCompletionRate();
          break;
        case 'message_delivery_rate':
          state[metric] = await this.measureMessageDeliveryRate();
          break;
        case 'active_agent_count':
          state[metric] = (await this.orchestrator.getAllAgents()).length;
          break;
        case 'data_integrity':
          state[metric] = await this.measureDataIntegrity();
          break;
        case 'service_availability':
          state[metric] = await this.measureServiceAvailability();
          break;
        default:
          state[metric] = 0; // Default for unknown metrics
      }
    }

    return state;
  }

  private evaluateSteadyState(expected: any, actual: Record<string, number>): boolean {
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = actual[key];
      if (actualValue === undefined) return false;

      const tolerance = 0.2; // 20% tolerance
      const deviation = Math.abs(actualValue - expectedValue) / expectedValue;
      if (deviation > tolerance) {
        return false;
      }
    }
    return true;
  }

  private calculatePerformanceDegradation(before: Record<string, number>, after: Record<string, number>): number {
    let totalDegradation = 0;
    let metricCount = 0;

    for (const [key, beforeValue] of Object.entries(before)) {
      const afterValue = after[key];
      if (afterValue !== undefined && beforeValue > 0) {
        const degradation = Math.max(0, (afterValue - beforeValue) / beforeValue);
        totalDegradation += degradation;
        metricCount++;
      }
    }

    return metricCount > 0 ? totalDegradation / metricCount : 0;
  }

  private async waitForRecovery(expectedState: any, timeout: number): Promise<boolean> {
    const startTime = performance.now();

    while (performance.now() - startTime < timeout) {
      const currentState = await this.captureSteadyState(Object.keys(expectedState));
      if (this.evaluateSteadyState(expectedState, currentState)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }

  // Chaos Experiment Implementations

  private async injectNetworkLatency(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateNetworkCondition('latency', {
      minDelay: 1000,
      maxDelay: 3000,
      affectedNodes: 0.5 // 50% of nodes
    });
  }

  private async restoreNetworkLatency(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.restoreNetworkCondition('latency');
  }

  private async simulateNetworkPartition(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateNetworkPartition({
      partitionRatio: 0.3, // 30% of nodes partitioned
      bidirectional: false // One-way partition
    });
  }

  private async healNetworkPartition(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.healNetworkPartition();
  }

  private async injectPacketLoss(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateNetworkCondition('packet_loss', {
      lossRate: 0.1, // 10% packet loss
      burstSize: 5
    });
  }

  private async restorePacketLoss(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.restoreNetworkCondition('packet_loss');
  }

  private async simulateMemoryPressure(orchestrator: SwarmOrchestrator): Promise<void> {
    // Allocate memory to simulate pressure
    const memoryPressureArray: Buffer[] = [];
    const targetMemory = 1024 * 1024 * 1024; // 1GB

    try {
      while (Buffer.byteLength(JSON.stringify(memoryPressureArray)) < targetMemory) {
        memoryPressureArray.push(Buffer.alloc(1024 * 1024)); // 1MB chunks
      }
    } catch (error) {
      // Memory allocation failed, which is expected under pressure
    }

    // Store reference for cleanup
    (orchestrator as any).memoryPressureArray = memoryPressureArray;
  }

  private async releaseMemoryPressure(orchestrator: SwarmOrchestrator): Promise<void> {
    if ((orchestrator as any).memoryPressureArray) {
      (orchestrator as any).memoryPressureArray = [];
    }
    if (global.gc) {
      global.gc();
    }
  }

  private async simulateCPUExhaustion(orchestrator: SwarmOrchestrator): Promise<void> {
    const cpuIntensiveTask = () => {
      const start = Date.now();
      while (Date.now() - start < 1000) {
        Math.random() * Math.random(); // CPU intensive operation
      }
    };

    // Start multiple CPU-intensive tasks
    const cpuTasks: Promise<void>[] = [];
    for (let i = 0; i < 8; i++) { // Start 8 CPU intensive tasks
      cpuTasks.push(new Promise(resolve => {
        const interval = setInterval(cpuIntensiveTask, 100);
        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 20000);
      }));
    }

    (orchestrator as any).cpuTasks = cpuTasks;
  }

  private async releaseCPUExhaustion(orchestrator: SwarmOrchestrator): Promise<void> {
    if ((orchestrator as any).cpuTasks) {
      // CPU tasks will terminate on their own timeout
      (orchestrator as any).cpuTasks = [];
    }
  }

  private async simulateDiskIOPressure(orchestrator: SwarmOrchestrator): Promise<void> {
    const fs = require('fs');
    const writePromises: Promise<void>[] = [];

    // Generate disk I/O pressure
    for (let i = 0; i < 10; i++) {
      writePromises.push(new Promise(resolve => {
        const data = Buffer.alloc(1024 * 1024); // 1MB
        const interval = setInterval(() => {
          fs.writeFile(`/tmp/chaos_disk_test_${i}_${Date.now()}.tmp`, data, () => {});
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 15000);
      }));
    }

    (orchestrator as any).diskIOTasks = writePromises;
  }

  private async releaseDiskIOPressure(orchestrator: SwarmOrchestrator): Promise<void> {
    // Clean up temporary files
    const fs = require('fs');
    const path = require('path');
    const tempDir = '/tmp';

    try {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        if (file.startsWith('chaos_disk_test_')) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async simulateAgentCrash(orchestrator: SwarmOrchestrator): Promise<void> {
    const agents = await orchestrator.getAllAgents();
    const crashCount = Math.floor(agents.length * 0.3); // Crash 30% of agents

    for (let i = 0; i < crashCount; i++) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      await orchestrator.simulateAgentCrash(randomAgent.id);
    }
  }

  private async recoverAgents(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.recoverCrashedAgents();
  }

  private async killCriticalProcesses(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateProcessFailure('consensus_manager');
    await orchestrator.simulateProcessFailure('task_distributor');
  }

  private async restartCriticalProcesses(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.restartProcess('consensus_manager');
    await orchestrator.restartProcess('task_distributor');
  }

  private async simulateDatabaseCorruption(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateDataCorruption({
      table: 'tasks',
      corruptionRate: 0.05, // 5% corruption rate
      corruptionType: 'random_bytes'
    });
  }

  private async restoreDatabaseFromBackup(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.restoreFromBackup();
  }

  private async invalidateCache(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.invalidateAllCaches();
  }

  private async rebuildCache(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.rebuildCaches();
  }

  private async simulateClockDrift(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateClockDrift({
      driftAmount: 5000, // 5 seconds
      affectedNodes: 0.4 // 40% of nodes
    });
  }

  private async synchronizeClocks(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.synchronizeClocks();
  }

  private async injectRandomDelays(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.injectRandomDelays({
      minDelay: 100,
      maxDelay: 2000,
      affectedOperations: ['task_execution', 'consensus', 'communication']
    });
  }

  private async removeRandomDelays(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.removeRandomDelays();
  }

  private async failAPIDependencies(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateAPIFailure('external_ai_service');
    await orchestrator.simulateAPIFailure('model_provider');
  }

  private async restoreAPIDependencies(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.restoreAPIService('external_ai_service');
    await orchestrator.restoreAPIService('model_provider');
  }

  private async failServiceDiscovery(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.simulateServiceDiscoveryFailure();
  }

  private async restoreServiceDiscovery(orchestrator: SwarmOrchestrator): Promise<void> {
    await orchestrator.restoreServiceDiscovery();
  }

  // Measurement Methods

  private async measureAverageResponseTime(): Promise<number> {
    const tasks = TaskFactory.createMany(10);
    const times: number[] = [];

    for (const task of tasks) {
      const start = performance.now();
      await this.orchestrator.executeTask(task);
      times.push(performance.now() - start);
    }

    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  private async measureErrorRate(): Promise<number> {
    const tasks = TaskFactory.createMany(20, { induceError: Math.random() < 0.1 }); // 10% error rate
    let errors = 0;

    for (const task of tasks) {
      try {
        await this.orchestrator.executeTask(task);
      } catch (error) {
        errors++;
      }
    }

    return errors / tasks.length;
  }

  private async measureThroughput(): Promise<number> {
    const tasks = TaskFactory.createMany(50);
    const start = performance.now();

    await Promise.all(tasks.map(task => this.orchestrator.executeTask(task)));

    const duration = performance.now() - start;
    return tasks.length / (duration / 1000); // tasks per second
  }

  private async measureCPUUsage(): Promise<number> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const endUsage = process.cpuUsage(startUsage);

    return (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
  }

  private async measureConsensusSuccess(): Promise<number> {
    const consensusTests = 10;
    let successes = 0;

    for (let i = 0; i < consensusTests; i++) {
      try {
        const result = await this.orchestrator.initiateConsensus({
          id: `test-consensus-${i}`,
          type: 'test',
          data: {},
          timeout: 5000
        });
        if (result.reached) successes++;
      } catch (error) {
        // Consensus failed
      }
    }

    return successes / consensusTests;
  }

  private async measureTaskCompletionRate(): Promise<number> {
    const tasks = TaskFactory.createMany(30);
    const results = await Promise.allSettled(
      tasks.map(task => this.orchestrator.executeTask(task))
    );

    return results.filter(r => r.status === 'fulfilled').length / tasks.length;
  }

  private async measureMessageDeliveryRate(): Promise<number> {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: `test-message-${i}`,
      content: `Test message ${i}`
    }));

    const delivered = await Promise.all(
      messages.map(msg => this.orchestrator.sendMessage('test-target', msg))
    );

    return delivered.filter(success => success).length / messages.length;
  }

  private async measureDataIntegrity(): Promise<number> {
    return await this.orchestrator.verifyDataIntegrity();
  }

  private async measureServiceAvailability(): Promise<number> {
    const services = ['api', 'consensus', 'task_distributor', 'communication'];
    let availableServices = 0;

    for (const service of services) {
      if (await this.orchestrator.isServiceAvailable(service)) {
        availableServices++;
      }
    }

    return availableServices / services.length;
  }

  private async checkDataLoss(): Promise<boolean> {
    return !(await this.orchestrator.verifyDataIntegrity());
  }

  private async calculateBlastRadius(experimentId: string, result: ExperimentResult): Promise<BlastRadius> {
    const affectedComponents = await this.orchestrator.getAffectedComponents(experimentId);
    const cascadeFailures = await this.orchestrator.countCascadeFailures(experimentId);
    const recoveryDependencies = await this.orchestrator.getRecoveryDependencies(experimentId);

    let impactRadius: 'local' | 'regional' | 'global' = 'local';
    if (affectedComponents.length > 5) impactRadius = 'regional';
    if (affectedComponents.length > 10 || cascadeFailures > 3) impactRadius = 'global';

    return {
      affectedComponents,
      impactRadius,
      cascadeFailures,
      recoveryDependencies
    };
  }

  private generateChaosSummary(results: ExperimentResult[]): any {
    const totalExperiments = results.length;
    const passedExperiments = results.filter(r => r.success).length;
    const failedExperiments = totalExperiments - passedExperiments;
    const overallResilience = (passedExperiments / totalExperiments) * 100;

    return {
      totalExperiments,
      passedExperiments,
      failedExperiments,
      overallResilience
    };
  }

  private generateChaosRecommendations(
    results: ExperimentResult[],
    blastRadii: Record<string, BlastRadius>
  ): string[] {
    const recommendations: string[] = [];

    const failedExperiments = results.filter(r => !r.success);
    const slowRecovery = results.filter(r => r.recoveryTime > 10000); // > 10 seconds
    const highDataLoss = results.filter(r => r.dataLoss);

    if (failedExperiments.length > 0) {
      recommendations.push(`${failedExperiments.length} experiment(s) failed. Review system resilience mechanisms and improve error handling.`);
    }

    if (slowRecovery.length > 0) {
      recommendations.push('Recovery times are slow. Implement faster detection and automated recovery mechanisms.');
    }

    if (highDataLoss.length > 0) {
      recommendations.push('Data loss detected in chaos experiments. Strengthen backup and data integrity mechanisms.');
    }

    const globalImpacts = Object.entries(blastRadii).filter(([_, radius]) => radius.impactRadius === 'global');
    if (globalImpacts.length > 0) {
      recommendations.push('Some failures have global impact. Implement bulkheads and isolation patterns to contain failures.');
    }

    const highCascade = Object.entries(blastRadii).filter(([_, radius]) => radius.cascadeFailures > 2);
    if (highCascade.length > 0) {
      recommendations.push('Cascade failures detected. Review dependencies and implement circuit breakers.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent system resilience! Consider running more aggressive chaos experiments to find edge cases.');
    }

    return recommendations;
  }

  async cleanup(): Promise<void> {
    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }
  }
}

// Test Suite for Chaos Engineering
describe('Chaos Engineering', () => {
  let chaosFramework: ChaosEngineeringFramework;

  beforeAll(async () => {
    chaosFramework = new ChaosEngineeringFramework();
    await chaosFramework.initialize();
  }, 120000);

  afterAll(async () => {
    await chaosFramework.cleanup();
  });

  it('should pass comprehensive chaos engineering tests', async () => {
    const results = await chaosFramework.runChaosSuite();

    expect(results.summary.overallResilience).toBeGreaterThan(70); // 70% resilience minimum
    expect(results.summary.failedExperiments).toBeLessThan(results.summary.totalExperiments * 0.3);
    expect(results.results).toBeDefined();
    expect(results.blastRadii).toBeDefined();
    expect(results.recommendations).toBeDefined();

    console.log('Chaos Engineering Results:', {
      overallResilience: `${results.summary.overallResilience.toFixed(1)}%`,
      passed: `${results.summary.passedExperiments}/${results.summary.totalExperiments}`,
      recommendations: results.recommendations.length
    });

    // Check for critical failures
    const criticalFailures = results.results.filter(r =>
      r.details.severity === 'critical' && !r.success
    );
    expect(criticalFailures.length).toBe(0);
  }, 900000); // 15 minutes for full chaos suite

  it('should recover gracefully from agent failures', async () => {
    const agentCrashExperiment = chaosFramework['experiments'].get('agent_crash');
    const result = await chaosFramework['runChaosExperiment'](agentCrashExperiment);

    expect(result.success).toBe(true);
    expect(result.dataLoss).toBe(false);
    expect(result.recoveryTime).toBeGreaterThan(0);
    expect(result.recoveryTime).toBeLessThan(30000); // Recover within 30 seconds
  }, 120000);

  it('should maintain data integrity during resource pressure', async () => {
    const memoryExperiment = chaosFramework['experiments'].get('memory_pressure');
    const result = await chaosFramework['runChaosExperiment'](memoryExperiment);

    expect(result.dataLoss).toBe(false);
    expect(result.steadyStateMaintained).toBe(true);
  }, 120000);

  it('should handle network partitions without complete failure', async () => {
    const partitionExperiment = chaosFramework['experiments'].get('network_partition');
    const result = await chaosFramework['runChaosExperiment'](partitionExperiment);

    expect(result.success).toBe(true);
    expect(result.recoveryTime).toBeLessThan(60000); // Recover within 1 minute
  }, 120000);
});