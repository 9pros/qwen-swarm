import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@/utils/logger';
import type {
  AgentConfig,
  AgentCapability,
  AgentRole,
  ProviderConfig,
  SecurityContext,
  RetryPolicy,
  Permission
} from '@/types';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  inherits?: string[];
  type: 'queen' | 'worker' | 'specialist';
  role: AgentRole;
  capabilities: AgentCapability[];
  provider: ProviderConfig;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created: Date;
  updated: Date;
  author?: string;
  tags: string[];
}

export interface AgentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface AgentRegistry {
  agents: Map<string, AgentTemplate>;
  templates: Map<string, AgentTemplate>;
  inheritanceTree: Map<string, string[]>;
  validationCache: Map<string, AgentValidationResult>;
}

export interface AgentDiscoveryOptions {
  directories: string[];
  repositories?: string[];
  recursive: boolean;
  filePattern: string;
  excludePatterns: string[];
}

export interface AgentVersionControl {
  current: string;
  versions: Map<string, AgentTemplate>;
  changelog: AgentVersionEntry[];
}

export interface AgentVersionEntry {
  version: string;
  timestamp: Date;
  changes: string[];
  author?: string;
  breaking: boolean;
}

export interface SpecialtyAgentSystemEvents {
  'agent-template-loaded': (template: AgentTemplate) => void;
  'agent-template-validated': (templateId: string, result: AgentValidationResult) => void;
  'agent-template-updated': (templateId: string, newVersion: string) => void;
  'agent-discovery-completed': (discoveredCount: number) => void;
  'agent-inheritance-resolved': (templateId: string, dependencies: string[]) => void;
  'agent-validation-failed': (templateId: string, errors: string[]) => void;
}

export class SpecialtyAgentSystem extends EventEmitter<SpecialtyAgentSystemEvents> {
  private registry: AgentRegistry;
  private logger: Logger;
  private discoveryOptions: AgentDiscoveryOptions;
  private versionControl: Map<string, AgentVersionControl>;
  private markdownParser: AgentMarkdownParser;
  private validator: AgentTemplateValidator;

  constructor(discoveryOptions?: Partial<AgentDiscoveryOptions>) {
    super();
    this.logger = new Logger().withContext({ component: 'SpecialtyAgentSystem' });
    this.registry = {
      agents: new Map(),
      templates: new Map(),
      inheritanceTree: new Map(),
      validationCache: new Map()
    };
    this.versionControl = new Map();
    this.discoveryOptions = {
      directories: ['./agents', './templates'],
      recursive: true,
      filePattern: '*.md',
      excludePatterns: ['node_modules', '.git', 'dist'],
      ...discoveryOptions
    };
    this.markdownParser = new AgentMarkdownParser();
    this.validator = new AgentTemplateValidator();
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing Specialty Agent System');

    await this.discoverAgents();
    await this.resolveInheritance();
    await this.validateAllTemplates();

    this.logger.info('Specialty Agent System initialized', {
      templateCount: this.registry.templates.size,
      agentCount: this.registry.agents.size
    });
  }

  public async discoverAgents(): Promise<void> {
    this.logger.info('Starting agent discovery', this.discoveryOptions);

    for (const directory of this.discoveryOptions.directories) {
      await this.scanDirectory(directory);
    }

    if (this.discoveryOptions.repositories) {
      await this.discoverFromRepositories();
    }

    this.emit('agent-discovery-completed', this.registry.templates.size);
    this.logger.info('Agent discovery completed', {
      templatesFound: this.registry.templates.size,
      agentsFound: this.registry.agents.size
    });
  }

  private async scanDirectory(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory() && this.discoveryOptions.recursive) {
          const shouldExclude = this.discoveryOptions.excludePatterns.some(
            pattern => entry.name.includes(pattern)
          );

          if (!shouldExclude) {
            await this.scanDirectory(fullPath);
          }
        } else if (entry.isFile() && this.matchesPattern(entry.name)) {
          await this.loadAgentTemplate(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to scan directory', error instanceof Error ? error : new Error(String(error)), { directory });
    }
  }

  private matchesPattern(fileName: string): boolean {
    const pattern = this.discoveryOptions.filePattern.replace('*', '.*');
    const regex = new RegExp(pattern);
    return regex.test(fileName);
  }

