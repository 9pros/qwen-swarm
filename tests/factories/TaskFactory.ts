import faker from 'faker';
import { Task, TaskType, TaskStatus, TaskPriority } from '../../src/types/Task';

export class TaskFactory {
  static create(overrides?: Partial<Task>): Task {
    const id = overrides?.id || `task-${faker.datatype.uuid()}`;
    const type = overrides?.type || faker.random.arrayElement<TaskType>([
      'data_processing',
      'analysis',
      'computation',
      'file_operation',
      'api_call',
      'machine_learning',
      'monitoring'
    ]);
    const status = overrides?.status || faker.random.arrayElement<TaskStatus>([
      'pending',
      'assigned',
      'in_progress',
      'completed',
      'failed',
      'cancelled'
    ]);
    const priority = overrides?.priority || faker.random.arrayElement<TaskPriority>([
      'low',
      'normal',
      'high',
      'critical'
    ]);

    return {
      id,
      type,
      status,
      priority,
      title: overrides?.title || faker.lorem.sentence(),
      description: overrides?.description || faker.lorem.paragraph(),
      payload: overrides?.payload || this.generatePayload(type),
      assignedAgentId: overrides?.assignedAgentId || null,
      dependencies: overrides?.dependencies || [],
      createdAt: overrides?.createdAt || faker.date.recent(),
      updatedAt: overrides?.updatedAt || faker.date.recent(),
      startedAt: overrides?.startedAt,
      completedAt: overrides?.completedAt,
      executionTime: overrides?.executionTime || faker.datatype.number({ min: 100, max: 10000 }),
      result: overrides?.result || null,
      error: overrides?.error || null,
      metadata: {
        retries: faker.datatype.number({ min: 0, max: 3 }),
        maxRetries: faker.datatype.number({ min: 1, max: 5 }),
        timeout: faker.datatype.number({ min: 30000, max: 300000 }),
        estimatedDuration: faker.datatype.number({ min: 1000, max: 60000 }),
        actualDuration: overrides?.metadata?.actualDuration,
        resourceUsage: {
          memory: faker.datatype.number({ min: 50, max: 500 }),
          cpu: faker.datatype.number({ min: 10, max: 90 }),
          network: faker.datatype.number({ min: 0, max: 100 })
        },
        ...overrides?.metadata
      },
      ...overrides
    };
  }

