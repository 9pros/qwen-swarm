import EventEmitter from 'eventemitter3';
import type { ProviderConfig, ModelSpec, HealthCheckConfig, CostOptimizationConfig, LoadBalancingConfig } from '@/types';
import { Logger } from '@/utils/logger';

export interface ConfigurationEvent {
  type: 'provider_added' | 'provider_updated' | 'provider_removed' | 'model_added' | 'model_removed' | 'config_validated' | 'config_deployed' | 'rollback_triggered';
  timestamp: Date;
  entityId: string;
  entityType: 'provider' | 'model' | 'config';
  changes?: Record<string, any>;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface ConfigurationSchema {
  version: string;
  providers: ProviderConfiguration[];
  globalSettings: GlobalSettings;
  validationRules: ValidationRule[];
  deploymentPolicy: DeploymentPolicy;
}

export interface ProviderConfiguration {
  id: string;
  type: string;
  name: string;
  description: string;
  config: ProviderConfig;
  status: 'active' | 'inactive' | 'testing' | 'deprecated';
  metadata: Record<string, unknown>;
  models: string[];
  healthCheck: HealthCheckConfig;
  costOptimization: CostOptimizationConfig;
  loadBalancing: LoadBalancingConfig;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface GlobalSettings {
  defaultTimeout: number;
  defaultRetryAttempts: number;
  globalRateLimit: {
    requestsPerSecond: number;
    tokensPerSecond: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: Record<string, number>;
  };
  security: {
    encryptionEnabled: boolean;
    allowedOrigins: string[];
    auditEnabled: boolean;
  };
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'required' | 'format' | 'range' | 'custom';
  field: string;
  condition: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface DeploymentPolicy {
  strategy: 'immediate' | 'blue_green' | 'canary' | 'rolling';
  rolloutPercentage?: number;
  healthCheckThreshold: number;
  rollbackThreshold: number;
  testingDuration: number;
  approvedEnvironments: string[];
}

export interface ConfigurationDiff {
  added: ProviderConfiguration[];
  updated: { old: ProviderConfiguration; new: ProviderConfiguration }[];
  removed: ProviderConfiguration[];
  summary: {
    totalChanges: number;
    criticalChanges: number;
    providerCount: number;
    modelCount: number;
  };
}

export interface DeploymentResult {
  success: boolean;
  deployedProviders: string[];
  failedProviders: { id: string; error: Error }[];
  rollbackTriggered: boolean;
  rollbackReason?: string;
  deploymentTime: number;
  healthStatus: Record<string, boolean>;
  metrics: {
    beforeDeployment: Record<string, number>;
    afterDeployment: Record<string, number>;
  };
}

export interface DynamicConfigurationEvents {
  'config:changed': (event: ConfigurationEvent) => void;
  'config:validated': (schema: ConfigurationSchema, result: ValidationResult) => void;
  'deployment:started': (schema: ConfigurationSchema) => void;
  'deployment:completed': (result: DeploymentResult) => void;
  'deployment:failed': (error: Error) => void;
  'rollback:triggered': (reason: string) => void;
  'rollback:completed': (success: boolean) => void;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
  score: number;
}

export interface ValidationError {
  ruleId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fix?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export class DynamicProviderConfiguration extends EventEmitter<DynamicConfigurationEvents> {
  private currentConfig: ConfigurationSchema | null = null;
  private configHistory: ConfigurationSchema[] = [];
  private pendingConfig: ConfigurationSchema | null = null;
  private logger: Logger;
  private validationRules: Map<string, ValidationRule> = new Map();
  private deploymentInProgress: boolean = false;
  private maxHistorySize: number = 50;
  private autoValidation: boolean = true;
  private autoBackup: boolean = true;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'DynamicProviderConfiguration' });
    this.initializeDefaultValidationRules();
  }