  private async loadAgentTemplate(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const template = await this.markdownParser.parse(content, filePath);

      if (template) {
        this.registry.templates.set(template.id, template);
        this.initializeVersionControl(template);
        this.emit('agent-template-loaded', template);
        this.logger.debug('Agent template loaded', { templateId: template.id, filePath });
      }
    } catch (error) {
      this.logger.error('Failed to load agent template', error instanceof Error ? error : new Error(String(error)), { filePath });
    }
  }

  private async discoverFromRepositories(): Promise<void> {
    // Repository discovery implementation
    this.logger.info('Repository discovery not yet implemented');
  }

  public async resolveInheritance(): Promise<void> {
    this.logger.info('Resolving agent template inheritance');

    for (const [templateId, template] of this.registry.templates) {
      const dependencies = await this.resolveTemplateDependencies(template);
      this.registry.inheritanceTree.set(templateId, dependencies);
      this.emit('agent-inheritance-resolved', templateId, dependencies);
    }

    this.logger.info('Inheritance resolution completed');
  }

  private async resolveTemplateDependencies(template: AgentTemplate): Promise<string[]> {
    const dependencies: string[] = [];
    const visited = new Set<string>();

    if (template.inherits && template.inherits.length > 0) {
      for (const parentId of template.inherits) {
        await this.collectDependencies(parentId, dependencies, visited);
      }
    }

    return dependencies;
  }

  private async collectDependencies(
    templateId: string,
    dependencies: string[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(templateId)) return;
    visited.add(templateId);

    const parentTemplate = this.registry.templates.get(templateId);
    if (!parentTemplate) {
      this.logger.warn('Parent template not found', { templateId });
      return;
    }

    dependencies.push(templateId);

    if (parentTemplate.inherits) {
      for (const grandparentId of parentTemplate.inherits) {
        await this.collectDependencies(grandparentId, dependencies, visited);
      }
    }
  }

  public async validateAllTemplates(): Promise<Map<string, AgentValidationResult>> {
    this.logger.info('Validating all agent templates');
    const results = new Map<string, AgentValidationResult>();

    for (const [templateId, template] of this.registry.templates) {
      const result = await this.validateTemplate(template);
      results.set(templateId, result);
      this.registry.validationCache.set(templateId, result);

      this.emit('agent-template-validated', templateId, result);

      if (!result.valid) {
        this.emit('agent-validation-failed', templateId, result.errors);
      }
    }

    return results;
  }

  public async validateTemplate(template: AgentTemplate): Promise<AgentValidationResult> {
    return this.validator.validate(template, this.registry);
  }

  public async createAgentFromTemplate(
    templateId: string,
    overrides?: Partial<AgentTemplate>
  ): Promise<AgentConfig> {
    const template = this.registry.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Resolve inheritance
    const resolvedTemplate = await this.resolveTemplateWithInheritance(template);

    // Apply overrides
    const finalTemplate = overrides ? { ...resolvedTemplate, ...overrides } : resolvedTemplate;

    // Convert to AgentConfig
    const agentConfig = this.convertTemplateToConfig(finalTemplate);

    this.registry.agents.set(agentConfig.id, template);

    return agentConfig;
  }

  private async resolveTemplateWithInheritance(template: AgentTemplate): Promise<AgentTemplate> {
    let resolved = { ...template };

    if (template.inherits && template.inherits.length > 0) {
      for (const parentId of template.inherits) {
        const parentTemplate = this.registry.templates.get(parentId);
        if (parentTemplate) {
          resolved = this.mergeTemplates(parentTemplate, resolved);
        }
      }
    }

    return resolved;
  }

  private mergeTemplates(parent: AgentTemplate, child: AgentTemplate): AgentTemplate {
    return {
      ...parent,
      ...child,
      id: child.id,
      name: child.name,
      description: child.description,
      version: child.version,
      inherits: child.inherits,
      role: { ...parent.role, ...child.role },
      capabilities: this.mergeCapabilities(parent.capabilities, child.capabilities),
      provider: { ...parent.provider, ...child.provider },
      settings: { ...parent.settings, ...child.settings },
      metadata: { ...parent.metadata, ...child.metadata },
      tags: [...new Set([...parent.tags, ...child.tags])]
    };
  }

  private mergeCapabilities(parent: AgentCapability[], child: AgentCapability[]): AgentCapability[] {
    const merged = new Map<string, AgentCapability>();

    parent.forEach(cap => merged.set(cap.id, cap));
    child.forEach(cap => merged.set(cap.id, cap));

    return Array.from(merged.values());
  }

  private convertTemplateToConfig(template: AgentTemplate): AgentConfig {
    return {
      id: uuidv4(),
      name: template.name,
      type: template.type,
      role: template.role,
      provider: template.provider,
      capabilities: template.capabilities,
      maxConcurrency: template.settings.maxConcurrency as number || 5,
      memorySize: template.settings.memorySize as number || 10000,
      autoScale: template.settings.autoScale as boolean || true,
      healthCheckInterval: template.settings.healthCheckInterval as number || 30000,
      retryPolicy: this.buildRetryPolicy(template.settings),
      securityContext: this.buildSecurityContext(template.settings)
    };
  }

  private buildRetryPolicy(settings: Record<string, unknown>): RetryPolicy {
    return {
      maxAttempts: settings.retryMaxAttempts as number || 3,
      backoffMultiplier: settings.retryBackoffMultiplier as number || 2,
      initialDelay: settings.retryInitialDelay as number || 1000,
      maxDelay: settings.retryMaxDelay as number || 10000,
      retryableErrors: settings.retryableErrors as string[] || ['TIMEOUT', 'CONNECTION_ERROR']
    };
  }

  private buildSecurityContext(settings: Record<string, unknown>): SecurityContext {
    return {
      encryptionEnabled: settings.encryptionEnabled as boolean || false,
      authenticationRequired: settings.authenticationRequired as boolean || true,
      allowedOrigins: settings.allowedOrigins as string[] || ['*'],
      permissions: settings.permissions as Permission[] || [],
      auditEnabled: settings.auditEnabled as boolean || true
    };
  }

  private initializeVersionControl(template: AgentTemplate): void {
    this.versionControl.set(template.id, {
      current: template.version,
      versions: new Map([[template.version, template]]),
      changelog: []
    });
  }

  public async updateTemplate(
    templateId: string,
    updates: Partial<AgentTemplate>,
    changeLog?: string[]
  ): Promise<string> {
    const versionControl = this.versionControl.get(templateId);
    if (!versionControl) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const currentTemplate = versionControl.versions.get(versionControl.current);
    if (!currentTemplate) {
      throw new Error(`Current version not found for template: ${templateId}`);
    }

    const newVersion = this.incrementVersion(versionControl.current);
    const updatedTemplate: AgentTemplate = {
      ...currentTemplate,
      ...updates,
      version: newVersion,
      updated: new Date()
    };

    // Validate updated template
    const validationResult = await this.validateTemplate(updatedTemplate);
    if (!validationResult.valid) {
      throw new Error(`Template validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Save updates
    versionControl.versions.set(newVersion, updatedTemplate);
    versionControl.current = newVersion;

    if (changeLog) {
      versionControl.changelog.push({
        version: newVersion,
        timestamp: new Date(),
        changes: changeLog,
        breaking: changeLog.some(change => change.toLowerCase().includes('breaking'))
      });
    }

    this.registry.templates.set(templateId, updatedTemplate);
    this.emit('agent-template-updated', templateId, newVersion);

    return newVersion;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1] || '0'}.${patch}`;
  }

  public getTemplate(templateId: string): AgentTemplate | undefined {
    return this.registry.templates.get(templateId);
  }

  public getAllTemplates(): AgentTemplate[] {
    return Array.from(this.registry.templates.values());
  }

  public getTemplatesByType(type: 'queen' | 'worker' | 'specialist'): AgentTemplate[] {
    return Array.from(this.registry.templates.values()).filter(template => template.type === type);
  }

  public getTemplatesByTag(tag: string): AgentTemplate[] {
    return Array.from(this.registry.templates.values()).filter(template =>
      template.tags.includes(tag)
    );
  }

  public searchTemplates(query: string): AgentTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.registry.templates.values()).filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  public getTemplateVersionHistory(templateId: string): AgentVersionEntry[] {
    const versionControl = this.versionControl.get(templateId);
    return versionControl?.changelog || [];
  }

  public async exportTemplate(templateId: string, format: 'json' | 'markdown' = 'json'): Promise<string> {
    const template = this.registry.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (format === 'json') {
      return JSON.stringify(template, null, 2);
    } else {
      return this.markdownParser.toMarkdown(template);
    }
  }

  public async importTemplate(data: string, format: 'json' | 'markdown' = 'json'): Promise<string> {
    let template: AgentTemplate;

    if (format === 'json') {
      template = JSON.parse(data);
    } else {
      template = await this.markdownParser.parse(data);
    }

    // Validate template
    const validationResult = await this.validateTemplate(template);
    if (!validationResult.valid) {
      throw new Error(`Template validation failed: ${validationResult.errors.join(', ')}`);
    }

    this.registry.templates.set(template.id, template);
    this.initializeVersionControl(template);

    return template.id;
  }

  public getRegistryStats(): {
    templateCount: number;
    agentCount: number;
    typeDistribution: Record<string, number>;
    tagDistribution: Record<string, number>;
  } {
    const templates = Array.from(this.registry.templates.values());
    const typeDistribution: Record<string, number> = {};
    const tagDistribution: Record<string, number> = {};

    templates.forEach(template => {
      typeDistribution[template.type] = (typeDistribution[template.type] || 0) + 1;
      template.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });

    return {
      templateCount: this.registry.templates.size,
      agentCount: this.registry.agents.size,
      typeDistribution,
      tagDistribution
    };
  }
}