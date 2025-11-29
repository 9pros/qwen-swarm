import { z } from 'zod';
import type { AgentConfig, ProviderConfig, SecurityContext } from '@/types';

const ProviderConfigSchema = z.object({
  type: z.enum(['qwen', 'openai', 'claude', 'local', 'custom']),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string(),
  maxTokens: z.number().min(1).max(100000),
  temperature: z.number().min(0).max(2),
  timeout: z.number().min(1000),
  rateLimit: z.object({
    requestsPerSecond: z.number().min(0.1),
    tokensPerSecond: z.number().min(1),
    burstLimit: z.number().min(1),
    retryAfter: z.number().min(1000)
  })
});

const SecurityContextSchema = z.object({
  encryptionEnabled: z.boolean(),
  authenticationRequired: z.boolean(),
  allowedOrigins: z.array(z.string()),
  permissions: z.array(z.object({
    id: z.string(),
    resource: z.string(),
    actions: z.array(z.string()),
    conditions: z.record(z.unknown())
  })),
  auditEnabled: z.boolean()
});

const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['queen', 'worker', 'specialist']),
  role: z.object({
    type: z.enum(['strategic', 'tactical', 'operational', 'analytical', 'creative']),
    permissions: z.array(z.object({
      id: z.string(),
      resource: z.string(),
      actions: z.array(z.string()),
      conditions: z.record(z.unknown())
    })),
    expertise: z.array(z.string()),
    priority: z.number().min(1).max(10)
  }),
  provider: ProviderConfigSchema,
  capabilities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    enabled: z.boolean(),
    configuration: z.record(z.unknown())
  })),
  maxConcurrency: z.number().min(1).max(100),
  memorySize: z.number().min(1000),
  autoScale: z.boolean(),
  healthCheckInterval: z.number().min(1000),
  retryPolicy: z.object({
    maxAttempts: z.number().min(1).max(10),
    backoffMultiplier: z.number().min(1).max(5),
    initialDelay: z.number().min(100),
    maxDelay: z.number().min(1000),
    retryableErrors: z.array(z.string())
  }),
  securityContext: SecurityContextSchema
});

