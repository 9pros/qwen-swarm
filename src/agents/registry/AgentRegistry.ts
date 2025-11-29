/**
 * Agent Registry System
 *
 * Manages discovery, registration, and loading of specialty agents
 * from external repositories including VoltAgent's awesome-claude-code-subagents
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';

export interface AgentDefinition {
  name: string;
  description: string;
  category: string;
  tools: string[];
  source?: {
    repository: string;
    filePath: string;
    version?: string;
  };
  metadata?: {
    author?: string;
    license?: string;
    tags?: string[];
    compatibility?: string[];
    lastUpdated?: string;
  };
  content?: string;
}

export interface AgentRegistryConfig {
  registries: AgentSource[];
  cacheDirectory: string;
  autoUpdate: boolean;
  updateInterval: number; // hours
  enabledCategories: string[];
}

export interface AgentSource {
  name: string;
  url: string;
  type: 'github' | 'local' | 'remote';
  enabled: boolean;
  category?: string;
}

export interface RegistryStats {
  totalAgents: number;
  categories: Record<string, number>;
  lastUpdated: string;
  enabledSources: number;
}

export class AgentRegistry {
  private config: AgentRegistryConfig;
  private agents: Map<string, AgentDefinition> = new Map();
  private categories: Set<string> = new Set();

  constructor(config?: Partial<AgentRegistryConfig>) {
    this.config = {
      registries: [
        {
          name: 'VoltAgent Subagents',
          url: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
          type: 'github',
          enabled: true
        }
      ],
      cacheDirectory: join(process.cwd(), '.cache', 'agents'),
      autoUpdate: true,
      updateInterval: 24,
      enabledCategories: [
        'core-development',
        'language-specialists',
        'infrastructure',
        'quality-security',
        'data-ai',
        'developer-experience',
        'specialized-domains',
        'business-product',
        'meta-orchestration',
        'research-analysis'
      ],
      ...config
    };
  }

  /**
   * Initialize the agent registry
   */
  async initialize(): Promise<void> {
    try {
      // Ensure cache directory exists
      await mkdir(this.config.cacheDirectory, { recursive: true });

      // Load cached agents
      await this.loadCachedAgents();

      // Update from remote sources if auto-update is enabled
      if (this.config.autoUpdate) {
        await this.updateFromSources();
      }

      console.log(`Agent Registry initialized with ${this.agents.size} agents`);
    } catch (error) {
      console.error('Failed to initialize Agent Registry:', error);
      throw error;
    }
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: string): AgentDefinition[] {
    return this.getAllAgents().filter(agent => agent.category === category);
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  /**
   * Search agents by query
   */
  searchAgents(query: string): AgentDefinition[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllAgents().filter(agent =>
      agent.name.toLowerCase().includes(lowercaseQuery) ||
      agent.description.toLowerCase().includes(lowercaseQuery) ||
      agent.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get available categories
   */
  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const categories: Record<string, number> = {};

    this.agents.forEach(agent => {
      categories[agent.category] = (categories[agent.category] || 0) + 1;
    });

    return {
      totalAgents: this.agents.size,
      categories,
      lastUpdated: new Date().toISOString(),
      enabledSources: this.config.registries.filter(r => r.enabled).length
    };
  }

  /**
   * Install agent from external source
   */
  async installAgent(sourceUrl: string, category?: string): Promise<void> {
    try {
      // Parse source URL and download agent definition
      const agentDef = await this.downloadAgentDefinition(sourceUrl);

      // Set category if provided
      if (category) {
        agentDef.category = category;
      }

      // Add to registry
      this.agents.set(agentDef.name, agentDef);
      this.categories.add(agentDef.category);

      // Cache the agent
      await this.cacheAgent(agentDef);

      console.log(`Installed agent: ${agentDef.name}`);
    } catch (error) {
      console.error(`Failed to install agent from ${sourceUrl}:`, error);
      throw error;
    }
  }

  /**
   * Remove agent from registry
   */
  async uninstallAgent(name: string): Promise<void> {
    try {
      if (!this.agents.has(name)) {
        throw new Error(`Agent ${name} not found`);
      }

      // Remove from registry
      this.agents.delete(name);

      // Remove from cache
      const cachePath = join(this.config.cacheDirectory, `${name}.json`);
      try {
        await unlink(cachePath);
      } catch (error) {
        // Cache file might not exist
      }

      console.log(`Uninstalled agent: ${name}`);
    } catch (error) {
      console.error(`Failed to uninstall agent ${name}:`, error);
      throw error;
    }
  }

  /**
   * Update agents from remote sources
   */
  async updateFromSources(): Promise<void> {
    for (const source of this.config.registries) {
      if (!source.enabled) continue;

      try {
        await this.updateFromSource(source);
      } catch (error) {
        console.error(`Failed to update from source ${source.name}:`, error);
      }
    }
  }

  /**
   * Update from a specific source
   */
  private async updateFromSource(source: AgentSource): Promise<void> {
    switch (source.type) {
      case 'github':
        await this.updateFromGitHub(source);
        break;
      case 'local':
        await this.updateFromLocal(source);
        break;
      case 'remote':
        await this.updateFromRemote(source);
        break;
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Update from GitHub repository
   */
  private async updateFromGitHub(source: AgentSource): Promise<void> {
    try {
      // For now, we'll clone and parse the VoltAgent repository
      // In production, this would use GitHub API or more efficient methods
      const tempDir = join(this.config.cacheDirectory, 'temp', source.name);

      // Clone repository (simplified - would use proper git operations)
      console.log(`Updating from GitHub: ${source.url}`);

      // Parse agent definitions from categories
      const categoriesDir = join(tempDir, 'categories');
      const categoryDirs = await glob('*/', { cwd: categoriesDir });

      for (const categoryDir of categoryDirs) {
        const categoryName = categoryDir.replace('/', '');

        if (!this.config.enabledCategories.includes(categoryName)) {
          continue;
        }

        const agentFiles = await glob('*.md', {
          cwd: join(categoriesDir, categoryDir)
        });

        for (const agentFile of agentFiles) {
          if (agentFile === 'README.md') continue;

          const agentPath = join(categoriesDir, categoryDir, agentFile);
          const agentDef = await this.parseAgentDefinition(agentPath, categoryName);

          if (agentDef) {
            this.agents.set(agentDef.name, agentDef);
            this.categories.add(categoryName);
            await this.cacheAgent(agentDef);
          }
        }
      }

      console.log(`Updated ${this.agents.size} agents from ${source.name}`);
    } catch (error) {
      console.error(`Failed to update from GitHub ${source.url}:`, error);
      throw error;
    }
  }

  /**
   * Update from local directory
   */
  private async updateFromLocal(source: AgentSource): Promise<void> {
    // Implementation for local directory sources
    console.log(`Updating from local source: ${source.url}`);
  }

  /**
   * Update from remote API
   */
  private async updateFromRemote(source: AgentSource): Promise<void> {
    // Implementation for remote API sources
    console.log(`Updating from remote source: ${source.url}`);
  }

  /**
   * Parse agent definition from markdown file
   */
  private async parseAgentDefinition(filePath: string, category: string): Promise<AgentDefinition | null> {
    try {
      const content = await readFile(filePath, 'utf-8');

      // Extract YAML frontmatter
      const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
      if (!frontmatterMatch) {
        return null;
      }

      const frontmatter = frontmatterMatch[1];
      const agentContent = content.replace(/^---\n.*?\n---\s*/s, '');

      // Parse YAML (simplified)
      const metadata: any = {};
      frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          metadata[key.trim()] = value.replace(/['"]/g, '');
        }
      });

      const agentName = metadata.name || filePath.split('/').pop()?.replace('.md', '');

      return {
        name: agentName,
        description: metadata.description || '',
        category,
        tools: metadata.tools ? metadata.tools.split(',').map((t: string) => t.trim()) : [],
        source: {
          repository: 'VoltAgent/awesome-claude-code-subagents',
          filePath,
          version: 'latest'
        },
        metadata: {
          author: 'VoltAgent Community',
          license: 'MIT',
          tags: [],
          compatibility: ['claude-code'],
          lastUpdated: new Date().toISOString()
        },
        content: agentContent
      };
    } catch (error) {
      console.error(`Failed to parse agent definition from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Cache agent definition
   */
  private async cacheAgent(agent: AgentDefinition): Promise<void> {
    try {
      const cachePath = join(this.config.cacheDirectory, `${agent.name}.json`);
      await writeFile(cachePath, JSON.stringify(agent, null, 2));
    } catch (error) {
      console.error(`Failed to cache agent ${agent.name}:`, error);
    }
  }

  /**
   * Load cached agents
   */
  private async loadCachedAgents(): Promise<void> {
    try {
      const cacheFiles = await glob('*.json', { cwd: this.config.cacheDirectory });

      for (const cacheFile of cacheFiles) {
        const cachePath = join(this.config.cacheDirectory, cacheFile);
        const content = await readFile(cachePath, 'utf-8');
        const agent: AgentDefinition = JSON.parse(content);

        this.agents.set(agent.name, agent);
        this.categories.add(agent.category);
      }

      console.log(`Loaded ${cacheFiles.length} agents from cache`);
    } catch (error) {
      console.error('Failed to load cached agents:', error);
    }
  }

  /**
   * Download agent definition from URL
   */
  private async downloadAgentDefinition(url: string): Promise<AgentDefinition> {
    // Implementation for downloading agent definitions
    // This would use fetch or similar to download from URLs
    throw new Error('Agent download not yet implemented');
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();