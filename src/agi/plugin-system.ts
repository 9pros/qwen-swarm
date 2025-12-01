/**
 * AGI Plugin System - Extensible plugin architecture for AGI capabilities
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from '../utils/logger';
import { AGIMemoryManager } from './memory-manager';
import { AGILearningEngine } from './learning-engine';
import { AGIContextAnalyzer, ContextAnalysis } from './context-analyzer';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  loaded: boolean;
  capabilities: PluginCapability[];
  dependencies: string[];
  configuration: Record<string, any>;
  hooks: PluginHooks;
}

export interface PluginCapability {
  name: string;
  description: string;
  enabled: boolean;
  parameters: PluginParameter[];
}

export interface PluginParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description: string;
  validation?: (value: any) => boolean;
}

export interface PluginHooks {
  beforeRequest?: (context: PluginContext) => Promise<void>;
  afterRequest?: (context: PluginContext, result: any) => Promise<any>;
  onError?: (context: PluginContext, error: Error) => Promise<void>;
  onAnalysis?: (context: PluginContext, analysis: ContextAnalysis) => Promise<void>;
  onLearning?: (context: PluginContext, learningData: any) => Promise<void>;
}

export interface PluginContext {
  sessionId: string;
  requestId?: string;
  input: string;
  type: string;
  metadata: Record<string, any>;
  timestamp: Date;
  plugins: string[];
  memory: AGIMemoryManager;
  learning: AGILearningEngine;
  contextAnalyzer: AGIContextAnalyzer;
}

export interface PluginExecutionResult {
  success: boolean;
  data?: any;
  error?: Error;
  executionTime: number;
  pluginId: string;
}

export interface PluginRegistry {
  plugins: Map<string, Plugin>;
  capabilities: Map<string, string[]>; // capability -> [pluginIds]
  hooks: Map<string, Plugin[]>; // hookType -> [plugins]
}

export class AGIPluginSystem extends EventEmitter {
  private logger: Logger;
  private memory: AGIMemoryManager;
  private learningEngine: AGILearningEngine;
  private contextAnalyzer: AGIContextAnalyzer;
  private registry: PluginRegistry;
  private pluginPaths: string[];
  private autoLoad: boolean;
  private executionStats: Map<string, any> = new Map();

  constructor(config?: any) {
    super();
    this.logger = new Logger().withContext({ component: 'AGIPluginSystem' });
    this.memory = new AGIMemoryManager();
    this.learningEngine = new AGILearningEngine();
    this.contextAnalyzer = new AGIContextAnalyzer();

    this.registry = {
      plugins: new Map(),
      capabilities: new Map(),
      hooks: new Map()
    };

    this.pluginPaths = config?.pluginPaths || ['./plugins'];
    this.autoLoad = config?.autoLoad !== false;

    this.initializeHookTypes();
    this.loadBuiltinPlugins();

    if (this.autoLoad) {
      this.loadExternalPlugins();
    }
  }

  private initializeHookTypes(): void {
    const hookTypes = [
      'beforeRequest',
      'afterRequest',
      'onError',
      'onAnalysis',
      'onLearning'
    ];

    for (const hookType of hookTypes) {
      this.registry.hooks.set(hookType, []);
    }

    this.logger.debug('Plugin hook types initialized', {
      hookTypes: hookTypes.length
    });
  }

  private loadBuiltinPlugins(): void {
    // Built-in plugins that provide core AGI functionality

    // Code Analysis Plugin
    this.registerPlugin({
      id: 'code-analysis',
      name: 'Code Analysis',
      version: '1.0.0',
      description: 'Advanced code analysis and quality assessment',
      author: 'AGI System',
      enabled: true,
      loaded: true,
      capabilities: [
        {
          name: 'analyze_code_quality',
          description: 'Analyze code quality and suggest improvements',
          enabled: true,
          parameters: [
            {
              name: 'code',
              type: 'string',
              required: true,
              description: 'Code to analyze'
            },
            {
              name: 'language',
              type: 'string',
              required: false,
              default: 'auto',
              description: 'Programming language'
            }
          ]
        },
        {
          name: 'detect_code_smells',
          description: 'Detect code smells and anti-patterns',
          enabled: true,
          parameters: [
            {
              name: 'code',
              type: 'string',
              required: true,
              description: 'Code to analyze'
            }
          ]
        }
      ],
      dependencies: [],
      configuration: {
        strictMode: false,
        ignorePatterns: ['*.test.*', '*.spec.*'],
        maxComplexity: 10
      },
      hooks: {
        onAnalysis: async (context: PluginContext, analysis: ContextAnalysis) => {
          if (analysis.entities.some(e => e.type === 'code')) {
            const codeAnalysis = await this.analyzeCodeQuality(context.input);
            context.metadata.codeAnalysis = codeAnalysis;
          }
        }
      }
    });

    // Pattern Recognition Plugin
    this.registerPlugin({
      id: 'pattern-recognition',
      name: 'Pattern Recognition',
      version: '1.0.0',
      description: 'Advanced pattern detection and recognition',
      author: 'AGI System',
      enabled: true,
      loaded: true,
      capabilities: [
        {
          name: 'detect_patterns',
          description: 'Detect patterns in data and code',
          enabled: true,
          parameters: [
            {
              name: 'data',
              type: 'array',
              required: true,
              description: 'Data to analyze for patterns'
            },
            {
              name: 'pattern_type',
              type: 'string',
              required: false,
              default: 'auto',
              description: 'Type of patterns to detect'
            }
          ]
        },
        {
          name: 'suggest_optimizations',
          description: 'Suggest optimizations based on detected patterns',
          enabled: true,
          parameters: [
            {
              name: 'patterns',
              type: 'array',
              required: true,
              description: 'Detected patterns'
            }
          ]
        }
      ],
      dependencies: [],
      configuration: {
        minPatternFrequency: 3,
        confidenceThreshold: 0.7
      },
      hooks: {
        afterRequest: async (context: PluginContext, result: any) => {
          if (context.type === 'analysis') {
            const patterns = await this.detectPatterns(context.input);
            context.metadata.detectedPatterns = patterns;
          }
        }
      }
    });

    // Security Analysis Plugin
    this.registerPlugin({
      id: 'security-analysis',
      name: 'Security Analysis',
      version: '1.0.0',
      description: 'Security vulnerability detection and analysis',
      author: 'AGI System',
      enabled: true,
      loaded: true,
      capabilities: [
        {
          name: 'scan_vulnerabilities',
          description: 'Scan for security vulnerabilities',
          enabled: true,
          parameters: [
            {
              name: 'code',
              type: 'string',
              required: true,
              description: 'Code to scan'
            },
            {
              name: 'severity_level',
              type: 'string',
              required: false,
              default: 'medium',
              description: 'Minimum severity level to report'
            }
          ]
        },
        {
          name: 'check_dependencies',
          description: 'Check for known security issues in dependencies',
          enabled: true,
          parameters: [
            {
              name: 'dependencies',
              type: 'array',
              required: true,
              description: 'List of dependencies'
            }
          ]
        }
      ],
      dependencies: [],
      configuration: {
        enabledChecks: ['sql_injection', 'xss', 'csrf', 'injection_attacks'],
        severityLevels: ['low', 'medium', 'high', 'critical']
      },
      hooks: {
        beforeRequest: async (context: PluginContext) => {
          if (context.type === 'code') {
            const securityScan = await this.quickSecurityScan(context.input);
            context.metadata.securityWarnings = securityScan;
          }
        }
      }
    });

    // Performance Optimization Plugin
    this.registerPlugin({
      id: 'performance-optimization',
      name: 'Performance Optimization',
      version: '1.0.0',
      description: 'Performance analysis and optimization suggestions',
      author: 'AGI System',
      enabled: true,
      loaded: true,
      capabilities: [
        {
          name: 'analyze_performance',
          description: 'Analyze performance bottlenecks',
          enabled: true,
          parameters: [
            {
              name: 'code',
              type: 'string',
              required: true,
              description: 'Code to analyze'
            },
            {
              name: 'metrics',
              type: 'object',
              required: false,
              description: 'Performance metrics'
            }
          ]
        },
        {
          name: 'suggest_optimizations',
          description: 'Suggest performance optimizations',
          enabled: true,
          parameters: [
            {
              name: 'analysis',
              type: 'object',
              required: true,
              description: 'Performance analysis results'
            }
          ]
        }
      ],
      dependencies: ['code-analysis'],
      configuration: {
        optimizationAreas: ['algorithm', 'memory', 'io', 'network'],
        thresholds: {
          responseTime: 1000,
          memoryUsage: 0.8,
          cpuUsage: 0.7
        }
      },
      hooks: {
        afterRequest: async (context: PluginContext, result: any) => {
          if (context.type === 'analysis' && context.metadata.codeAnalysis) {
            const performanceAnalysis = await this.analyzePerformance(context.input);
            context.metadata.performanceAnalysis = performanceAnalysis;
          }
        }
      }
    });

    // Knowledge Enhancement Plugin
    this.registerPlugin({
      id: 'knowledge-enhancement',
      name: 'Knowledge Enhancement',
      version: '1.0.0',
      description: 'Enhance responses with knowledge base integration',
      author: 'AGI System',
      enabled: true,
      loaded: true,
      capabilities: [
        {
          name: 'search_knowledge',
          description: 'Search knowledge base for relevant information',
          enabled: true,
          parameters: [
            {
              name: 'query',
              type: 'string',
              required: true,
              description: 'Search query'
            },
            {
              name: 'domain',
              type: 'string',
              required: false,
              description: 'Knowledge domain'
            }
          ]
        },
        {
          name: 'enrich_response',
          description: 'Enrich response with additional context',
          enabled: true,
          parameters: [
            {
              name: 'response',
              type: 'string',
              required: true,
              description: 'Original response'
            },
            {
              name: 'context',
              type: 'object',
              required: false,
              description: 'Additional context'
            }
          ]
        }
      ],
      dependencies: [],
      configuration: {
        knowledgeSources: ['documentation', 'examples', 'best-practices'],
        maxResults: 5,
        relevanceThreshold: 0.6
      },
      hooks: {
        afterRequest: async (context: PluginContext, result: any) => {
          const knowledge = await this.searchKnowledge(context.input);
          context.metadata.knowledgeEnhancement = knowledge;
        }
      }
    });

    this.logger.info('Built-in plugins loaded', {
      count: this.registry.plugins.size
    });
  }

  private async loadExternalPlugins(): Promise<void> {
    this.logger.info('Loading external plugins', {
      paths: this.pluginPaths
    });

    // In a real implementation, this would scan directories and load plugin files
    // For now, we'll simulate loading some example plugins
    const externalPlugins = [
      {
        id: 'web-scraper',
        name: 'Web Scraper',
        version: '1.0.0',
        description: 'Web scraping and content extraction capabilities',
        author: 'External',
        enabled: false,
        loaded: false,
        capabilities: [
          {
            name: 'scrape_webpage',
            description: 'Scrape content from web pages',
            enabled: true,
            parameters: [
              { name: 'url', type: 'string', required: true, description: 'URL to scrape' },
              { name: 'selectors', type: 'array', required: false, description: 'CSS selectors' }
            ]
          }
        ],
        dependencies: [],
        configuration: { timeout: 30000, userAgent: 'AGI-Plugin/1.0' },
        hooks: {}
      },
      {
        id: 'image-analysis',
        name: 'Image Analysis',
        version: '1.0.0',
        description: 'Image processing and analysis capabilities',
        author: 'External',
        enabled: false,
        loaded: false,
        capabilities: [
          {
            name: 'analyze_image',
            description: 'Analyze image content and features',
            enabled: true,
            parameters: [
              { name: 'image_path', type: 'string', required: true, description: 'Path to image' },
              { name: 'analysis_type', type: 'string', required: false, description: 'Type of analysis' }
            ]
          }
        ],
        dependencies: [],
        configuration: { supportedFormats: ['jpg', 'png', 'gif', 'webp'] },
        hooks: {}
      }
    ];

    for (const plugin of externalPlugins) {
      this.registerPlugin(plugin);
    }

    this.logger.info('External plugins loaded', {
      count: externalPlugins.length
    });
  }

  public registerPlugin(plugin: Plugin): void {
    if (this.registry.plugins.has(plugin.id)) {
      this.logger.warn('Plugin already registered', { pluginId: plugin.id });
      return;
    }

    // Check dependencies
    for (const dependency of plugin.dependencies) {
      if (!this.registry.plugins.has(dependency)) {
        this.logger.warn('Plugin dependency not found', {
          pluginId: plugin.id,
          dependency
        });
        plugin.enabled = false;
      }
    }

    // Register plugin
    this.registry.plugins.set(plugin.id, plugin);

    // Register capabilities
    for (const capability of plugin.capabilities) {
      if (!this.registry.capabilities.has(capability.name)) {
        this.registry.capabilities.set(capability.name, []);
      }
      this.registry.capabilities.get(capability.name)!.push(plugin.id);
    }

    // Register hooks
    for (const [hookType, hookFunction] of Object.entries(plugin.hooks)) {
      if (hookFunction && this.registry.hooks.has(hookType)) {
        this.registry.hooks.get(hookType)!.push(plugin);
      }
    }

    this.logger.info('Plugin registered', {
      pluginId: plugin.id,
      name: plugin.name,
      capabilities: plugin.capabilities.length
    });

    this.emit('plugin:registered', plugin);
  }

  public unregisterPlugin(pluginId: string): void {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      this.logger.warn('Plugin not found', { pluginId });
      return;
    }

    // Check if other plugins depend on this one
    const dependents = Array.from(this.registry.plugins.values())
      .filter(p => p.dependencies.includes(pluginId));

    if (dependents.length > 0) {
      this.logger.warn('Cannot unregister plugin - has dependents', {
        pluginId,
        dependents: dependents.map(p => p.id)
      });
      return;
    }

    // Remove from registry
    this.registry.plugins.delete(pluginId);

    // Remove capabilities
    for (const [capabilityName, pluginIds] of this.registry.capabilities.entries()) {
      const index = pluginIds.indexOf(pluginId);
      if (index !== -1) {
        pluginIds.splice(index, 1);
        if (pluginIds.length === 0) {
          this.registry.capabilities.delete(capabilityName);
        }
      }
    }

    // Remove hooks
    for (const [hookType, plugins] of this.registry.hooks.entries()) {
      const index = plugins.findIndex(p => p.id === pluginId);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
    }

    this.logger.info('Plugin unregistered', { pluginId });
    this.emit('plugin:unregistered', pluginId);
  }

  public enablePlugin(pluginId: string): void {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      this.logger.warn('Plugin not found', { pluginId });
      return;
    }

    // Check dependencies
    for (const dependency of plugin.dependencies) {
      const depPlugin = this.registry.plugins.get(dependency);
      if (!depPlugin || !depPlugin.enabled) {
        this.logger.warn('Cannot enable plugin - dependency not enabled', {
          pluginId,
          dependency
        });
        return;
      }
    }

    plugin.enabled = true;
    this.logger.info('Plugin enabled', { pluginId });
    this.emit('plugin:enabled', pluginId);
  }

  public disablePlugin(pluginId: string): void {
    const plugin = this.registry.plugins.get(pluginId);
    if (!plugin) {
      this.logger.warn('Plugin not found', { pluginId });
      return;
    }

    // Check if other enabled plugins depend on this one
    const dependents = Array.from(this.registry.plugins.values())
      .filter(p => p.enabled && p.dependencies.includes(pluginId));

    if (dependents.length > 0) {
      this.logger.warn('Cannot disable plugin - has enabled dependents', {
        pluginId,
        dependents: dependents.map(p => p.id)
      });
      return;
    }

    plugin.enabled = false;
    this.logger.info('Plugin disabled', { pluginId });
    this.emit('plugin:disabled', pluginId);
  }

  public async executePlugin(
    pluginId: string,
    capabilityName: string,
    parameters: Record<string, any>,
    context?: Partial<PluginContext>
  ): Promise<PluginExecutionResult> {
    const startTime = Date.now();

    try {
      const plugin = this.registry.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      if (!plugin.enabled) {
        throw new Error(`Plugin not enabled: ${pluginId}`);
      }

      const capability = plugin.capabilities.find(c => c.name === capabilityName);
      if (!capability) {
        throw new Error(`Capability not found: ${capabilityName} in plugin ${pluginId}`);
      }

      if (!capability.enabled) {
        throw new Error(`Capability not enabled: ${capabilityName}`);
      }

      // Validate parameters
      for (const param of capability.parameters) {
        if (param.required && !(param.name in parameters)) {
          throw new Error(`Required parameter missing: ${param.name}`);
        }

        if (param.validation && param.name in parameters) {
          if (!param.validation(parameters[param.name])) {
            throw new Error(`Parameter validation failed: ${param.name}`);
          }
        }
      }

      // Create context
      const pluginContext: PluginContext = {
        sessionId: context?.sessionId || this.generateSessionId(),
        requestId: context?.requestId,
        input: context?.input || '',
        type: context?.type || 'plugin',
        metadata: context?.metadata || {},
        timestamp: new Date(),
        plugins: [pluginId],
        memory: this.memory,
        learning: this.learningEngine,
        contextAnalyzer: this.contextAnalyzer
      };

      // Execute capability
      const result = await this.executeCapability(plugin, capability, parameters, pluginContext);

      const executionTime = Date.now() - startTime;

      // Update execution stats
      this.updateExecutionStats(pluginId, capabilityName, executionTime, true);

      this.logger.debug('Plugin execution completed', {
        pluginId,
        capability: capabilityName,
        executionTime
      });

      this.emit('plugin:executed', {
        pluginId,
        capability: capabilityName,
        executionTime,
        success: true
      });

      return {
        success: true,
        data: result,
        executionTime,
        pluginId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update execution stats
      this.updateExecutionStats(pluginId, capabilityName, executionTime, false);

      this.logger.error('Plugin execution failed', error instanceof Error ? error : new Error(String(error)), {
        pluginId,
        capability: capabilityName
      });

      this.emit('plugin:execution_failed', {
        pluginId,
        capability: capabilityName,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime,
        pluginId
      };
    }
  }

  public async executeHook(hookType: string, context: PluginContext, ...args: any[]): Promise<void> {
    const plugins = this.registry.hooks.get(hookType) || [];
    const enabledPlugins = plugins.filter(p => p.enabled);

    for (const plugin of enabledPlugins) {
      try {
        const hookFunction = plugin.hooks[hookType as keyof PluginHooks];
        if (hookFunction) {
          await hookFunction(context, ...args);
        }
      } catch (error) {
        this.logger.error('Plugin hook execution failed', error instanceof Error ? error : new Error(String(error)), {
          pluginId: plugin.id,
          hookType
        });
      }
    }
  }

  public getPlugin(pluginId: string): Plugin | null {
    return this.registry.plugins.get(pluginId) || null;
  }

  public getAllPlugins(): Plugin[] {
    return Array.from(this.registry.plugins.values());
  }

  public getEnabledPlugins(): Plugin[] {
    return Array.from(this.registry.plugins.values()).filter(p => p.enabled);
  }

  public getPluginsByCapability(capabilityName: string): Plugin[] {
    const pluginIds = this.registry.capabilities.get(capabilityName) || [];
    return pluginIds
      .map(id => this.registry.plugins.get(id))
      .filter((p): p is Plugin => p !== undefined && p.enabled);
  }

  public searchCapabilities(query: string): Array<{ capability: string; plugins: string[] }> {
    const results: Array<{ capability: string; plugins: string[] }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [capabilityName, pluginIds] of this.registry.capabilities.entries()) {
      if (capabilityName.toLowerCase().includes(lowerQuery)) {
        results.push({
          capability: capabilityName,
          plugins: pluginIds
        });
      }
    }

    return results;
  }

  public getExecutionStats(pluginId?: string): any {
    if (pluginId) {
      return this.executionStats.get(pluginId);
    }

    const allStats: Record<string, any> = {};
    for (const [id, stats] of this.executionStats.entries()) {
      allStats[id] = stats;
    }
    return allStats;
  }

  private async executeCapability(
    plugin: Plugin,
    capability: PluginCapability,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<any> {
    // In a real implementation, this would call the actual plugin capability
    // For now, we'll simulate some built-in plugin behaviors

    switch (plugin.id) {
      case 'code-analysis':
        return this.executeCodeAnalysis(capability.name, parameters);
      case 'pattern-recognition':
        return this.executePatternRecognition(capability.name, parameters);
      case 'security-analysis':
        return this.executeSecurityAnalysis(capability.name, parameters);
      case 'performance-optimization':
        return this.executePerformanceOptimization(capability.name, parameters);
      case 'knowledge-enhancement':
        return this.executeKnowledgeEnhancement(capability.name, parameters);
      default:
        throw new Error(`Plugin execution not implemented: ${plugin.id}`);
    }
  }

  private async executeCodeAnalysis(capabilityName: string, parameters: any): Promise<any> {
    switch (capabilityName) {
      case 'analyze_code_quality':
        return {
          quality: 'good',
          score: 0.85,
          issues: [],
          suggestions: ['Add more documentation', 'Consider using more descriptive variable names']
        };
      case 'detect_code_smells':
        return {
          smells: [],
          antiPatterns: [],
          warnings: []
        };
      default:
        throw new Error(`Unknown capability: ${capabilityName}`);
    }
  }

  private async executePatternRecognition(capabilityName: string, parameters: any): Promise<any> {
    switch (capabilityName) {
      case 'detect_patterns':
        return {
          patterns: [],
          confidence: 0.7,
          frequency: 3
        };
      case 'suggest_optimizations':
        return {
          optimizations: [],
          impact: 'medium'
        };
      default:
        throw new Error(`Unknown capability: ${capabilityName}`);
    }
  }

  private async executeSecurityAnalysis(capabilityName: string, parameters: any): Promise<any> {
    switch (capabilityName) {
      case 'scan_vulnerabilities':
        return {
          vulnerabilities: [],
          riskLevel: 'low',
          recommendations: []
        };
      case 'check_dependencies':
        return {
          dependencies: [],
          issues: [],
          outdated: []
        };
      default:
        throw new Error(`Unknown capability: ${capabilityName}`);
    }
  }

  private async executePerformanceOptimization(capabilityName: string, parameters: any): Promise<any> {
    switch (capabilityName) {
      case 'analyze_performance':
        return {
          bottlenecks: [],
          metrics: {},
          score: 0.8
        };
      case 'suggest_optimizations':
        return {
          optimizations: [],
          expectedImprovement: '15-25%'
        };
      default:
        throw new Error(`Unknown capability: ${capabilityName}`);
    }
  }

  private async executeKnowledgeEnhancement(capabilityName: string, parameters: any): Promise<any> {
    switch (capabilityName) {
      case 'search_knowledge':
        return {
          results: [],
          relevance: 0.8,
          sources: []
        };
      case 'enrich_response':
        return {
          enrichedResponse: parameters.response,
          additions: [],
          confidence: 0.9
        };
      default:
        throw new Error(`Unknown capability: ${capabilityName}`);
    }
  }

  // Plugin-specific helper methods
  private async analyzeCodeQuality(code: string): Promise<any> {
    return {
      quality: 'excellent',
      score: 0.92,
      metrics: {
        complexity: 5,
        maintainability: 0.88,
        testCoverage: 0.85
      }
    };
  }

  private async detectPatterns(input: string): Promise<any> {
    return {
      patterns: [],
      count: 0,
      confidence: 0.6
    };
  }

  private async quickSecurityScan(input: string): Promise<any> {
    return {
      warnings: [],
      riskLevel: 'low',
      scanTime: new Date()
    };
  }

  private async analyzePerformance(input: string): Promise<any> {
    return {
      performance: 'good',
      bottlenecks: [],
      score: 0.85
    };
  }

  private async searchKnowledge(query: string): Promise<any> {
    return {
      results: [],
      count: 0,
      relevance: 0.7
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateExecutionStats(pluginId: string, capability: string, executionTime: number, success: boolean): void {
    if (!this.executionStats.has(pluginId)) {
      this.executionStats.set(pluginId, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        capabilities: {}
      });
    }

    const stats = this.executionStats.get(pluginId)!;
    stats.totalExecutions++;
    stats.totalExecutionTime += executionTime;
    stats.averageExecutionTime = stats.totalExecutionTime / stats.totalExecutions;

    if (success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    if (!stats.capabilities[capability]) {
      stats.capabilities[capability] = {
        executions: 0,
        totalTime: 0,
        averageTime: 0
      };
    }

    const capabilityStats = stats.capabilities[capability];
    capabilityStats.executions++;
    capabilityStats.totalTime += executionTime;
    capabilityStats.averageTime = capabilityStats.totalTime / capabilityStats.executions;
  }
}