const SystemConfigSchema = z.object({
  system: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']),
    maxAgents: z.number().min(1),
    autoScaling: z.boolean(),
    monitoring: z.object({
      enabled: z.boolean(),
      interval: z.number().min(1000),
      retention: z.number().min(86400000)
    })
  }),
  database: z.object({
    type: z.enum(['sqlite', 'postgres', 'mysql']),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string(),
    username: z.string().optional(),
    password: z.string().optional(),
    ssl: z.boolean().optional(),
    poolSize: z.number().min(1).max(100)
  }),
  redis: z.object({
    enabled: z.boolean(),
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
    db: z.number().min(0).max(15),
    ttl: z.number().min(60)
  }),
  api: z.object({
    port: z.number().min(1).max(65535),
    host: z.string(),
    cors: z.boolean(),
    rateLimit: z.object({
      windowMs: z.number().min(1000),
      max: z.number().min(1)
    }),
    timeout: z.number().min(1000)
  }),
  websocket: z.object({
    port: z.number().min(1).max(65535),
    host: z.string(),
    path: z.string(),
    heartbeatInterval: z.number().min(1000)
  }),
  security: SecurityContextSchema,
  learning: z.object({
    enabled: z.boolean(),
    algorithm: z.enum(['reinforcement', 'genetic', 'neural', 'hybrid']),
    learningRate: z.number().min(0.001).max(1),
    explorationRate: z.number().min(0).max(1),
    memorySize: z.number().min(1000),
    evaluationInterval: z.number().min(60000)
  })
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export class ConfigManager {
  private config: SystemConfig;
  private agentConfigs: Map<string, AgentConfig> = new Map();

  constructor(configPath?: string) {
    this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): void {
    try {
      if (configPath) {
        const fileConfig = this.loadFromFile(configPath);
        this.config = SystemConfigSchema.parse(fileConfig);
      } else {
        this.config = this.getDefaultConfig();
      }

      // Override with environment variables
      this.applyEnvironmentOverrides();

      // Validate configuration
      this.validateConfig();

    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  private loadFromFile(configPath: string): Partial<SystemConfig> {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(configPath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Configuration file not found: ${fullPath}`);
      }

      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to read configuration file: ${error}`);
    }
  }

  private getDefaultConfig(): SystemConfig {
    return {
      system: {
        name: 'Qwen Swarm',
        version: '1.0.0',
        environment: 'development',
        logLevel: 'info',
        maxAgents: 50,
        autoScaling: true,
        monitoring: {
          enabled: true,
          interval: 30000,
          retention: 604800000 // 7 days
        }
      },
      database: {
        type: 'sqlite',
        database: 'qwen-swarm.db',
        poolSize: 10
      },
      redis: {
        enabled: false,
        host: 'localhost',
        port: 6379,
        db: 0,
        ttl: 3600
      },
      api: {
        port: 3000,
        host: '0.0.0.0',
        cors: true,
        rateLimit: {
          windowMs: 60000,
          max: 100
        },
        timeout: 30000
      },
      websocket: {
        port: 3001,
        host: '0.0.0.0',
        path: '/ws',
        heartbeatInterval: 30000
      },
      security: {
        encryptionEnabled: false,
        authenticationRequired: true,
        allowedOrigins: ['*'],
        permissions: [],
        auditEnabled: true
      },
      learning: {
        enabled: true,
        algorithm: 'hybrid',
        learningRate: 0.01,
        explorationRate: 0.1,
        memorySize: 10000,
        evaluationInterval: 300000
      }
    };
  }

  private applyEnvironmentOverrides(): void {
    const env = process.env;

    if (env.NODE_ENV) {
      this.config.system.environment = env.NODE_ENV as any;
    }

    if (env.LOG_LEVEL) {
      this.config.system.logLevel = env.LOG_LEVEL as any;
    }

    if (env.API_PORT) {
      this.config.api.port = parseInt(env.API_PORT);
    }

    if (env.WS_PORT) {
      this.config.websocket.port = parseInt(env.WS_PORT);
    }

    if (env.DB_TYPE) {
      this.config.database.type = env.DB_TYPE as any;
    }

    if (env.DB_HOST) {
      this.config.database.host = env.DB_HOST;
    }

    if (env.DB_PORT) {
      this.config.database.port = parseInt(env.DB_PORT);
    }

    if (env.DB_NAME) {
      this.config.database.database = env.DB_NAME;
    }

    if (env.REDIS_ENABLED === 'true') {
      this.config.redis.enabled = true;
    }

    if (env.REDIS_HOST) {
      this.config.redis.host = env.REDIS_HOST;
    }

    if (env.REDIS_PORT) {
      this.config.redis.port = parseInt(env.REDIS_PORT);
    }
  }

  private validateConfig(): void {
    const result = SystemConfigSchema.safeParse(this.config);
    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }
  }

  public getSystemConfig(): SystemConfig {
    return { ...this.config };
  }

  public getAgentConfig(agentId: string): AgentConfig | undefined {
    return this.agentConfigs.get(agentId);
  }

  public setAgentConfig(agentConfig: AgentConfig): void {
    const result = AgentConfigSchema.safeParse(agentConfig);
    if (!result.success) {
      throw new Error(`Invalid agent configuration: ${result.error.message}`);
    }
    this.agentConfigs.set(agentConfig.id, agentConfig);
  }

  public removeAgentConfig(agentId: string): boolean {
    return this.agentConfigs.delete(agentId);
  }

  public getAllAgentConfigs(): AgentConfig[] {
    return Array.from(this.agentConfigs.values());
  }

  public updateSystemConfig(updates: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  public saveConfig(filePath: string): void {
    try {
      const fs = require('fs');
      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(filePath, configData, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  public validateProviderConfig(providerConfig: unknown): ProviderConfig {
    return ProviderConfigSchema.parse(providerConfig);
  }

  public createDefaultAgentConfig(
    id: string,
    name: string,
    type: 'queen' | 'worker' | 'specialist',
    providerConfig: ProviderConfig
  ): AgentConfig {
    return {
      id,
      name,
      type,
      role: {
        type: 'operational',
        permissions: [],
        expertise: [],
        priority: 5
      },
      provider: providerConfig,
      capabilities: [],
      maxConcurrency: 5,
      memorySize: 10000,
      autoScale: true,
      healthCheckInterval: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMIT']
      },
      securityContext: this.config.security
    };
  }
}

export const configManager = new ConfigManager();