import EventEmitter from 'eventemitter3';
import type { MemoryEntry, MemoryType, SystemConfig } from '@/types';
import { Logger } from '@/utils/logger';

export interface MemoryEvents {
  'entry:created': (entry: MemoryEntry) => void;
  'entry:accessed': (entryId: string, accessType: string) => void;
  'entry:updated': (entryId: string, oldEntry: MemoryEntry, newEntry: MemoryEntry) => void;
  'entry:deleted': (entryId: string) => void;
  'memory:compacted': (oldSize: number, newSize: number) => void;
  'memory:full': () => void;
}

export interface MemoryStats {
  totalEntries: number;
  totalSize: number;
  entriesByType: Map<MemoryType, number>;
  accessFrequency: Map<string, number>;
  compressionRatio: number;
  lastAccess: Date;
}

export class MemoryManager extends EventEmitter<MemoryEvents> {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: SystemConfig['database'];
  private logger: Logger;
  private maxSize: number;
  private currentSize: number = 0;
  private accessCounts: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'MemoryManager' });
    this.maxSize = 100000;
    this.config = {} as any;
  }

  public async initialize(config: SystemConfig['database']): Promise<void> {
    this.config = config;
    this.logger.info('Initializing Memory Manager', { type: config.type });

    this.startPeriodicCleanup();
  }

  public async createEntry(
    key: string,
    value: unknown,
    type: MemoryType,
    options: {
      expiry?: Date;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const entry: MemoryEntry = {
      id: this.generateId(),
      key,
      value,
      type,
      timestamp: new Date(),
      accessCount: 0,
      expiry: options.expiry,
      tags: options.tags || [],
      metadata: options.metadata || {}
    };

    const entrySize = this.calculateEntrySize(entry);

    if (this.currentSize + entrySize > this.maxSize) {
      await this.compactMemory();
    }

    if (this.currentSize + entrySize > this.maxSize) {
      this.emit('memory:full');
      throw new Error('Memory full');
    }

    this.entries.set(entry.id, entry);
    this.currentSize += entrySize;
    this.accessCounts.set(entry.id, 0);

    this.logger.debug('Memory entry created', { entryId: entry.id, key, type });
    this.emit('entry:created', entry);

    return entry.id;
  }

  public async getEntry(entryId: string): Promise<MemoryEntry | undefined> {
    const entry = this.entries.get(entryId);

    if (!entry) {
      return undefined;
    }

    if (entry.expiry && new Date() > entry.expiry) {
      await this.deleteEntry(entryId);
      return undefined;
    }

    entry.accessCount++;
    entry.lastAccessed = new Date();

    const currentAccessCount = this.accessCounts.get(entryId) || 0;
    this.accessCounts.set(entryId, currentAccessCount + 1);

    this.emit('entry:accessed', entryId, 'read');
    return entry;
  }

  public async updateEntry(
    entryId: string,
    updates: {
      value?: unknown;
      expiry?: Date;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Memory entry not found: ${entryId}`);
    }

    const oldEntry = { ...entry };
    const oldSize = this.calculateEntrySize(entry);

    if (updates.value !== undefined) entry.value = updates.value;
    if (updates.expiry !== undefined) entry.expiry = updates.expiry;
    if (updates.tags !== undefined) entry.tags = updates.tags;
    if (updates.metadata !== undefined) entry.metadata = updates.metadata;

    const newSize = this.calculateEntrySize(entry);
    this.currentSize = this.currentSize - oldSize + newSize;

    this.emit('entry:updated', entryId, oldEntry, entry);
  }

  public async deleteEntry(entryId: string): Promise<void> {
    const entry = this.entries.get(entryId);
    if (!entry) {
      return;
    }

    this.currentSize -= this.calculateEntrySize(entry);
    this.entries.delete(entryId);
    this.accessCounts.delete(entryId);

    this.emit('entry:deleted', entryId);
  }

  public async findByKey(key: string): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values()).filter(entry => entry.key === key);
  }

  public async findByType(type: MemoryType): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values()).filter(entry => entry.type === type);
  }

  public async findByTag(tag: string): Promise<MemoryEntry[]> {
    return Array.from(this.entries.values()).filter(entry => entry.tags.includes(tag));
  }

  public async search(query: string): Promise<MemoryEntry[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entries.values()).filter(entry =>
      entry.key.toLowerCase().includes(lowerQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  public getStats(): MemoryStats {
    const entriesByType = new Map<MemoryType, number>();

    for (const entry of this.entries.values()) {
      const count = entriesByType.get(entry.type) || 0;
      entriesByType.set(entry.type, count + 1);
    }

    return {
      totalEntries: this.entries.size,
      totalSize: this.currentSize,
      entriesByType,
      accessFrequency: new Map(this.accessCounts),
      compressionRatio: 1,
      lastAccess: new Date()
    };
  }

  private async compactMemory(): Promise<void> {
    const entries = Array.from(this.entries.entries());
    const oldSize = this.currentSize;

    entries.sort(([, a], [, b]) => {
      const aScore = this.calculateEvictionScore(a);
      const bScore = this.calculateEvictionScore(b);
      return aScore - bScore;
    });

    const entriesToRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < entriesToRemove; i++) {
      const [entryId, entry] = entries[i];
      await this.deleteEntry(entryId);
    }

    this.logger.info('Memory compacted', {
      oldSize,
      newSize: this.currentSize,
      entriesRemoved: entriesToRemove
    });

    this.emit('memory:compacted', oldSize, this.currentSize);
  }

  private calculateEvictionScore(entry: MemoryEntry): number {
    const age = Date.now() - entry.timestamp.getTime();
    const accessCount = this.accessCounts.get(entry.id) || 0;
    const isExpired = entry.expiry && new Date() > entry.expiry;

    if (isExpired) return -1;
    return age / (accessCount + 1);
  }

  private calculateEntrySize(entry: MemoryEntry): number {
    return JSON.stringify(entry).length * 2;
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredEntries();
    }, 60000);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = new Date();
    const expiredEntries = Array.from(this.entries.entries()).filter(
      ([, entry]) => entry.expiry && now > entry.expiry
    );

    for (const [entryId] of expiredEntries) {
      await this.deleteEntry(entryId);
    }

    if (expiredEntries.length > 0) {
      this.logger.debug('Cleaned up expired entries', { count: expiredEntries.length });
    }
  }

  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.entries.clear();
    this.accessCounts.clear();
    this.currentSize = 0;

    this.logger.info('Memory Manager shutdown complete');
  }
}