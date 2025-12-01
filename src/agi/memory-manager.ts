/**
 * AGI Memory Manager - Advanced memory system with context awareness and learning
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface MemoryEntry {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'working';
  content: any;
  context: Record<string, any>;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  importance: number; // 0-1 scale
  tags: string[];
  connections: string[]; // IDs of related memories
  embedding?: number[]; // For semantic search
}

export interface MemoryPattern {
  id: string;
  type: 'behavioral' | 'performance' | 'problem-solving' | 'communication';
  pattern: any;
  frequency: number;
  confidence: number;
  lastObserved: Date;
  outcomes: any[];
  context: Record<string, any>;
}

export interface MemoryQuery {
  type?: string;
  tags?: string[];
  importance?: number;
  timeRange?: { start: Date; end: Date };
  content?: string;
  context?: Record<string, any>;
  limit?: number;
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByType: Record<string, number>;
  averageImportance: number;
  mostAccessed: MemoryEntry[];
  recentPatterns: MemoryPattern[];
  compressionRatio: number;
}

export class AGIMemoryManager extends EventEmitter {
  private logger: Logger;
  private memories: Map<string, MemoryEntry> = new Map();
  private patterns: Map<string, MemoryPattern> = new Map();
  private workingMemory: MemoryEntry[] = [];
  private maxWorkingMemorySize: number;
  private compressionEnabled: boolean;
  private autoCleanup: boolean;

  constructor(memoryDepth: number = 5, maxWorkingMemorySize: number = 50) {
    super();
    this.logger = new Logger().withContext({ component: 'AGIMemoryManager' });
    this.maxWorkingMemorySize = maxWorkingMemorySize;
    this.compressionEnabled = true;
    this.autoCleanup = true;

    // Initialize with some basic memories
    this.initializeBaseMemories();
  }

  private initializeBaseMemories(): void {
    const baseMemories: MemoryEntry[] = [
      {
        id: uuidv4(),
        type: 'semantic',
        content: {
          knowledge: 'Programming patterns and best practices',
          languages: ['TypeScript', 'JavaScript', 'Python', 'Go'],
          frameworks: ['React', 'Node.js', 'Express', 'FastAPI'],
          concepts: ['Clean Architecture', 'SOLID Principles', 'Test-Driven Development']
        },
        context: { source: 'initialization', domain: 'programming' },
        timestamp: new Date(),
        accessCount: 0,
        lastAccessed: new Date(),
        importance: 0.9,
        tags: ['programming', 'patterns', 'best-practices'],
        connections: []
      },
      {
        id: uuidv4(),
        type: 'procedural',
        content: {
          process: 'Code analysis and optimization workflow',
          steps: [
            'Analyze code structure',
            'Identify bottlenecks',
            'Propose optimizations',
            'Validate improvements',
            'Implement changes'
          ]
        },
        context: { source: 'initialization', domain: 'workflow' },
        timestamp: new Date(),
        accessCount: 0,
        lastAccessed: new Date(),
        importance: 0.85,
        tags: ['workflow', 'optimization', 'analysis'],
        connections: []
      }
    ];

    baseMemories.forEach(memory => {
      this.memories.set(memory.id, memory);
    });

    this.logger.info('Base memories initialized', { count: baseMemories.length });
  }

  public async store(
    type: MemoryEntry['type'],
    content: any,
    context: Record<string, any> = {},
    importance: number = 0.5
  ): Promise<string> {
    const memory: MemoryEntry = {
      id: uuidv4(),
      type,
      content,
      context,
      timestamp: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      importance,
      tags: this.extractTags(content),
      connections: []
    };

    this.memories.set(memory.id, memory);

    // Add to working memory if recent or important
    if (importance > 0.7 || type === 'working') {
      this.addToWorkingMemory(memory);
    }

    // Generate embedding for semantic search
    if (type === 'semantic' || type === 'episodic') {
      memory.embedding = await this.generateEmbedding(content);
    }

    // Detect patterns
    await this.detectPatterns(memory);

    this.logger.debug('Memory stored', {
      id: memory.id,
      type,
      importance,
      totalMemories: this.memories.size
    });

    this.emit('memory:stored', memory);
    return memory.id;
  }

  public async recall(query: MemoryQuery): Promise<MemoryEntry[]> {
    let results: MemoryEntry[] = [];

    // Search through memories
    for (const memory of this.memories.values()) {
      if (this.matchesQuery(memory, query)) {
        // Update access statistics
        memory.accessCount++;
        memory.lastAccessed = new Date();
        results.push(memory);
      }
    }

    // Sort by relevance and importance
    results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });

    // Apply limit
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    this.logger.debug('Memory recall completed', {
      query,
      resultCount: results.length
    });

    this.emit('memory:recalled', { query, results });
    return results;
  }

  public async storePattern(
    type: MemoryPattern['type'],
    pattern: any,
    context: Record<string, any> = {}
  ): Promise<string> {
    const memoryPattern: MemoryPattern = {
      id: uuidv4(),
      type,
      pattern,
      frequency: 1,
      confidence: 0.5,
      lastObserved: new Date(),
      outcomes: [],
      context
    };

    // Check if similar pattern exists
    const existingPattern = this.findSimilarPattern(memoryPattern);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1.0);
      existingPattern.lastObserved = new Date();
      return existingPattern.id;
    }

    this.patterns.set(memoryPattern.id, memoryPattern);

    this.logger.debug('Pattern stored', {
      id: memoryPattern.id,
      type,
      confidence: memoryPattern.confidence
    });

    this.emit('pattern:stored', memoryPattern);
    return memoryPattern.id;
  }

  public getPatterns(type?: MemoryPattern['type']): MemoryPattern[] {
    const patterns = Array.from(this.patterns.values());
    return type ? patterns.filter(p => p.type === type) : patterns;
  }

  public async searchSimilar(content: any, limit: number = 5): Promise<MemoryEntry[]> {
    const embedding = await this.generateEmbedding(content);
    const similarities: Array<{ memory: MemoryEntry; similarity: number }> = [];

    for (const memory of this.memories.values()) {
      if (memory.embedding) {
        const similarity = this.calculateSimilarity(embedding, memory.embedding);
        similarities.push({ memory, similarity });
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit).map(item => item.memory);
  }

  public getWorkingMemory(): MemoryEntry[] {
    return [...this.workingMemory];
  }

  public getStats(): MemoryStats {
    const memoriesByType: Record<string, number> = {};
    let totalImportance = 0;

    for (const memory of this.memories.values()) {
      memoriesByType[memory.type] = (memoriesByType[memory.type] || 0) + 1;
      totalImportance += memory.importance;
    }

    const mostAccessed = Array.from(this.memories.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    const recentPatterns = Array.from(this.patterns.values())
      .sort((a, b) => b.lastObserved.getTime() - a.lastObserved.getTime())
      .slice(0, 5);

    return {
      totalMemories: this.memories.size,
      memoriesByType,
      averageImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
      mostAccessed,
      recentPatterns,
      compressionRatio: this.calculateCompressionRatio()
    };
  }

  public async consolidate(): Promise<void> {
    this.logger.info('Starting memory consolidation');

    // Consolidate similar memories
    await this.consolidateSimilarMemories();

    // Update pattern confidences
    await this.updatePatternConfidences();

    // Cleanup old, low-importance memories
    if (this.autoCleanup) {
      await this.cleanupOldMemories();
    }

    // Compress working memory
    if (this.compressionEnabled) {
      await this.compressWorkingMemory();
    }

    this.logger.info('Memory consolidation completed');
    this.emit('memory:consolidated', this.getStats());
  }

  private extractTags(content: any): string[] {
    const tags = new Set<string>();

    const extractFromObject = (obj: any, depth = 0) => {
      if (depth > 3) return; // Prevent infinite recursion

      if (typeof obj === 'string') {
        const words = obj.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && !['the', 'and', 'for', 'are', 'with'].includes(word)) {
            tags.add(word);
          }
        });
      } else if (Array.isArray(obj)) {
        obj.forEach(item => extractFromObject(item, depth + 1));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => extractFromObject(value, depth + 1));
      }
    };

    extractFromObject(content);
    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  }

  private matchesQuery(memory: MemoryEntry, query: MemoryQuery): boolean {
    if (query.type && memory.type !== query.type) {
      return false;
    }

    if (query.tags && !query.tags.some(tag => memory.tags.includes(tag))) {
      return false;
    }

    if (query.importance && memory.importance < query.importance) {
      return false;
    }

    if (query.timeRange) {
      const memoryTime = memory.timestamp.getTime();
      if (memoryTime < query.timeRange.start.getTime() ||
          memoryTime > query.timeRange.end.getTime()) {
        return false;
      }
    }

    if (query.content) {
      const contentStr = JSON.stringify(memory.content).toLowerCase();
      if (!contentStr.includes(query.content.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  private calculateRelevanceScore(memory: MemoryEntry, query: MemoryQuery): number {
    let score = memory.importance;

    // Boost recently accessed memories
    const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    score *= Math.exp(-daysSinceAccess / 30); // Decay over 30 days

    // Boost by access count
    score += Math.log(memory.accessCount + 1) * 0.1;

    // Context matching
    if (query.context) {
      const contextMatches = Object.keys(query.context).filter(
        key => memory.context[key] === query.context[key]
      ).length;
      score += contextMatches * 0.2;
    }

    return score;
  }

  private async generateEmbedding(content: any): Promise<number[]> {
    // Simple embedding generation (in a real implementation, this would use a proper embedding model)
    const contentStr = JSON.stringify(content).toLowerCase();
    const embedding = new Array(128).fill(0);

    // Simple character-based embedding
    for (let i = 0; i < Math.min(contentStr.length, 128); i++) {
      embedding[i] = contentStr.charCodeAt(i) / 255;
    }

    return embedding;
  }

  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private addToWorkingMemory(memory: MemoryEntry): void {
    // Remove oldest if at capacity
    if (this.workingMemory.length >= this.maxWorkingMemorySize) {
      const oldest = this.workingMemory.shift();
      if (oldest) {
        oldest.type = 'episodic'; // Move old working memory to episodic
      }
    }

    this.workingMemory.push(memory);
  }

  private async detectPatterns(memory: MemoryEntry): Promise<void> {
    // Simple pattern detection
    const recentMemories = Array.from(this.memories.values())
      .filter(m => (Date.now() - m.timestamp.getTime()) < 24 * 60 * 60 * 1000) // Last 24 hours
      .slice(-10); // Last 10 memories

    // Look for repeated patterns in recent memories
    if (recentMemories.length >= 3) {
      const similarMemories = recentMemories.filter(m =>
        this.calculateContentSimilarity(memory, m) > 0.7
      );

      if (similarMemories.length >= 2) {
        await this.storePattern('behavioral', {
          type: 'repeated_action',
          context: memory.context,
          frequency: similarMemories.length + 1
        }, memory.context);
      }
    }
  }

  private calculateContentSimilarity(memory1: MemoryEntry, memory2: MemoryEntry): number {
    const content1 = JSON.stringify(memory1.content);
    const content2 = JSON.stringify(memory2.content);

    // Simple Jaccard similarity
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private findSimilarPattern(newPattern: MemoryPattern): MemoryPattern | null {
    for (const pattern of this.patterns.values()) {
      if (pattern.type === newPattern.type) {
        const similarity = this.calculatePatternSimilarity(pattern, newPattern);
        if (similarity > 0.8) {
          return pattern;
        }
      }
    }
    return null;
  }

  private calculatePatternSimilarity(pattern1: MemoryPattern, pattern2: MemoryPattern): number {
    // Simple pattern similarity based on type and context
    if (pattern1.type !== pattern2.type) {
      return 0;
    }

    const contextKeys1 = Object.keys(pattern1.context);
    const contextKeys2 = Object.keys(pattern2.context);
    const commonKeys = contextKeys1.filter(key => contextKeys2.includes(key));

    return commonKeys.length / Math.max(contextKeys1.length, contextKeys2.length);
  }

  private async consolidateSimilarMemories(): Promise<void> {
    const memories = Array.from(this.memories.values());
    const groups: MemoryEntry[][] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) {
        continue;
      }

      const group = [memory];
      processed.add(memory.id);

      for (const otherMemory of memories) {
        if (processed.has(otherMemory.id)) {
          continue;
        }

        const similarity = this.calculateContentSimilarity(memory, otherMemory);
        if (similarity > 0.8) {
          group.push(otherMemory);
          processed.add(otherMemory.id);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    // Consolidate each group
    for (const group of groups) {
      if (group.length > 1) {
        await this.consolidateMemoryGroup(group);
      }
    }
  }

  private async consolidateMemoryGroup(group: MemoryEntry[]): Promise<void> {
    const primary = group[0];
    const consolidated: MemoryEntry = {
      ...primary,
      id: uuidv4(),
      content: {
        consolidated: true,
        originalCount: group.length,
        mergedContent: group.map(m => m.content)
      },
      importance: Math.max(...group.map(m => m.importance)),
      accessCount: group.reduce((sum, m) => sum + m.accessCount, 0),
      tags: [...new Set(group.flatMap(m => m.tags))],
      connections: []
    };

    // Remove old memories
    group.forEach(memory => {
      this.memories.delete(memory.id);
    });

    // Add consolidated memory
    this.memories.set(consolidated.id, consolidated);

    this.logger.debug('Memory group consolidated', {
      groupSize: group.length,
      newId: consolidated.id
    });
  }

  private async updatePatternConfidences(): Promise<void> {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago

    for (const pattern of this.patterns.values()) {
      // Decay confidence for old patterns
      if (pattern.lastObserved.getTime() < cutoffTime) {
        pattern.confidence *= 0.9;
      }

      // Remove patterns with very low confidence
      if (pattern.confidence < 0.1) {
        this.patterns.delete(pattern.id);
      }
    }
  }

  private async cleanupOldMemories(): Promise<void> {
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const toDelete: string[] = [];

    for (const [id, memory] of this.memories.entries()) {
      if (memory.timestamp.getTime() < cutoffTime &&
          memory.importance < 0.3 &&
          memory.accessCount < 2) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => {
      this.memories.delete(id);
    });

    if (toDelete.length > 0) {
      this.logger.debug('Old memories cleaned up', { count: toDelete.length });
    }
  }

  private async compressWorkingMemory(): Promise<void> {
    if (this.workingMemory.length <= this.maxWorkingMemorySize * 0.8) {
      return; // No compression needed
    }

    // Sort by importance and access count
    this.workingMemory.sort((a, b) => {
      const scoreA = a.importance + Math.log(a.accessCount + 1) * 0.1;
      const scoreB = b.importance + Math.log(b.accessCount + 1) * 0.1;
      return scoreB - scoreA;
    });

    // Keep only the most important memories
    const keepCount = Math.floor(this.maxWorkingMemorySize * 0.7);
    const removed = this.workingMemory.splice(keepCount);

    // Move removed memories to episodic
    removed.forEach(memory => {
      memory.type = 'episodic';
      this.memories.set(memory.id, memory);
    });

    this.logger.debug('Working memory compressed', {
      originalSize: this.workingMemory.length + removed.length,
      compressedSize: this.workingMemory.length,
      movedToEpisodic: removed.length
    });
  }

  private calculateCompressionRatio(): number {
    const totalSize = this.memories.size + this.workingMemory.length;
    const originalSize = this.memories.size + this.workingMemory.length * 2; // Assume working memory is more expensive
    return originalSize > 0 ? totalSize / originalSize : 1;
  }
}