  static createDataProcessing(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'data_processing',
      title: 'Process dataset analysis',
      description: 'Analyze and process incoming data streams',
      payload: {
        inputFormat: 'json',
        outputFormat: 'csv',
        transformations: ['filter', 'aggregate', 'sort'],
        datasetSize: faker.datatype.number({ min: 1000, max: 100000 })
      },
      ...overrides
    });
  }

  static createAnalysis(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'analysis',
      title: 'Perform data analysis',
      description: 'Analyze trends and generate insights',
      payload: {
        analysisType: 'statistical',
        metrics: ['mean', 'median', 'std_dev'],
        visualizations: ['chart', 'graph']
      },
      ...overrides
    });
  }

  static createComputation(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'computation',
      title: 'Execute complex computation',
      description: 'Perform mathematical calculations',
      payload: {
        algorithm: 'matrix_multiplication',
        inputSize: faker.datatype.number({ min: 100, max: 10000 }),
        precision: 'double'
      },
      ...overrides
    });
  }

  static createFileOperation(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'file_operation',
      title: 'Process file operations',
      description: 'Handle file system operations',
      payload: {
        operation: faker.random.arrayElement(['read', 'write', 'copy', 'move', 'delete']),
        filePath: faker.system.filePath(),
        fileSize: faker.datatype.number({ min: 1024, max: 104857600 }),
        encoding: 'utf-8'
      },
      ...overrides
    });
  }

  static createApiCall(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'api_call',
      title: 'Execute API request',
      description: 'Make external API call',
      payload: {
        method: faker.random.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
        url: faker.internet.url(),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${faker.datatype.uuid()}`
        },
        body: faker.lorem.paragraph()
      },
      ...overrides
    });
  }

  static createMachineLearning(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'machine_learning',
      title: 'Train ML model',
      description: 'Train machine learning model',
      payload: {
        modelType: faker.random.arrayElement(['neural_network', 'random_forest', 'svm']),
        trainingData: faker.datatype.number({ min: 1000, max: 100000 }),
        epochs: faker.datatype.number({ min: 10, max: 1000 }),
        learningRate: faker.datatype.float({ min: 0.001, max: 0.1, precision: 0.001 })
      },
      ...overrides
    });
  }

  static createMonitoring(overrides?: Partial<Task>): Task {
    return this.create({
      type: 'monitoring',
      title: 'System health check',
      description: 'Monitor system performance',
      payload: {
        metrics: ['cpu', 'memory', 'disk', 'network'],
        interval: faker.datatype.number({ min: 1000, max: 60000 }),
        thresholds: {
          cpu: 80,
          memory: 85,
          disk: 90
        }
      },
      ...overrides
    });
  }

  static createHighPriority(overrides?: Partial<Task>): Task {
    return this.create({
      priority: 'critical',
      metadata: {
        timeout: faker.datatype.number({ min: 5000, max: 30000 }),
        maxRetries: 1
      },
      ...overrides
    });
  }

  static createFailed(overrides?: Partial<Task>): Task {
    return this.create({
      status: 'failed',
      error: {
        message: faker.lorem.sentence(),
        code: faker.datatype.number({ min: 400, max: 599 }),
        stack: faker.lorem.paragraphs()
      },
      metadata: {
        retries: faker.datatype.number({ min: 1, max: 3 }),
        actualDuration: faker.datatype.number({ min: 30000, max: 300000 })
      },
      ...overrides
    });
  }

  static createCompleted(overrides?: Partial<Task>): Task {
    return this.create({
      status: 'completed',
      result: {
        output: faker.lorem.paragraph(),
        metrics: {
          processedItems: faker.datatype.number({ min: 100, max: 10000 }),
          successRate: faker.datatype.float({ min: 0.9, max: 1.0, precision: 0.01 }),
          executionTime: faker.datatype.number({ min: 100, max: 5000 })
        }
      },
      completedAt: faker.date.recent(),
      metadata: {
        actualDuration: faker.datatype.number({ min: 1000, max: 60000 }),
        resourceUsage: {
          memory: faker.datatype.number({ min: 100, max: 1000 }),
          cpu: faker.datatype.number({ min: 20, max: 80 }),
          network: faker.datatype.number({ min: 10, max: 200 })
        }
      },
      ...overrides
    });
  }

  static createMany(count: number, overrides?: Partial<Task>): Task[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        id: overrides?.id || `task-${index}`
      })
    );
  }

  static createWorkflow(taskCount: number = 5): Task[] {
    const tasks: Task[] = [];

    for (let i = 0; i < taskCount; i++) {
      const task = this.create({
        id: `workflow-task-${i}`,
        dependencies: i > 0 ? [`workflow-task-${i - 1}`] : [],
        priority: i === 0 ? 'high' : 'normal'
      });
      tasks.push(task);
    }

    return tasks;
  }

  private static generatePayload(type: TaskType): any {
    switch (type) {
      case 'data_processing':
        return {
          inputFormat: 'json',
          outputFormat: 'csv',
          transformations: ['filter', 'aggregate']
        };
      case 'analysis':
        return {
          analysisType: 'statistical',
          metrics: ['mean', 'median']
        };
      case 'computation':
        return {
          algorithm: 'sort',
          inputSize: 1000
        };
      case 'file_operation':
        return {
          operation: 'read',
          filePath: '/tmp/test.json'
        };
      case 'api_call':
        return {
          method: 'GET',
          url: 'https://api.example.com/data'
        };
      case 'machine_learning':
        return {
          modelType: 'neural_network',
          epochs: 100
        };
      case 'monitoring':
        return {
          metrics: ['cpu', 'memory'],
          interval: 5000
        };
      default:
        return {};
    }
  }
}