import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

export interface ConfigItem {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  category?: string;
  source: 'cli' | 'gui' | 'file' | 'env';
  lastModified?: Date;
}

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    default?: any;
    description?: string;
    category?: string;
    required?: boolean;
    validate?: (value: any) => boolean | string;
  };
}

export interface SyncEvents {
  'config:changed': ConfigItem[];
  'config:saved': { source: string; items: ConfigItem[] };
  'config:loaded': { source: string; items: ConfigItem[] };
  'sync:started': void;
  'sync:completed': { items: ConfigItem[]; conflicts: ConfigItem[] };
  'sync:error': { error: string };
}

export class ConfigSync extends EventEmitter {
  private configData: Map<string, ConfigItem> = new Map();
  private configFiles: Map<string, string> = new Map();
  private watchHandles: Map<string, any> = new Map();
  private schema: ConfigSchema = {};
  private syncInterval: NodeJS.Timeout | null = null;
  private logger: Logger;
  private configDir: string;

  constructor(configDir: string = './config') {
    super();
    this.configDir = path.resolve(configDir);
    this.logger = new Logger().withContext({ component: 'ConfigSync' });
    this.initializeDefaultSchema();
  }

  /**
   * Initialize the configuration sync system
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing configuration sync system');

    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Load existing configurations
      await this.loadAllConfigurations();

      // Setup file watching
      await this.setupFileWatching();

      // Start periodic sync
      this.startPeriodicSync();

      this.logger.info('Configuration sync system initialized');
    } catch (error) {
      this.logger.error('Failed to initialize configuration sync', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Set the configuration schema
   */
  setSchema(schema: ConfigSchema): void {
    this.schema = schema;
    this.logger.debug('Configuration schema updated', { schemaKeys: Object.keys(schema) });
  }

  /**
   * Get a configuration value
   */
  get(key: string): any {
    const item = this.configData.get(key);
    return item ? item.value : undefined;
  }

  /**
   * Set a configuration value
   */
  async set(key: string, value: any, source: 'cli' | 'gui' = 'cli'): Promise<void> {
    // Validate against schema
    if (this.schema[key]) {
      const validation = this.validateValue(key, value);
      if (validation !== true) {
        throw new Error(`Invalid value for ${key}: ${validation}`);
      }
    }

    const item: ConfigItem = {
      key,
      value,
      type: this.getValueType(value),
      source,
      lastModified: new Date()
    };

    this.configData.set(key, item);

    // Save to appropriate storage
    await this.saveConfigItem(item);

    // Emit change event
    this.emit('config:changed', [item]);

    this.logger.debug('Configuration item set', { key, value, source });
  }

  /**
   * Get all configuration items
   */
  getAll(): ConfigItem[] {
    return Array.from(this.configData.values());
  }

  /**
   * Get configuration items by category
   */
  getByCategory(category: string): ConfigItem[] {
    return Array.from(this.configData.values()).filter(item => item.category === category);
  }

  /**
   * Get configuration items by source
   */
  getBySource(source: 'cli' | 'gui' | 'file' | 'env'): ConfigItem[] {
    return Array.from(this.configData.values()).filter(item => item.source === source);
  }

