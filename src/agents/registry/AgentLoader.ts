/**
 * Agent Loader
 *
 * Handles dynamic loading and instantiation of specialty agents
 */

import { AgentDefinition } from './AgentRegistry';
import { Skill } from '../../../.claude/flow/skills';

export interface AgentInstance {
  id: string;
  name: string;
  definition: AgentDefinition;
  instance: any;
  isActive: boolean;
  startTime: Date;
  lastUsed: Date;
  usageCount: number;
}

export interface LoaderConfig {
  maxConcurrentAgents: number;
  agentTimeout: number; // milliseconds
  enableCaching: boolean;
  enableMetrics: boolean;
}

export class AgentLoader {
  private loadedAgents: Map<string, AgentInstance> = new Map();
  private config: LoaderConfig;
  private metrics: Map<string, any> = new Map();

  constructor(config?: Partial<LoaderConfig>) {
    this.config = {
      maxConcurrentAgents: 10,
      agentTimeout: 300000, // 5 minutes
      enableCaching: true,
      enableMetrics: true,
      ...config
    };
  }

  /**
   * Load and instantiate an agent
   */
  async loadAgent(definition: AgentDefinition): Promise<AgentInstance> {
    const agentId = this.generateAgentId(definition);

    // Check if already loaded
    if (this.loadedAgents.has(agentId)) {
      const instance = this.loadedAgents.get(agentId)!;
      instance.lastUsed = new Date();
      instance.usageCount++;
      return instance;
    }

    // Check concurrent agent limit
    if (this.loadedAgents.size >= this.config.maxConcurrentAgents) {
      await this.unloadLeastUsedAgent();
    }

    try {
      // Create agent instance
      const agentInstance = await this.createAgentInstance(definition, agentId);

      // Store in loaded agents
      this.loadedAgents.set(agentId, agentInstance);

      // Initialize metrics if enabled
      if (this.config.enableMetrics) {
        this.initializeMetrics(agentId);
      }

      console.log(`Loaded agent: ${definition.name} (${agentId})`);
      return agentInstance;
    } catch (error) {
      console.error(`Failed to load agent ${definition.name}:`, error);
      throw error;
    }
  }

  /**
   * Unload an agent
   */
  async unloadAgent(agentId: string): Promise<void> {
    const instance = this.loadedAgents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      // Cleanup agent instance
      if (typeof instance.instance.cleanup === 'function') {
        await instance.instance.cleanup();
      }

      // Remove from loaded agents
      this.loadedAgents.delete(agentId);

      // Cleanup metrics
      this.metrics.delete(agentId);

      console.log(`Unloaded agent: ${instance.name} (${agentId})`);
    } catch (error) {
      console.error(`Failed to unload agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Execute an agent
   */
  async executeAgent(agentId: string, input: any): Promise<any> {
    const instance = this.loadedAgents.get(agentId);
    if (!instance) {
      throw new Error(`Agent ${agentId} not loaded`);
    }

    try {
      // Update usage metrics
      instance.lastUsed = new Date();
      instance.usageCount++;

      if (this.config.enableMetrics) {
        this.updateExecutionMetrics(agentId, 'start');
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => this.runAgent(instance.instance, input),
        this.config.agentTimeout
      );

      if (this.config.enableMetrics) {
        this.updateExecutionMetrics(agentId, 'success');
      }

      return result;
    } catch (error) {
      if (this.config.enableMetrics) {
        this.updateExecutionMetrics(agentId, 'error');
      }
      console.error(`Failed to execute agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get loaded agents
   */
  getLoadedAgents(): AgentInstance[] {
    return Array.from(this.loadedAgents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInstance | undefined {
    return this.loadedAgents.get(agentId);
  }

  /**
   * Get agent metrics
   */
  getMetrics(agentId?: string): any {
    if (agentId) {
      return this.metrics.get(agentId);
    }
    return Object.fromEntries(this.metrics);
  }

  /**
   * Unload all agents
   */
  async unloadAllAgents(): Promise<void> {
    const agentIds = Array.from(this.loadedAgents.keys());
    await Promise.all(agentIds.map(id => this.unloadAgent(id)));
  }

  /**
   * Cleanup expired agents
   */
  async cleanupExpiredAgents(maxIdleTime: number = 600000): Promise<void> {
    const now = Date.now();
    const expiredAgents: string[] = [];

    this.loadedAgents.forEach((instance, agentId) => {
      if (now - instance.lastUsed.getTime() > maxIdleTime) {
        expiredAgents.push(agentId);
      }
    });

    for (const agentId of expiredAgents) {
      await this.unloadAgent(agentId);
    }

    if (expiredAgents.length > 0) {
      console.log(`Cleaned up ${expiredAgents.length} expired agents`);
    }
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(definition: AgentDefinition): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${definition.name}-${timestamp}-${random}`;
  }

  /**
   * Create agent instance from definition
   */
  private async createAgentInstance(definition: AgentDefinition, agentId: string): Promise<AgentInstance> {
    // Create agent instance based on definition
    const instance = this.createAgentFromDefinition(definition);

    return {
      id: agentId,
      name: definition.name,
      definition,
      instance,
      isActive: true,
      startTime: new Date(),
      lastUsed: new Date(),
      usageCount: 0
    };
  }

  /**
   * Create agent implementation from definition
   */
  private createAgentFromDefinition(definition: AgentDefinition): any {
    // This would create an actual agent implementation
    // For now, return a mock that simulates the agent behavior
    return {
      name: definition.name,
      description: definition.description,
      tools: definition.tools,
      content: definition.content,

      async execute(input: any): Promise<any> {
        // Simulate agent execution
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 900));

        return {
          success: true,
          result: `Processed by ${definition.name}`,
          input,
          timestamp: new Date().toISOString()
        };
      },

      async cleanup(): Promise<void> {
        // Cleanup logic
      }
    };
  }

  /**
   * Unload least used agent
   */
  private async unloadLeastUsedAgent(): Promise<void> {
    let leastUsed: AgentInstance | null = null;
    let oldestTime = Date.now();

    this.loadedAgents.forEach(instance => {
      if (instance.lastUsed.getTime() < oldestTime) {
        oldestTime = instance.lastUsed.getTime();
        leastUsed = instance;
      }
    });

    if (leastUsed) {
      await this.unloadAgent(leastUsed.id);
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Agent execution timeout')), timeout)
      )
    ]);
  }

  /**
   * Run agent instance
   */
  private async runAgent(instance: any, input: any): Promise<any> {
    if (typeof instance.execute === 'function') {
      return await instance.execute(input);
    }
    throw new Error('Agent instance does not have execute method');
  }

  /**
   * Initialize metrics for agent
   */
  private initializeMetrics(agentId: string): void {
    this.metrics.set(agentId, {
      executions: 0,
      successes: 0,
      errors: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      lastExecution: null,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Update execution metrics
   */
  private updateExecutionMetrics(agentId: string, status: 'start' | 'success' | 'error'): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    if (status === 'start') {
      metrics.lastExecution = new Date().toISOString();
    } else if (status === 'success') {
      metrics.executions++;
      metrics.successes++;
    } else if (status === 'error') {
      metrics.executions++;
      metrics.errors++;
    }

    this.metrics.set(agentId, metrics);
  }
}

// Export singleton instance
export const agentLoader = new AgentLoader();