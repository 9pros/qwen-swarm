import faker from 'faker';
import { Agent, AgentType, AgentStatus, AgentCapability } from '../../src/types/Agent';

export class AgentFactory {
  static create(overrides?: Partial<Agent>): Agent {
    const id = overrides?.id || `agent-${faker.datatype.uuid()}`;
    const type = overrides?.type || faker.random.arrayElement<AgentType>(['queen', 'worker', 'specialist']);
    const status = overrides?.status || faker.random.arrayElement<AgentStatus>(['idle', 'active', 'busy', 'offline']);

    return {
      id,
      type,
      status,
      name: overrides?.name || `${type}-${faker.name.jobType()}`,
      capabilities: overrides?.capabilities || this.generateCapabilities(type),
      performance: {
        tasksCompleted: faker.datatype.number({ min: 0, max: 1000 }),
        averageExecutionTime: faker.datatype.number({ min: 100, max: 5000 }),
        successRate: faker.datatype.float({ min: 0.8, max: 1.0, precision: 0.01 }),
        lastActive: faker.date.recent(),
        ...overrides?.performance
      },
      configuration: {
        maxConcurrentTasks: faker.datatype.number({ min: 1, max: 10 }),
        priority: faker.datatype.number({ min: 1, max: 10 }),
        resourceLimits: {
          memory: faker.datatype.number({ min: 512, max: 4096 }),
          cpu: faker.datatype.number({ min: 1, max: 8 }),
          network: faker.datatype.number({ min: 100, max: 1000 })
        },
        ...overrides?.configuration
      },
      metadata: {
        createdAt: overrides?.metadata?.createdAt || faker.date.past(),
        updatedAt: overrides?.metadata?.updatedAt || faker.date.recent(),
        version: overrides?.metadata?.version || '1.0.0',
        healthScore: faker.datatype.float({ min: 0.5, max: 1.0, precision: 0.01 }),
        ...overrides?.metadata
      },
      ...overrides
    };
  }

  static createQueen(overrides?: Partial<Agent>): Agent {
    return this.create({
      type: 'queen',
      status: 'active',
      capabilities: ['task_distribution', 'consensus', 'monitoring', 'coordination'],
      configuration: {
        maxConcurrentTasks: 100,
        priority: 10,
        resourceLimits: {
          memory: 2048,
          cpu: 4,
          network: 1000
        }
      },
      ...overrides
    });
  }

  static createWorker(overrides?: Partial<Agent>): Agent {
    return this.create({
      type: 'worker',
      status: 'idle',
      capabilities: faker.random.arrayElements([
        'data_processing',
        'analysis',
        'computation',
        'file_operations',
        'api_calls'
      ], { min: 1, max: 3 }),
      configuration: {
        maxConcurrentTasks: faker.datatype.number({ min: 1, max: 5 }),
        priority: faker.datatype.number({ min: 1, max: 5 }),
        resourceLimits: {
          memory: faker.datatype.number({ min: 512, max: 1024 }),
          cpu: faker.datatype.number({ min: 1, max: 2 }),
          network: faker.datatype.number({ min: 100, max: 500 })
        }
      },
      ...overrides
    });
  }

  static createSpecialist(overrides?: Partial<Agent>): Agent {
    return this.create({
      type: 'specialist',
      capabilities: faker.random.arrayElements([
        'machine_learning',
        'natural_language_processing',
        'computer_vision',
        'blockchain',
        'cryptography',
        'database_optimization'
      ], { min: 1, max: 2 }),
      configuration: {
        maxConcurrentTasks: faker.datatype.number({ min: 1, max: 3 }),
        priority: faker.datatype.number({ min: 5, max: 8 }),
        resourceLimits: {
          memory: faker.datatype.number({ min: 1024, max: 2048 }),
          cpu: faker.datatype.number({ min: 2, max: 4 }),
          network: faker.datatype.number({ min: 200, max: 800 })
        }
      },
      ...overrides
    });
  }

  static createMany(count: number, overrides?: Partial<Agent>): Agent[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        id: overrides?.id || `agent-${index}`
      })
    );
  }

  static createSwarm(queenCount: number = 1, workerCount: number = 5, specialistCount: number = 2): Agent[] {
    const agents: Agent[] = [];

    // Add queens
    agents.push(...Array.from({ length: queenCount }, () => this.createQueen()));

    // Add workers
    agents.push(...Array.from({ length: workerCount }, () => this.createWorker()));

    // Add specialists
    agents.push(...Array.from({ length: specialistCount }, () => this.createSpecialist()));

    return agents;
  }

  private static generateCapabilities(type: AgentType): AgentCapability[] {
    switch (type) {
      case 'queen':
        return ['task_distribution', 'consensus', 'monitoring', 'coordination'];
      case 'worker':
        return faker.random.arrayElements([
          'data_processing',
          'analysis',
          'computation',
          'file_operations',
          'api_calls'
        ], { min: 1, max: 3 });
      case 'specialist':
        return faker.random.arrayElements([
          'machine_learning',
          'natural_language_processing',
          'computer_vision',
          'blockchain',
          'cryptography',
          'database_optimization'
        ], { min: 1, max: 2 });
      default:
        return ['data_processing'];
    }
  }

  static createFailed(overrides?: Partial<Agent>): Agent {
    return this.create({
      status: 'offline',
      performance: {
        tasksCompleted: 0,
        averageExecutionTime: 0,
        successRate: 0,
        lastActive: faker.date.past(),
        healthScore: 0
      },
      metadata: {
        healthScore: 0,
        errors: [faker.lorem.sentence()]
      },
      ...overrides
    });
  }

  static createOverloaded(overrides?: Partial<Agent>): Agent {
    return this.create({
      status: 'busy',
      performance: {
        tasksCompleted: faker.datatype.number({ min: 500, max: 1000 }),
        averageExecutionTime: faker.datatype.number({ min: 4000, max: 10000 }),
        successRate: faker.datatype.float({ min: 0.5, max: 0.8, precision: 0.01 }),
        lastActive: faker.date.recent(),
        healthScore: faker.datatype.float({ min: 0.3, max: 0.6, precision: 0.01 })
      },
      ...overrides
    });
  }
}