  /**
   * Sync CLI and GUI configurations
   */
  async syncConfigurations(): Promise<{ items: ConfigItem[]; conflicts: ConfigItem[] }> {
    this.logger.info('Starting configuration synchronization');
    this.emit('sync:started');

    try {
      // Load current configurations
      await this.loadAllConfigurations();

      // Detect conflicts
      const conflicts = this.detectConflicts();

      // Resolve conflicts (GUI takes precedence for now)
      if (conflicts.length > 0) {
        this.logger.warn('Configuration conflicts detected', { conflicts: conflicts.length });
        await this.resolveConflicts(conflicts);
      }

      const items = this.getAll();

      // Save synchronized configuration
      await this.saveAllConfigurations();

      this.logger.info('Configuration synchronization completed', {
        totalItems: items.length,
        conflicts: conflicts.length
      });

      this.emit('sync:completed', { items, conflicts });

      return { items, conflicts };
    } catch (error) {
      this.logger.error('Configuration synchronization failed', error instanceof Error ? error : new Error(String(error)));
      this.emit('sync:error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Export configuration to file
   */
  async exportConfig(filePath: string, format: 'json' | 'env' = 'json'): Promise<void> {
    const configObject: any = {};
    this.configData.forEach((item, key) => {
      configObject[key] = item.value;
    });

    const fullPath = path.resolve(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    if (format === 'json') {
      await fs.writeFile(fullPath, JSON.stringify(configObject, null, 2));
    } else if (format === 'env') {
      const envContent = Object.entries(configObject)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(fullPath, envContent);
    }

    this.logger.info('Configuration exported', { filePath, format });
  }

  /**
   * Import configuration from file
   */
  async importConfig(filePath: string, format: 'json' | 'env' = 'json', source: 'cli' | 'gui' = 'cli'): Promise<void> {
    const fullPath = path.resolve(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    let configObject: any;

    if (format === 'json') {
      configObject = JSON.parse(content);
    } else if (format === 'env') {
      configObject = {};
      content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          configObject[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    // Import all configuration items
    for (const [key, value] of Object.entries(configObject)) {
      await this.set(key, value, source);
    }

    this.logger.info('Configuration imported', { filePath, format, source, itemCount: Object.keys(configObject).length });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up configuration sync system');

    // Clear sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Close file watchers
    for (const [path, handle] of this.watchHandles.entries()) {
      try {
        await handle.close();
      } catch (error) {
        this.logger.warn('Failed to close file watcher', { path, error });
      }
    }
    this.watchHandles.clear();

    this.logger.info('Configuration sync system cleaned up');
  }

  /**
   * Initialize default configuration schema
   */
  private initializeDefaultSchema(): void {
    this.schema = {
      'system.name': {
        type: 'string',
        default: 'Qwen Swarm',
        description: 'System name',
        category: 'system',
        required: true
      },
      'system.environment': {
        type: 'string',
        default: 'development',
        description: 'Running environment',
        category: 'system',
        validate: (value) => ['development', 'staging', 'production'].includes(value) || 'Must be development, staging, or production'
      },
      'api.port': {
        type: 'number',
        default: 3000,
        description: 'API server port',
        category: 'api',
        validate: (value) => (value >= 1000 && value <= 65535) || 'Port must be between 1000 and 65535'
      },
      'api.host': {
        type: 'string',
        default: 'localhost',
        description: 'API server host',
        category: 'api'
      },
      'websocket.port': {
        type: 'number',
        default: 3001,
        description: 'WebSocket server port',
        category: 'websocket',
        validate: (value) => (value >= 1000 && value <= 65535) || 'Port must be between 1000 and 65535'
      },
      'gui.enabled': {
        type: 'boolean',
        default: true,
        description: 'Enable GUI interface',
        category: 'gui'
      },
      'gui.port': {
        type: 'number',
        default: 5173,
        description: 'GUI server port',
        category: 'gui',
        validate: (value) => (value >= 1000 && value <= 65535) || 'Port must be between 1000 and 65535'
      },
      'gui.auto_open': {
        type: 'boolean',
        default: false,
        description: 'Automatically open GUI in browser',
        category: 'gui'
      },
      'agents.max_count': {
        type: 'number',
        default: 100,
        description: 'Maximum number of agents',
        category: 'agents',
        validate: (value) => value > 0 || 'Must be greater than 0'
      },
      'agents.auto_restart': {
        type: 'boolean',
        default: true,
        description: 'Automatically restart failed agents',
        category: 'agents'
      },
      'logging.level': {
        type: 'string',
        default: 'info',
        description: 'Logging level',
        category: 'logging',
        validate: (value) => ['debug', 'info', 'warn', 'error'].includes(value) || 'Must be debug, info, warn, or error'
      },
      'logging.file.enabled': {
        type: 'boolean',
        default: true,
        description: 'Enable file logging',
        category: 'logging'
      },
      'logging.file.path': {
        type: 'string',
        default: './logs',
        description: 'Log file directory',
        category: 'logging'
      },
      'development.hot_reload': {
        type: 'boolean',
        default: true,
        description: 'Enable hot reload in development',
        category: 'development'
      },
      'development.debug': {
        type: 'boolean',
        default: false,
        description: 'Enable debug mode',
        category: 'development'
      }
    };
  }

  /**
   * Load all configurations from various sources
   */
  private async loadAllConfigurations(): Promise<void> {
    this.configData.clear();

    // Load from environment variables
    await this.loadFromEnvironment();

    // Load from configuration files
    await this.loadFromFiles();

    // Apply schema defaults
    await this.applySchemaDefaults();

    this.logger.info('Configurations loaded', { itemCount: this.configData.size });
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<void> {
    for (const [key, schema] of Object.entries(this.schema)) {
      const envKey = key.toUpperCase().replace(/\./g, '_');
      const envValue = process.env[envKey];

      if (envValue !== undefined) {
        const parsedValue = this.parseValue(envValue, schema.type);
        this.configData.set(key, {
          key,
          value: parsedValue,
          type: schema.type,
          source: 'env',
          category: schema.category,
          lastModified: new Date()
        });
      }
    }
  }

  /**
   * Load configuration from files
   */
  private async loadFromFiles(): Promise<void> {
    const configFiles = ['default.json', 'production.json', 'development.json'];

    for (const fileName of configFiles) {
      const filePath = path.join(this.configDir, fileName);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const config = JSON.parse(content);

        for (const [key, value] of Object.entries(config)) {
          if (this.schema[key]) {
            this.configData.set(key, {
              key,
              value,
              type: this.schema[key].type,
              source: 'file',
              category: this.schema[key].category,
              lastModified: (await fs.stat(filePath)).mtime
            });
          }
        }

        this.configFiles.set(fileName, filePath);
      } catch (error) {
        // File might not exist, that's okay
        this.logger.debug('Could not load config file', { fileName, error: error instanceof Error ? error.message : error });
      }
    }
  }

  /**
   * Apply schema defaults for missing configuration
   */
  private async applySchemaDefaults(): Promise<void> {
    for (const [key, schema] of Object.entries(this.schema)) {
      if (!this.configData.has(key) && schema.default !== undefined) {
        this.configData.set(key, {
          key,
          value: schema.default,
          type: schema.type,
          source: 'file',
          category: schema.category,
          lastModified: new Date()
        });
      }
    }
  }

  /**
   * Setup file watching for configuration changes
   */
  private async setupFileWatching(): Promise<void> {
    const { watch } = await import('chokidar');

    for (const [fileName, filePath] of this.configFiles.entries()) {
      const watcher = watch(filePath, { persistent: true });

      watcher.on('change', async () => {
        this.logger.debug('Configuration file changed', { fileName });
        await this.loadFromFiles();
        this.emit('config:loaded', { source: 'file', items: this.getBySource('file') });
      });

      this.watchHandles.set(fileName, watcher);
    }
  }

  /**
   * Start periodic configuration synchronization
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncConfigurations();
      } catch (error) {
        this.logger.error('Periodic sync failed', error instanceof Error ? error : new Error(String(error)));
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Detect configuration conflicts
   */
  private detectConflicts(): ConfigItem[] {
    const conflicts: ConfigItem[] = [];
    const keyGroups: Map<string, ConfigItem[]> = new Map();

    // Group items by key
    this.configData.forEach(item => {
      if (!keyGroups.has(item.key)) {
        keyGroups.set(item.key, []);
      }
      keyGroups.get(item.key)!.push(item);
    });

    // Find keys with multiple items from different sources
    for (const [key, items] of keyGroups.entries()) {
      if (items.length > 1) {
        const uniqueSources = new Set(items.map(item => item.source));
        if (uniqueSources.size > 1) {
          // Get the most recent item
          const sortedItems = items.sort((a, b) =>
            (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0)
          );
          conflicts.push(sortedItems[0]);
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve configuration conflicts
   */
  private async resolveConflicts(conflicts: ConfigItem[]): Promise<void> {
    // For now, use a simple strategy: GUI takes precedence, then CLI, then file, then env
    const sourcePriority = ['gui', 'cli', 'file', 'env'];

    for (const conflict of conflicts) {
      const conflictItems = Array.from(this.configData.values())
        .filter(item => item.key === conflict.key);

      for (const source of sourcePriority) {
        const sourceItem = conflictItems.find(item => item.source === source);
        if (sourceItem) {
          // Keep this item and remove others
          conflictItems.forEach(item => {
            if (item.source !== source) {
              this.configData.delete(item.key);
            }
          });
          this.configData.set(conflict.key, sourceItem);
          break;
        }
      }
    }
  }

  /**
   * Save a single configuration item
   */
  private async saveConfigItem(item: ConfigItem): Promise<void> {
    if (item.source === 'file') {
      // Save to default.json
      const defaultConfigPath = path.join(this.configDir, 'default.json');
      let config: any = {};

      try {
        const content = await fs.readFile(defaultConfigPath, 'utf-8');
        config = JSON.parse(content);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
        config = {};
      }

      config[item.key] = item.value;
      await fs.writeFile(defaultConfigPath, JSON.stringify(config, null, 2));
    }

    this.emit('config:saved', { source: item.source, items: [item] });
  }

  /**
   * Save all configurations
   */
  private async saveAllConfigurations(): Promise<void> {
    const configObject: any = {};
    this.configData.forEach((item) => {
      if (item.source === 'file') {
        configObject[item.key] = item.value;
      }
    });

    const defaultConfigPath = path.join(this.configDir, 'default.json');
    await fs.writeFile(defaultConfigPath, JSON.stringify(configObject, null, 2));
  }

  /**
   * Validate a value against schema
   */
  private validateValue(key: string, value: any): boolean | string {
    if (!this.schema[key]) {
      return true; // No schema validation
    }

    const schema = this.schema[key];

    // Type validation
    if (typeof value !== schema.type) {
      return `Expected type ${schema.type}, got ${typeof value}`;
    }

    // Custom validation
    if (schema.validate) {
      return schema.validate(value);
    }

    return true;
  }

  /**
   * Get the type of a value
   */
  private getValueType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' {
    if (Array.isArray(value)) return 'array';
    return typeof value as 'string' | 'number' | 'boolean' | 'object';
  }

  /**
   * Parse a string value to the correct type
   */
  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'object':
      case 'array':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}