  // Configuration Management
  public async loadConfiguration(configPath?: string): Promise<ConfigurationSchema> {
    try {
      let config: ConfigurationSchema;

      if (configPath) {
        // Load from file
        const configData = await this.loadConfigurationFile(configPath);
        config = this.parseConfiguration(configData);
      } else {
        // Load from environment or database
        config = await this.loadConfigurationFromSource();
      }

      // Validate configuration
      const validationResult = await this.validateConfiguration(config);
      if (!validationResult.valid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Store in history
      this.addToHistory(config);
      this.currentConfig = config;

      this.logger.info('Configuration loaded successfully', {
        version: config.version,
        providerCount: config.providers.length
      });

      this.emit('config:changed', {
        type: 'config_validated',
        timestamp: new Date(),
        entityId: config.version,
        entityType: 'config',
        metadata: { validationResult }
      } as ConfigurationEvent);

      return config;
    } catch (error) {
      this.logger.error('Failed to load configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async updateConfiguration(updates: Partial<ConfigurationSchema>, validate: boolean = true): Promise<ConfigurationSchema> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    try {
      const updatedConfig: ConfigurationSchema = {
        ...this.currentConfig,
        ...updates,
        version: this.generateVersion(),
        providers: updates.providers || this.currentConfig.providers,
        globalSettings: {
          ...this.currentConfig.globalSettings,
          ...(updates.globalSettings || {})
        }
      };

      if (validate && this.autoValidation) {
        const validationResult = await this.validateConfiguration(updatedConfig);
        if (!validationResult.valid) {
          throw new Error(`Configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Create diff for tracking
      const diff = this.createConfigurationDiff(this.currentConfig, updatedConfig);

      this.pendingConfig = updatedConfig;

      this.logger.info('Configuration updated', {
        version: updatedConfig.version,
        changes: diff.summary.totalChanges,
        criticalChanges: diff.summary.criticalChanges
      });

      this.emit('config:changed', {
        type: 'provider_updated',
        timestamp: new Date(),
        entityId: updatedConfig.version,
        entityType: 'config',
        changes: diff
      } as ConfigurationEvent);

      return updatedConfig;
    } catch (error) {
      this.pendingConfig = null;
      this.logger.error('Failed to update configuration', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async deployConfiguration(deploymentPolicy?: Partial<DeploymentPolicy>): Promise<DeploymentResult> {
    if (!this.pendingConfig) {
      throw new Error('No pending configuration to deploy');
    }

    if (this.deploymentInProgress) {
      throw new Error('Deployment already in progress');
    }

    this.deploymentInProgress = true;

    try {
      const policy = { ...this.pendingConfig.deploymentPolicy, ...deploymentPolicy };
      const result = await this.executeDeployment(this.pendingConfig, policy);

      if (result.success) {
        // Backup current config
        if (this.autoBackup && this.currentConfig) {
          this.addToHistory(this.currentConfig);
        }

        // Set as current
        this.currentConfig = this.pendingConfig;
        this.pendingConfig = null;

        this.logger.info('Configuration deployed successfully', {
          version: this.currentConfig.version,
          deploymentTime: result.deploymentTime,
          deployedProviders: result.deployedProviders.length
        });

        this.emit('deployment:completed', result);
      } else {
        this.logger.error('Configuration deployment failed', {
          failedProviders: result.failedProviders.length,
          rollbackTriggered: result.rollbackTriggered
        });

        this.emit('deployment:failed', new Error('Deployment failed'));
      }

      return result;
    } catch (error) {
      this.logger.error('Deployment execution failed', error instanceof Error ? error : new Error(String(error)));
      this.emit('deployment:failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.deploymentInProgress = false;
    }
  }

  public async rollbackConfiguration(targetVersion?: string): Promise<boolean> {
    const targetConfig = targetVersion
      ? this.findConfigurationByVersion(targetVersion)
      : this.getPreviousConfiguration();

    if (!targetConfig) {
      throw new Error('Target configuration not found for rollback');
    }

    try {
      this.logger.info('Starting configuration rollback', {
        fromVersion: this.currentConfig?.version,
        toVersion: targetConfig.version
      });

      this.emit('rollback:triggered', `Rolling back to version ${targetConfig.version}`);

      // Deploy rollback configuration with immediate strategy
      const result = await this.executeDeployment(targetConfig, {
        strategy: 'immediate',
        healthCheckThreshold: 0.9,
        rollbackThreshold: 0.1,
        testingDuration: 0,
        approvedEnvironments: ['*']
      });

      if (result.success) {
        this.currentConfig = targetConfig;
        this.pendingConfig = null;

        this.logger.info('Configuration rollback completed successfully', {
          version: targetConfig.version
        });

        this.emit('rollback:completed', true);
        return true;
      } else {
        this.logger.error('Configuration rollback failed', {
          failedProviders: result.failedProviders.length
        });

        this.emit('rollback:completed', false);
        return false;
      }
    } catch (error) {
      this.logger.error('Rollback execution failed', error instanceof Error ? error : new Error(String(error)));
      this.emit('rollback:completed', false);
      throw error;
    }
  }

  // Provider Management
  public async addProvider(providerConfig: ProviderConfiguration): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    // Validate provider configuration
    const validationResult = await this.validateProvider(providerConfig);
    if (!validationResult.valid) {
      throw new Error(`Provider validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicates
    const existingProvider = this.currentConfig.providers.find(p => p.id === providerConfig.id);
    if (existingProvider) {
      throw new Error(`Provider with ID ${providerConfig.id} already exists`);
    }

    const updatedConfig = {
      ...this.currentConfig,
      providers: [...this.currentConfig.providers, providerConfig]
    };

    await this.updateConfiguration(updatedConfig, true);

    this.logger.info('Provider added', {
      providerId: providerConfig.id,
      providerType: providerConfig.type,
      name: providerConfig.name
    });

    this.emit('config:changed', {
      type: 'provider_added',
      timestamp: new Date(),
      entityId: providerConfig.id,
      entityType: 'provider',
      changes: providerConfig
    } as ConfigurationEvent);
  }

  public async updateProvider(providerId: string, updates: Partial<ProviderConfiguration>): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    const providerIndex = this.currentConfig.providers.findIndex(p => p.id === providerId);
    if (providerIndex === -1) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const existingProvider = this.currentConfig.providers[providerIndex];
    const updatedProvider: ProviderConfiguration = {
      ...existingProvider,
      ...updates,
      updatedAt: new Date(),
      version: this.generateVersion()
    };

    // Validate updated provider
    const validationResult = await this.validateProvider(updatedProvider);
    if (!validationResult.valid) {
      throw new Error(`Provider validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    const updatedProviders = [...this.currentConfig.providers];
    updatedProviders[providerIndex] = updatedProvider;

    const updatedConfig = {
      ...this.currentConfig,
      providers: updatedProviders
    };

    await this.updateConfiguration(updatedConfig, true);

    this.logger.info('Provider updated', {
      providerId,
      changes: Object.keys(updates)
    });

    this.emit('config:changed', {
      type: 'provider_updated',
      timestamp: new Date(),
      entityId: providerId,
      entityType: 'provider',
      changes: updates
    } as ConfigurationEvent);
  }

  public async removeProvider(providerId: string): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    const providerIndex = this.currentConfig.providers.findIndex(p => p.id === providerId);
    if (providerIndex === -1) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const removedProvider = this.currentConfig.providers[providerIndex];
    const updatedProviders = this.currentConfig.providers.filter(p => p.id !== providerId);

    const updatedConfig = {
      ...this.currentConfig,
      providers: updatedProviders
    };

    await this.updateConfiguration(updatedConfig, true);

    this.logger.info('Provider removed', {
      providerId,
      providerType: removedProvider.type,
      name: removedProvider.name
    });

    this.emit('config:changed', {
      type: 'provider_removed',
      timestamp: new Date(),
      entityId: providerId,
      entityType: 'provider',
      changes: removedProvider
    } as ConfigurationEvent);
  }

  // Model Management
  public async addModelToProvider(providerId: string, modelSpec: ModelSpec): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    const provider = this.currentConfig.providers.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (provider.models.includes(modelSpec.id)) {
      throw new Error(`Model ${modelSpec.id} already exists for provider ${providerId}`);
    }

    provider.models.push(modelSpec.id);
    provider.updatedAt = new Date();

    await this.updateConfiguration(this.currentConfig, true);

    this.logger.info('Model added to provider', {
      providerId,
      modelId: modelSpec.id,
      modelType: modelSpec.type
    });

    this.emit('config:changed', {
      type: 'model_added',
      timestamp: new Date(),
      entityId: modelSpec.id,
      entityType: 'model',
      changes: { providerId, modelSpec }
    } as ConfigurationEvent);
  }

  public async removeModelFromProvider(providerId: string, modelId: string): Promise<void> {
    if (!this.currentConfig) {
      throw new Error('No configuration loaded');
    }

    const provider = this.currentConfig.providers.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const modelIndex = provider.models.indexOf(modelId);
    if (modelIndex === -1) {
      throw new Error(`Model ${modelId} not found for provider ${providerId}`);
    }

    provider.models.splice(modelIndex, 1);
    provider.updatedAt = new Date();

    await this.updateConfiguration(this.currentConfig, true);

    this.logger.info('Model removed from provider', {
      providerId,
      modelId
    });

    this.emit('config:changed', {
      type: 'model_removed',
      timestamp: new Date(),
      entityId: modelId,
      entityType: 'model',
      changes: { providerId }
    } as ConfigurationEvent);
  }

  // Validation
  public async validateConfiguration(config: ConfigurationSchema): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];

    try {
      // Validate global settings
      this.validateGlobalSettings(config.globalSettings, errors, warnings);

      // Validate providers
      for (const provider of config.providers) {
        const providerValidation = await this.validateProvider(provider);
        errors.push(...providerValidation.errors);
        warnings.push(...providerValidation.warnings);
      }

      // Apply custom validation rules
      for (const rule of Array.from(this.validationRules.values()).filter(r => r.enabled)) {
        await this.applyValidationRule(rule, config, errors, warnings);
      }

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(config));

      const score = this.calculateValidationScore(errors, warnings);

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        score
      };

      this.emit('config:validated', config, result);

      return result;
    } catch (error) {
      this.logger.error('Configuration validation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async validateProvider(provider: ProviderConfiguration): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!provider.id) {
      errors.push({
        ruleId: 'required_id',
        field: 'id',
        message: 'Provider ID is required',
        severity: 'error',
        fix: 'Add a unique provider ID'
      });
    }

    if (!provider.type) {
      errors.push({
        ruleId: 'required_type',
        field: 'type',
        message: 'Provider type is required',
        severity: 'error',
        fix: 'Specify the provider type (openai, claude, etc.)'
      });
    }

    if (!provider.name) {
      errors.push({
        ruleId: 'required_name',
        field: 'name',
        message: 'Provider name is required',
        severity: 'error',
        fix: 'Add a descriptive name for the provider'
      });
    }

    // Configuration validation
    if (provider.config) {
      if (!provider.config.model) {
        errors.push({
          ruleId: 'required_model',
          field: 'config.model',
          message: 'Default model is required',
          severity: 'error',
          fix: 'Specify a default model for the provider'
        });
      }

      if (provider.config.maxTokens && (provider.config.maxTokens < 1 || provider.config.maxTokens > 1000000)) {
        errors.push({
          ruleId: 'invalid_max_tokens',
          field: 'config.maxTokens',
          message: 'Max tokens must be between 1 and 1,000,000',
          severity: 'error',
          fix: 'Set maxTokens to a value within the valid range'
        });
      }

      if (provider.config.temperature && (provider.config.temperature < 0 || provider.config.temperature > 2)) {
        errors.push({
          ruleId: 'invalid_temperature',
          field: 'config.temperature',
          message: 'Temperature must be between 0 and 2',
          severity: 'error',
          fix: 'Set temperature to a value within the valid range'
        });
      }

      if (provider.config.timeout && provider.config.timeout < 1000) {
        warnings.push({
          field: 'config.timeout',
          message: 'Timeout is very low (< 1s), may cause frequent failures',
          suggestion: 'Consider increasing timeout to at least 5000ms'
        });
      }
    }

    // Rate limit validation
    if (provider.config.rateLimit) {
      if (provider.config.rateLimit.requestsPerSecond < 1) {
        errors.push({
          ruleId: 'invalid_rps',
          field: 'config.rateLimit.requestsPerSecond',
          message: 'Requests per second must be at least 1',
          severity: 'error',
          fix: 'Set requestsPerSecond to at least 1'
        });
      }

      if (provider.config.rateLimit.tokensPerSecond < 100) {
        warnings.push({
          field: 'config.rateLimit.tokensPerSecond',
          message: 'Low token rate limit may impact performance',
          suggestion: 'Consider increasing tokensPerSecond for better throughput'
        });
      }
    }

    const score = this.calculateValidationScore(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score
    };
  }

  // Utility Methods
  public getCurrentConfiguration(): ConfigurationSchema | null {
    return this.currentConfig;
  }

  public getPendingConfiguration(): ConfigurationSchema | null {
    return this.pendingConfig;
  }

  public getConfigurationHistory(): ConfigurationSchema[] {
    return [...this.configHistory];
  }

  public getProvider(providerId: string): ProviderConfiguration | undefined {
    return this.currentConfig?.providers.find(p => p.id === providerId);
  }

  public getProvidersByType(type: string): ProviderConfiguration[] {
    return this.currentConfig?.providers.filter(p => p.type === type) || [];
  }

  public getActiveProviders(): ProviderConfiguration[] {
    return this.currentConfig?.providers.filter(p => p.status === 'active') || [];
  }

  public setAutoValidation(enabled: boolean): void {
    this.autoValidation = enabled;
    this.logger.info('Auto validation updated', { enabled });
  }

  public setAutoBackup(enabled: boolean): void {
    this.autoBackup = enabled;
    this.logger.info('Auto backup updated', { enabled });
  }

  // Private Methods
  private initializeDefaultValidationRules(): void {
    const defaultRules: ValidationRule[] = [
      {
        id: 'provider_id_format',
        name: 'Provider ID Format',
        description: 'Provider ID must follow naming convention',
        type: 'format',
        field: 'id',
        condition: '^[a-z0-9-_]+$',
        severity: 'error',
        enabled: true
      },
      {
        id: 'api_key_present',
        name: 'API Key Required',
        description: 'API key must be present for external providers',
        type: 'required',
        field: 'config.apiKey',
        condition: 'exists',
        severity: 'error',
        enabled: true
      },
      {
        id: 'reasonable_timeout',
        name: 'Reasonable Timeout',
        description: 'Timeout should be reasonable for API calls',
        type: 'range',
        field: 'config.timeout',
        condition: '>=5000',
        severity: 'warning',
        enabled: true
      }
    ];

    for (const rule of defaultRules) {
      this.validationRules.set(rule.id, rule);
    }
  }

  private async loadConfigurationFile(configPath: string): Promise<any> {
    // This would implement file reading logic
    // For now, return a mock structure
    return {};
  }

  private async loadConfigurationFromSource(): Promise<ConfigurationSchema> {
    // This would implement database or environment loading
    // For now, return a default configuration
    return {
      version: '1.0.0',
      providers: [],
      globalSettings: {
        defaultTimeout: 30000,
        defaultRetryAttempts: 3,
        globalRateLimit: {
          requestsPerSecond: 100,
          tokensPerSecond: 50000
        },
        monitoring: {
          enabled: true,
          metricsInterval: 60000,
          alertThresholds: {
            errorRate: 0.1,
            latency: 5000,
            cost: 100
          }
        },
        security: {
          encryptionEnabled: true,
          allowedOrigins: ['*'],
          auditEnabled: true
        }
      },
      validationRules: Array.from(this.validationRules.values()),
      deploymentPolicy: {
        strategy: 'immediate',
        healthCheckThreshold: 0.95,
        rollbackThreshold: 0.1,
        testingDuration: 300,
        approvedEnvironments: ['production', 'staging']
      }
    };
  }

  private parseConfiguration(configData: any): ConfigurationSchema {
    // This would implement JSON/YAML parsing and validation
    return configData as ConfigurationSchema;
  }

  private addToHistory(config: ConfigurationSchema): void {
    this.configHistory.push(config);

    if (this.configHistory.length > this.maxHistorySize) {
      this.configHistory.shift();
    }
  }

  private generateVersion(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${random}`;
  }

  private createConfigurationDiff(oldConfig: ConfigurationSchema, newConfig: ConfigurationSchema): ConfigurationDiff {
    const oldProviderIds = new Set(oldConfig.providers.map(p => p.id));
    const newProviderIds = new Set(newConfig.providers.map(p => p.id));

    const added = newConfig.providers.filter(p => !oldProviderIds.has(p.id));
    const removed = oldConfig.providers.filter(p => !newProviderIds.has(p.id));
    const updated: { old: ProviderConfiguration; new: ProviderConfiguration }[] = [];

    for (const newProvider of newConfig.providers) {
      const oldProvider = oldConfig.providers.find(p => p.id === newProvider.id);
      if (oldProvider && JSON.stringify(oldProvider) !== JSON.stringify(newProvider)) {
        updated.push({ old: oldProvider, new: newProvider });
      }
    }

    const criticalChanges = updated.filter(u =>
      u.old.config.apiKey !== u.new.config.apiKey ||
      u.old.config.endpoint !== u.new.config.endpoint ||
      u.old.status !== u.new.status
    ).length;

    return {
      added,
      updated,
      removed,
      summary: {
        totalChanges: added.length + updated.length + removed.length,
        criticalChanges,
        providerCount: newConfig.providers.length,
        modelCount: newConfig.providers.reduce((sum, p) => sum + p.models.length, 0)
      }
    };
  }

  private async executeDeployment(config: ConfigurationSchema, policy: DeploymentPolicy): Promise<DeploymentResult> {
    const startTime = Date.now();
    const result: DeploymentResult = {
      success: true,
      deployedProviders: [],
      failedProviders: [],
      rollbackTriggered: false,
      deploymentTime: 0,
      healthStatus: {},
      metrics: {
        beforeDeployment: {},
        afterDeployment: {}
      }
    };

    try {
      this.emit('deployment:started', config);

      // Collect baseline metrics
      result.metrics.beforeDeployment = await this.collectBaselineMetrics();

      // Deploy based on strategy
      switch (policy.strategy) {
        case 'immediate':
          await this.deployImmediate(config, result);
          break;
        case 'blue_green':
          await this.deployBlueGreen(config, result);
          break;
        case 'canary':
          await this.deployCanary(config, result, policy.rolloutPercentage || 0.1);
          break;
        case 'rolling':
          await this.deployRolling(config, result);
          break;
        default:
          throw new Error(`Unknown deployment strategy: ${policy.strategy}`);
      }

      // Health checks
      await this.performDeploymentHealthChecks(config, result);

      // Final evaluation
      result.success = this.evaluateDeploymentSuccess(result, policy);

      if (!result.success && policy.rollbackThreshold > 0) {
        await this.triggerAutomaticRollback(result, policy);
      }

      result.deploymentTime = Date.now() - startTime;

      return result;
    } catch (error) {
      result.success = false;
      result.deploymentTime = Date.now() - startTime;
      throw error;
    }
  }

  private async deployImmediate(config: ConfigurationSchema, result: DeploymentResult): Promise<void> {
    for (const provider of config.providers) {
      try {
        // Simulate provider deployment
        await this.deployProvider(provider);
        result.deployedProviders.push(provider.id);
      } catch (error) {
        result.failedProviders.push({
          id: provider.id,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
  }

  private async deployBlueGreen(config: ConfigurationSchema, result: DeploymentResult): Promise<void> {
    // Implementation for blue-green deployment
    await this.deployImmediate(config, result);
  }

  private async deployCanary(config: ConfigurationSchema, result: DeploymentResult, percentage: number): Promise<void> {
    // Implementation for canary deployment
    const totalProviders = config.providers.length;
    const canaryCount = Math.ceil(totalProviders * percentage);

    const canaryProviders = config.providers.slice(0, canaryCount);
    const remainingProviders = config.providers.slice(canaryCount);

    // Deploy canary providers first
    for (const provider of canaryProviders) {
      try {
        await this.deployProvider(provider);
        result.deployedProviders.push(provider.id);
      } catch (error) {
        result.failedProviders.push({
          id: provider.id,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }

    // If canary is successful, deploy the rest
    if (result.failedProviders.length === 0) {
      for (const provider of remainingProviders) {
        try {
          await this.deployProvider(provider);
          result.deployedProviders.push(provider.id);
        } catch (error) {
          result.failedProviders.push({
            id: provider.id,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
  }

  private async deployRolling(config: ConfigurationSchema, result: DeploymentResult): Promise<void> {
    // Implementation for rolling deployment
    await this.deployImmediate(config, result);
  }

  private async deployProvider(provider: ProviderConfiguration): Promise<void> {
    // Simulate provider deployment with delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.logger.debug('Provider deployed', { providerId: provider.id });
  }

  private async performDeploymentHealthChecks(config: ConfigurationSchema, result: DeploymentResult): Promise<void> {
    for (const provider of config.providers) {
      try {
        // Simulate health check
        const isHealthy = await this.checkProviderHealth(provider);
        result.healthStatus[provider.id] = isHealthy;
      } catch (error) {
        result.healthStatus[provider.id] = false;
      }
    }
  }

  private async checkProviderHealth(provider: ProviderConfiguration): Promise<boolean> {
    // Simulate health check
    return Math.random() > 0.1; // 90% success rate
  }

  private evaluateDeploymentSuccess(result: DeploymentResult, policy: DeploymentPolicy): boolean {
    const healthCheckPassRate = Object.values(result.healthStatus).filter(Boolean).length / Object.keys(result.healthStatus).length;
    const deploymentSuccessRate = result.deployedProviders.length / (result.deployedProviders.length + result.failedProviders.length);

    return healthCheckPassRate >= policy.healthCheckThreshold && deploymentSuccessRate >= 0.9;
  }

  private async triggerAutomaticRollback(result: DeploymentResult, policy: DeploymentPolicy): Promise<void> {
    result.rollbackTriggered = true;
    result.rollbackReason = 'Health check threshold not met';
    this.logger.warn('Automatic rollback triggered', { reason: result.rollbackReason });
    this.emit('rollback:triggered', result.rollbackReason);
  }

  private async collectBaselineMetrics(): Promise<Record<string, number>> {
    // Collect current system metrics
    return {
      totalProviders: this.currentConfig?.providers.length || 0,
      activeProviders: this.currentConfig?.providers.filter(p => p.status === 'active').length || 0,
      timestamp: Date.now()
    };
  }

  private findConfigurationByVersion(version: string): ConfigurationSchema | null {
    return this.configHistory.find(config => config.version === version) || null;
  }

  private getPreviousConfiguration(): ConfigurationSchema | null {
    return this.configHistory.length > 0 ? this.configHistory[this.configHistory.length - 1] : null;
  }

  private validateGlobalSettings(settings: GlobalSettings, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (settings.defaultTimeout < 1000) {
      warnings.push({
        field: 'globalSettings.defaultTimeout',
        message: 'Default timeout is very low',
        suggestion: 'Consider setting default timeout to at least 5000ms'
      });
    }

    if (settings.globalRateLimit.requestsPerSecond < 10) {
      warnings.push({
        field: 'globalSettings.globalRateLimit.requestsPerSecond',
        message: 'Global rate limit is very restrictive',
        suggestion: 'Consider increasing the global rate limit for better performance'
      });
    }
  }

  private async applyValidationRule(rule: ValidationRule, config: ConfigurationSchema, errors: ValidationError[], warnings: ValidationWarning[]): Promise<void> {
    // Implementation for applying custom validation rules
    // This would be more sophisticated in a real implementation
  }

  private generateRecommendations(config: ConfigurationSchema): string[] {
    const recommendations: string[] = [];

    if (config.providers.length === 0) {
      recommendations.push('Consider adding at least one provider for functionality');
    }

    const activeProviders = config.providers.filter(p => p.status === 'active').length;
    if (activeProviders < config.providers.length * 0.5) {
      recommendations.push('Many providers are inactive - consider activating them for redundancy');
    }

    return recommendations;
  }

  private calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    const errorPenalty = errors.length * 20;
    const warningPenalty = warnings.length * 5;
    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }
}