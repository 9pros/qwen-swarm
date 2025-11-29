import type { AgentTemplate, AgentCapability, AgentRole, ProviderConfig, Permission } from './specialty-agent-system';

export class AgentMarkdownParser {
  private readonly FRONTMatter_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

  public async parse(content: string, filePath?: string): Promise<AgentTemplate | null> {
    try {
      const match = this.FRONTMatter_REGEX.exec(content);
      if (!match) {
        throw new Error('Invalid agent template format: missing frontmatter');
      }

      const [, frontmatterStr, markdownContent] = match;
      const frontmatter = this.parseYAML(frontmatterStr);
      const description = this.parseDescription(markdownContent);

      return this.buildTemplate(frontmatter, description, filePath);
    } catch (error) {
      console.error('Failed to parse agent template:', error);
      return null;
    }
  }

  private parseYAML(yamlStr: string): Record<string, unknown> {
    const lines = yamlStr.split('\n');
    const result: Record<string, unknown> = {};
    const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);
      const keyMatch = trimmed.match(/^(\w+):\s*(.*)$/);

      if (keyMatch) {
        const [, key, value] = keyMatch;

        // Pop stack until we find the right parent level
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }

        const current = stack[stack.length - 1].obj;

        if (value === '') {
          // This is a parent for nested properties
          current[key] = {};
          stack.push({ obj: current[key] as Record<string, unknown>, indent });
        } else {
          current[key] = this.parseValue(value);
        }
      }
    }

    return result;
  }

  private parseValue(value: string): unknown {
    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Handle booleans
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Handle numbers
    const num = Number(value);
    if (!isNaN(num)) return num;

    // Handle arrays (simple comma-separated)
    if (value.includes(',')) {
      return value.split(',').map(item => this.parseValue(item.trim()));
    }

    return value;
  }

  private parseDescription(markdownContent: string): string {
    // Extract the first paragraph as description
    const lines = markdownContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';

    let description = '';
    for (const line of lines) {
      if (line.startsWith('#')) break; // Stop at first heading
      if (line.trim()) {
        description += line.trim() + ' ';
      }
    }

    return description.trim();
  }

  private buildTemplate(frontmatter: Record<string, unknown>, description: string, filePath?: string): AgentTemplate {
    const now = new Date();

    return {
      id: this.getRequiredString(frontmatter, 'id', this.generateIdFromPath(filePath)),
      name: this.getRequiredString(frontmatter, 'name', 'Unnamed Agent'),
      description: description || this.getRequiredString(frontmatter, 'description', ''),
      version: this.getString(frontmatter, 'version', '1.0.0'),
      inherits: this.getStringArray(frontmatter, 'inherits'),
      type: this.getAgentType(frontmatter),
      role: this.parseAgentRole(frontmatter),
      capabilities: this.parseCapabilities(frontmatter),
      provider: this.parseProviderConfig(frontmatter),
      settings: this.getRecord(frontmatter, 'settings') || {},
      metadata: this.getRecord(frontmatter, 'metadata') || {},
      created: this.parseDate(frontmatter, 'created') || now,
      updated: this.parseDate(frontmatter, 'updated') || now,
      author: this.getString(frontmatter, 'author'),
      tags: this.getStringArray(frontmatter, 'tags') || []
    };
  }

  private generateIdFromPath(filePath?: string): string {
    if (!filePath) return `agent-${Date.now()}`;

    const basename = filePath.split('/').pop()?.replace(/\.(md|json)$/, '');
    return basename || `agent-${Date.now()}`;
  }

  private getRequiredString(obj: Record<string, unknown>, key: string, fallback: string): string {
    return this.getString(obj, key, fallback);
  }

  private getString(obj: Record<string, unknown>, key: string, fallback?: string): string | undefined {
    const value = obj[key];
    return typeof value === 'string' ? value : fallback;
  }

  private getStringArray(obj: Record<string, unknown>, key: string): string[] | undefined {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value.map(item => typeof item === 'string' ? item : String(item));
    }
    return undefined;
  }

  private getRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
    const value = obj[key];
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
  }

  private parseDate(obj: Record<string, unknown>, key: string): Date | undefined {
    const value = obj[key];
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } else if (typeof value === 'number') {
      return new Date(value);
    }
    return undefined;
  }

  private getAgentType(frontmatter: Record<string, unknown>): 'queen' | 'worker' | 'specialist' {
    const type = this.getString(frontmatter, 'type', 'worker');
    const validTypes = ['queen', 'worker', 'specialist'];
    return validTypes.includes(type) ? type as 'queen' | 'worker' | 'specialist' : 'worker';
  }

  private parseAgentRole(frontmatter: Record<string, unknown>): AgentRole {
    const roleData = this.getRecord(frontmatter, 'role') || {};

    return {
      type: this.getString(roleData, 'type') as any || 'operational',
      permissions: this.parsePermissions(roleData),
      expertise: this.getStringArray(roleData, 'expertise') || [],
      priority: (roleData.priority as number) || 5
    };
  }

  private parsePermissions(obj: Record<string, unknown>): Permission[] {
    const permissionsData = this.getRecord(obj, 'permissions');
    if (!permissionsData || !Array.isArray(permissionsData.items)) return [];

    return (permissionsData.items as Record<string, unknown>[]).map(perm => ({
      id: this.getString(perm, 'id') || '',
      resource: this.getString(perm, 'resource') || '',
      actions: this.getStringArray(perm, 'actions') || [],
      conditions: this.getRecord(perm, 'conditions') || {}
    }));
  }

  private parseCapabilities(frontmatter: Record<string, unknown>): AgentCapability[] {
    const capabilitiesData = this.getRecord(frontmatter, 'capabilities');
    if (!capabilitiesData || !Array.isArray(capabilitiesData.items)) return [];

    return (capabilitiesData.items as Record<string, unknown>[]).map(cap => ({
      id: this.getString(cap, 'id') || '',
      name: this.getString(cap, 'name') || '',
      description: this.getString(cap, 'description') || '',
      enabled: (cap.enabled as boolean) ?? true,
      configuration: this.getRecord(cap, 'configuration') || {}
    }));
  }

  private parseProviderConfig(frontmatter: Record<string, unknown>): ProviderConfig {
    const providerData = this.getRecord(frontmatter, 'provider') || {};
    const rateLimitData = this.getRecord(providerData, 'rateLimit') || {};

    return {
      type: this.getString(providerData, 'type') as any || 'qwen',
      endpoint: this.getString(providerData, 'endpoint'),
      apiKey: this.getString(providerData, 'apiKey'),
      model: this.getString(providerData, 'model') || 'default',
      maxTokens: (providerData.maxTokens as number) || 4000,
      temperature: (providerData.temperature as number) || 0.7,
      timeout: (providerData.timeout as number) || 30000,
      rateLimit: {
        requestsPerSecond: (rateLimitData.requestsPerSecond as number) || 10,
        tokensPerSecond: (rateLimitData.tokensPerSecond as number) || 10000,
        burstLimit: (rateLimitData.burstLimit as number) || 100,
        retryAfter: (rateLimitData.retryAfter as number) || 1000
      }
    };
  }

  public toMarkdown(template: AgentTemplate): string {
    const frontmatter = this.buildFrontmatter(template);
    const description = template.description || '';

    return `---
${frontmatter}
---

${description}

## Overview

This agent template defines a ${template.type} agent with the following characteristics:

- **Type**: ${template.type}
- **Version**: ${template.version}
- **Author**: ${template.author || 'Unknown'}
- **Tags**: ${template.tags.join(', ')}

## Capabilities

${template.capabilities.map(cap => `- **${cap.name}**: ${cap.description}`).join('\n')}

## Configuration

The agent is configured with the following settings:

${Object.entries(template.settings).map(([key, value]) => `- **${key}**: ${JSON.stringify(value)}`).join('\n')}

## Usage

To create an agent from this template:

\`\`\`typescript
const agentConfig = await specialtyAgentSystem.createAgentFromTemplate('${template.id}');
\`\`\`
`;
  }

  private buildFrontmatter(template: AgentTemplate): string {
    const frontmatter: Record<string, unknown> = {
      id: template.id,
      name: template.name,
      type: template.type,
      version: template.version,
      description: template.description,
      author: template.author,
      tags: template.tags,
      created: template.created.toISOString(),
      updated: template.updated.toISOString()
    };

    if (template.inherits && template.inherits.length > 0) {
      frontmatter.inherits = template.inherits;
    }

    frontmatter.role = this.buildRoleFrontmatter(template.role);
    frontmatter.capabilities = this.buildCapabilitiesFrontmatter(template.capabilities);
    frontmatter.provider = this.buildProviderFrontmatter(template.provider);
    frontmatter.settings = template.settings;
    frontmatter.metadata = template.metadata;

    return this.stringifyYAML(frontmatter);
  }

  private buildRoleFrontmatter(role: AgentRole): Record<string, unknown> {
    return {
      type: role.type,
      permissions: {
        items: role.permissions
      },
      expertise: role.expertise,
      priority: role.priority
    };
  }

  private buildCapabilitiesFrontmatter(capabilities: AgentCapability[]): Record<string, unknown> {
    return {
      items: capabilities
    };
  }

  private buildProviderFrontmatter(provider: ProviderConfig): Record<string, unknown> {
    return {
      type: provider.type,
      endpoint: provider.endpoint,
      model: provider.model,
      maxTokens: provider.maxTokens,
      temperature: provider.temperature,
      timeout: provider.timeout,
      rateLimit: provider.rateLimit
    };
  }

  private stringifyYAML(obj: Record<string, unknown>, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          yaml += `${spaces}  - ${this.stringifyValue(item)}\n`;
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.stringifyYAML(value as Record<string, unknown>, indent + 1);
      } else {
        yaml += `${spaces}${key}: ${this.stringifyValue(value)}\n`;
      }
    }

    return yaml;
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === 'string') {
      // Quote if it contains special characters or spaces
      if (value.includes(' ') || value.includes(':') || value.includes('#')) {
        return `"${value}"`;
      }
      return value;
    }
    return String(value);
  }
}