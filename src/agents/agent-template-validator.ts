import type { AgentTemplate, AgentValidationResult, AgentRegistry } from './specialty-agent-system';
import type { AgentConfig } from '@/types';

export class AgentTemplateValidator {
  public async validate(
    template: AgentTemplate,
    registry: AgentRegistry
  ): Promise<AgentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic structure validation
    this.validateBasicStructure(template, errors);

    // ID and naming validation
    this.validateIdAndNaming(template, errors, warnings);

    // Version validation
    this.validateVersion(template, errors, warnings);

    // Type validation
    this.validateAgentType(template, errors);

    // Role validation
    this.validateRole(template, errors, warnings);

    // Capabilities validation
    this.validateCapabilities(template, errors, warnings);

    // Provider validation
    this.validateProvider(template, errors, warnings);

    // Inheritance validation
    await this.validateInheritance(template, registry, errors, warnings);

    // Settings validation
    this.validateSettings(template, warnings, recommendations);

    // Security validation
    this.validateSecurity(template, errors, warnings);

    // Performance validation
    this.validatePerformance(template, warnings, recommendations);

    // Metadata validation
    this.validateMetadata(template, warnings);

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      recommendations
    };
  }

  private validateBasicStructure(template: AgentTemplate, errors: string[]): void {
    if (!template.id) {
      errors.push('Agent template must have an ID');
    }

    if (!template.name) {
      errors.push('Agent template must have a name');
    }

    if (!template.description) {
      errors.push('Agent template must have a description');
    }

    if (!template.type) {
      errors.push('Agent template must have a type');
    }

    if (!template.role) {
      errors.push('Agent template must have a role configuration');
    }

    if (!template.provider) {
      errors.push('Agent template must have a provider configuration');
    }
  }

  private validateIdAndNaming(template: AgentTemplate, errors: string[], warnings: string[]): void {
    // ID validation
    if (template.id) {
      if (template.id.length < 3) {
        errors.push('Agent ID must be at least 3 characters long');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(template.id)) {
        errors.push('Agent ID can only contain letters, numbers, hyphens, and underscores');
      }

      if (template.id.startsWith('_') || template.id.startsWith('-')) {
        warnings.push('Agent ID should not start with underscore or hyphen');
      }
    }

    // Name validation
    if (template.name) {
      if (template.name.length < 2) {
        errors.push('Agent name must be at least 2 characters long');
      }

      if (template.name.length > 100) {
        warnings.push('Agent name is quite long, consider a shorter name');
      }
    }

    // Description validation
    if (template.description) {
      if (template.description.length < 10) {
        warnings.push('Agent description is quite short, consider adding more detail');
      }

      if (template.description.length > 1000) {
        warnings.push('Agent description is very long, consider making it more concise');
      }
    }
  }

  private validateVersion(template: AgentTemplate, errors: string[], warnings: string[]): void {
    if (!template.version) {
      errors.push('Agent template must have a version');
      return;
    }

    // Semantic version validation
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    if (!versionRegex.test(template.version)) {
      errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
    }

    // Version format warnings
    if (template.version === '0.0.0') {
      warnings.push('Version 0.0.0 is typically used for development, consider a proper version');
    }

    if (!template.version.includes('.') || template.version.split('.').length !== 3) {
      warnings.push('Consider using semantic versioning (major.minor.patch)');
    }
  }

  private validateAgentType(template: AgentTemplate, errors: string[]): void {
    const validTypes = ['queen', 'worker', 'specialist'];
    if (!validTypes.includes(template.type)) {
      errors.push(`Agent type must be one of: ${validTypes.join(', ')}`);
    }

    // Type-specific validations
    if (template.type === 'queen' && template.role.type !== 'strategic') {
      errors.push('Queen agents should have a strategic role type');
    }

    if (template.type === 'worker' && template.role.type === 'strategic') {
      warnings.push('Worker agents typically should not have strategic roles');
    }
  }

  private validateRole(template: AgentTemplate, errors: string[], warnings: string[]): void {
    if (!template.role) return;

    // Role type validation
    const validRoleTypes = ['strategic', 'tactical', 'operational', 'analytical', 'creative'];
    if (!validRoleTypes.includes(template.role.type)) {
      errors.push(`Role type must be one of: ${validRoleTypes.join(', ')}`);
    }

    // Priority validation
    if (template.role.priority !== undefined) {
      if (typeof template.role.priority !== 'number') {
        errors.push('Role priority must be a number');
      } else if (template.role.priority < 0 || template.role.priority > 10) {
        errors.push('Role priority must be between 0 and 10');
      }
    }

    // Expertise validation
    if (template.role.expertise) {
      if (!Array.isArray(template.role.expertise)) {
        errors.push('Role expertise must be an array');
      } else {
        template.role.expertise.forEach((exp, index) => {
          if (typeof exp !== 'string') {
            errors.push(`Expertise item at index ${index} must be a string`);
          }
        });
      }
    }

    // Permissions validation
    if (template.role.permissions) {
      if (!Array.isArray(template.role.permissions)) {
        errors.push('Role permissions must be an array');
      } else {
        template.role.permissions.forEach((perm, index) => {
          if (!perm.id) {
            errors.push(`Permission at index ${index} must have an ID`);
          }
          if (!perm.resource) {
            errors.push(`Permission at index ${index} must have a resource`);
          }
          if (!Array.isArray(perm.actions)) {
            errors.push(`Permission actions at index ${index} must be an array`);
          }
        });
      }
    }
  }

  private validateCapabilities(template: AgentTemplate, errors: string[], warnings: string[]): void {
    if (!template.capabilities) {
      warnings.push('Agent has no capabilities defined');
      return;
    }

    if (!Array.isArray(template.capabilities)) {
      errors.push('Capabilities must be an array');
      return;
    }

    if (template.capabilities.length === 0) {
      warnings.push('Agent has no capabilities defined');
      return;
    }

    if (template.capabilities.length > 20) {
      warnings.push('Agent has many capabilities, consider if all are necessary');
    }

    template.capabilities.forEach((capability, index) => {
      // ID validation
      if (!capability.id) {
        errors.push(`Capability at index ${index} must have an ID`);
      }

      // Name validation
      if (!capability.name) {
        errors.push(`Capability at index ${index} must have a name`);
      }

      // Description validation
      if (!capability.description) {
        warnings.push(`Capability '${capability.name}' has no description`);
      }

      // Configuration validation
      if (capability.configuration && typeof capability.configuration !== 'object') {
        errors.push(`Capability '${capability.name}' configuration must be an object`);
      }

      // Enabled status validation
      if (capability.enabled !== undefined && typeof capability.enabled !== 'boolean') {
        errors.push(`Capability '${capability.name}' enabled status must be boolean`);
      }
    });

    // Duplicate capability check
    const capabilityIds = template.capabilities.map(cap => cap.id).filter(Boolean);
    const duplicates = capabilityIds.filter((id, index) => capabilityIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate capability IDs found: ${duplicates.join(', ')}`);
    }
  }

  private validateProvider(template: AgentTemplate, errors: string[], warnings: string[]): void {
    if (!template.provider) return;

    // Provider type validation
    const validProviderTypes = ['qwen', 'openai', 'claude', 'local', 'custom'];
    if (!validProviderTypes.includes(template.provider.type)) {
      errors.push(`Provider type must be one of: ${validProviderTypes.join(', ')}`);
    }

    // Model validation
    if (!template.provider.model) {
      errors.push('Provider must specify a model');
    }

    // Token limits
    if (template.provider.maxTokens) {
      if (typeof template.provider.maxTokens !== 'number') {
        errors.push('Provider maxTokens must be a number');
      } else if (template.provider.maxTokens <= 0) {
        errors.push('Provider maxTokens must be positive');
      } else if (template.provider.maxTokens > 100000) {
        warnings.push('High maxTokens limit may be expensive');
      }
    }

    // Temperature validation
    if (template.provider.temperature !== undefined) {
      if (typeof template.provider.temperature !== 'number') {
        errors.push('Provider temperature must be a number');
      } else if (template.provider.temperature < 0 || template.provider.temperature > 2) {
        errors.push('Provider temperature must be between 0 and 2');
      }
    }

    // Timeout validation
    if (template.provider.timeout) {
      if (typeof template.provider.timeout !== 'number') {
        errors.push('Provider timeout must be a number');
      } else if (template.provider.timeout <= 0) {
        errors.push('Provider timeout must be positive');
      } else if (template.provider.timeout > 300000) {
        warnings.push('Very high timeout may cause issues');
      }
    }

    // Rate limit validation
    if (template.provider.rateLimit) {
      const { rateLimit } = template.provider;

      if (rateLimit.requestsPerSecond && rateLimit.requestsPerSecond <= 0) {
        errors.push('Rate limit requestsPerSecond must be positive');
      }

      if (rateLimit.tokensPerSecond && rateLimit.tokensPerSecond <= 0) {
        errors.push('Rate limit tokensPerSecond must be positive');
      }

      if (rateLimit.burstLimit && rateLimit.burstLimit <= 0) {
        errors.push('Rate limit burstLimit must be positive');
      }

      if (rateLimit.retryAfter && rateLimit.retryAfter <= 0) {
        errors.push('Rate limit retryAfter must be positive');
      }
    }

    // Provider-specific validation
    if (template.provider.type === 'openai' || template.provider.type === 'claude') {
      if (!template.provider.apiKey) {
        warnings.push(`Provider ${template.provider.type} typically requires an API key`);
      }
    }

    if (template.provider.type === 'custom' && !template.provider.endpoint) {
      errors.push('Custom provider requires an endpoint');
    }
  }

  private async validateInheritance(
    template: AgentTemplate,
    registry: AgentRegistry,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!template.inherits || template.inherits.length === 0) return;

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularDependency = (templateId: string): boolean => {
      if (recursionStack.has(templateId)) return true;
      if (visited.has(templateId)) return false;

      visited.add(templateId);
      recursionStack.add(templateId);

      const currentTemplate = registry.templates.get(templateId);
      if (currentTemplate && currentTemplate.inherits) {
        for (const parent of currentTemplate.inherits) {
          if (hasCircularDependency(parent)) return true;
        }
      }

      recursionStack.delete(templateId);
      return false;
    };

    for (const parentId of template.inherits) {
      const parentTemplate = registry.templates.get(parentId);
      if (!parentTemplate) {
        errors.push(`Parent template not found: ${parentId}`);
        continue;
      }

      if (hasCircularDependency(parentId)) {
        errors.push(`Circular dependency detected: ${template.id} -> ${parentId}`);
      }
    }

    // Check inheritance depth
    let depth = 0;
    let current = template;
    while (current.inherits && current.inherits.length > 0 && depth < 10) {
      const parent = registry.templates.get(current.inherits[0]);
      if (!parent) break;
      current = parent;
      depth++;
    }

    if (depth >= 10) {
      warnings.push('Inheritance chain is very deep, consider flattening the hierarchy');
    }

    // Multiple inheritance warnings
    if (template.inherits.length > 3) {
      warnings.push('Multiple inheritance with many parents can be complex to manage');
    }
  }

  private validateSettings(
    template: AgentTemplate,
    warnings: string[],
    recommendations: string[]
  ): void {
    if (!template.settings) return;

    const commonSettings = [
      'maxConcurrency',
      'memorySize',
      'autoScale',
      'healthCheckInterval',
      'retryMaxAttempts'
    ];

    const missingSettings = commonSettings.filter(setting => !(setting in template.settings));
    if (missingSettings.length > 0) {
      recommendations.push(`Consider adding common settings: ${missingSettings.join(', ')}`);
    }

    // Validate specific settings
    if (template.settings.maxConcurrency !== undefined) {
      if (typeof template.settings.maxConcurrency !== 'number') {
        warnings.push('maxConcurrency should be a number');
      } else if (template.settings.maxConcurrency <= 0) {
        warnings.push('maxConcurrency should be positive');
      } else if (template.settings.maxConcurrency > 100) {
        warnings.push('Very high maxConcurrency may impact performance');
      }
    }

    if (template.settings.memorySize !== undefined) {
      if (typeof template.settings.memorySize !== 'number') {
        warnings.push('memorySize should be a number');
      } else if (template.settings.memorySize < 1000) {
        warnings.push('Low memorySize may limit agent capabilities');
      }
    }
  }

  private validateSecurity(template: AgentTemplate, errors: string[], warnings: string[]): void {
    if (!template.settings) return;

    // Security settings validation
    if (template.settings.encryptionEnabled !== undefined && typeof template.settings.encryptionEnabled !== 'boolean') {
      errors.push('encryptionEnabled must be boolean');
    }

    if (template.settings.authenticationRequired !== undefined && typeof template.settings.authenticationRequired !== 'boolean') {
      errors.push('authenticationRequired must be boolean');
    }

    if (template.settings.auditEnabled !== undefined && typeof template.settings.auditEnabled !== 'boolean') {
      errors.push('auditEnabled must be boolean');
    }

    // Allowed origins validation
    if (template.settings.allowedOrigins !== undefined) {
      if (!Array.isArray(template.settings.allowedOrigins)) {
        errors.push('allowedOrigins must be an array');
      } else if (template.settings.allowedOrigins.includes('*')) {
        warnings.push('Wildcard allowedOrigins ("*") may be a security risk');
      }
    }

    // Security recommendations
    if (template.settings.encryptionEnabled === false) {
      warnings.push('Consider enabling encryption for sensitive data');
    }

    if (template.settings.auditEnabled !== true) {
      recommendations.push('Consider enabling audit logging for security and compliance');
    }
  }

  private validatePerformance(
    template: AgentTemplate,
    warnings: string[],
    recommendations: string[]
  ): void {
    if (!template.settings) return;

    // Performance-related settings
    if (template.settings.healthCheckInterval !== undefined) {
      if (typeof template.settings.healthCheckInterval !== 'number') {
        warnings.push('healthCheckInterval should be a number');
      } else if (template.settings.healthCheckInterval < 5000) {
        warnings.push('Very low healthCheckInterval may impact performance');
      } else if (template.settings.healthCheckInterval > 300000) {
        warnings.push('High healthCheckInterval may delay issue detection');
      }
    }

    // Performance recommendations based on agent type
    if (template.type === 'queen') {
      if (template.settings.maxConcurrency > 1) {
        recommendations.push('Queen agents typically work better with maxConcurrency = 1');
      }
    }

    if (template.type === 'worker') {
      if (template.settings.maxConcurrency < 3) {
        recommendations.push('Consider increasing maxConcurrency for worker agents');
      }
    }
  }

  private validateMetadata(template: AgentTemplate, warnings: string[]): void {
    if (!template.metadata) return;

    if (typeof template.metadata !== 'object') {
      warnings.push('metadata should be an object');
      return;
    }

    // Check for large metadata
    const metadataSize = JSON.stringify(template.metadata).length;
    if (metadataSize > 10000) {
      warnings.push('Large metadata size may impact performance');
    }

    // Check for common metadata fields
    const commonFields = ['category', 'domain', 'complexity', 'dependencies'];
    const hasCommonFields = commonFields.some(field => field in template.metadata);
    if (!hasCommonFields) {
      warnings.push('Consider adding common metadata fields like category, domain, etc.');
    }
  }
}