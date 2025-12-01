/**
 * AGI Learning Engine - Advanced learning and adaptation system
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from '../utils/logger';
import { AGIMemoryManager, MemoryEntry, MemoryPattern } from './memory-manager';
import { v4 as uuidv4 } from 'uuid';

export interface LearningStrategy {
  id: string;
  name: string;
  description: string;
  applicable: (context: any) => boolean;
  execute: (context: any, memory: AGIMemoryManager) => Promise<LearningResult>;
}

export interface LearningResult {
  success: boolean;
  insights: string[];
  improvements: string[];
  newKnowledge: any;
  confidence: number;
  strategyUsed: string;
  timestamp: Date;
}

export interface LearningMetrics {
  totalLearningSessions: number;
  successfulLearning: number;
  averageConfidence: number;
  strategiesUsed: Record<string, number>;
  knowledgeGrowth: number;
  adaptationRate: number;
}

export interface KnowledgeDomain {
  id: string;
  name: string;
  concepts: Map<string, any>;
  relationships: Map<string, string[]>;
  confidence: number;
  lastUpdated: Date;
}

export class AGILearningEngine extends EventEmitter {
  private logger: Logger;
  private memory: AGIMemoryManager;
  private strategies: Map<string, LearningStrategy> = new Map();
  private knowledgeDomains: Map<string, KnowledgeDomain> = new Map();
  private learningRate: number;
  private adaptationThreshold: number;
  private metrics: LearningMetrics;

  constructor(learningRate: number = 0.7, memory?: AGIMemoryManager) {
    super();
    this.logger = new Logger().withContext({ component: 'AGILearningEngine' });
    this.learningRate = learningRate;
    this.adaptationThreshold = 0.6;
    this.memory = memory || new AGIMemoryManager();

    this.metrics = {
      totalLearningSessions: 0,
      successfulLearning: 0,
      averageConfidence: 0,
      strategiesUsed: {},
      knowledgeGrowth: 0,
      adaptationRate: 0
    };

    this.initializeStrategies();
    this.initializeKnowledgeDomains();
  }

  private initializeStrategies(): void {
    // Pattern Recognition Strategy
    this.strategies.set('pattern-recognition', {
      id: 'pattern-recognition',
      name: 'Pattern Recognition',
      description: 'Identify and learn from recurring patterns in data and behavior',
      applicable: (context) => context.data && Array.isArray(context.data) && context.data.length > 2,
      execute: async (context, memory) => {
        const patterns = await this.identifyPatterns(context.data);
        const insights = [];
        const improvements = [];

        for (const pattern of patterns) {
          await memory.storePattern('behavioral', pattern.pattern, pattern.context);
          insights.push(`Pattern identified: ${pattern.description}`);

          if (pattern.confidence > 0.8) {
            improvements.push(`Optimize based on high-confidence pattern: ${pattern.description}`);
          }
        }

        return {
          success: patterns.length > 0,
          insights,
          improvements,
          newKnowledge: { patterns },
          confidence: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0,
          strategyUsed: 'pattern-recognition',
          timestamp: new Date()
        };
      }
    });

    // Experience Replay Strategy
    this.strategies.set('experience-replay', {
      id: 'experience-replay',
      name: 'Experience Replay',
      description: 'Replay and learn from past experiences to improve decision making',
      applicable: (context) => context.experience && context.taskType,
      execute: async (context, memory) => {
        const relatedMemories = await memory.recall({
          type: 'episodic',
          context: { taskType: context.taskType },
          limit: 10
        });

        const insights = [];
        const improvements = [];
        let totalConfidence = 0;

        for (const mem of relatedMemories) {
          if (mem.content.success && mem.content.outcome) {
            insights.push(`Successful strategy: ${mem.content.strategy}`);
            totalConfidence += mem.importance;

            if (mem.content.improvements) {
              improvements.push(...mem.content.improvements);
            }
          }
        }

        return {
          success: relatedMemories.length > 0,
          insights,
          improvements: improvements.slice(0, 3), // Top 3 improvements
          newKnowledge: { relatedExperiences: relatedMemories.length },
          confidence: relatedMemories.length > 0 ? totalConfidence / relatedMemories.length : 0,
          strategyUsed: 'experience-replay',
          timestamp: new Date()
        };
      }
    });

    // Conceptual Learning Strategy
    this.strategies.set('conceptual-learning', {
      id: 'conceptual-learning',
      name: 'Conceptual Learning',
      description: 'Learn new concepts and build mental models',
      applicable: (context) => context.newInformation || context.explanation,
      execute: async (context, memory) => {
        const concepts = this.extractConcepts(context.newInformation || context.explanation);
        const insights = [];
        const improvements = [];

        for (const concept of concepts) {
          const domain = this.getOrCreateDomain(concept.domain);

          // Update concept in domain
          domain.concepts.set(concept.name, {
            definition: concept.definition,
            examples: concept.examples,
            confidence: concept.confidence,
            lastSeen: new Date()
          });

          insights.push(`Concept learned: ${concept.name} in ${concept.domain}`);

          // Check for relationships
          const relatedConcepts = this.findRelatedConcepts(concept, domain);
          if (relatedConcepts.length > 0) {
            domain.relationships.set(concept.name, relatedConcepts.map(c => c.name));
            improvements.push(`Connected ${concept.name} to existing concepts`);
          }

          domain.lastUpdated = new Date();
        }

        return {
          success: concepts.length > 0,
          insights,
          improvements,
          newKnowledge: { concepts },
          confidence: concepts.length > 0 ? concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length : 0,
          strategyUsed: 'conceptual-learning',
          timestamp: new Date()
        };
      }
    });

    // Performance Optimization Strategy
    this.strategies.set('performance-optimization', {
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Learn from performance metrics and optimize behavior',
      applicable: (context) => context.metrics && context.performance,
      execute: async (context, memory) => {
        const metrics = context.metrics;
        const insights = [];
        const improvements = [];
        let confidence = 0;

        // Analyze performance trends
        if (metrics.responseTime && metrics.responseTime.length > 1) {
          const trend = this.calculateTrend(metrics.responseTime);
          if (trend > 0.1) {
            insights.push('Response time increasing - optimization needed');
            improvements.push('Implement caching and optimization strategies');
            confidence += 0.3;
          }
        }

        if (metrics.successRate && metrics.successRate < 0.9) {
          insights.push('Success rate below optimal - error handling needed');
          improvements.push('Improve error handling and validation');
          confidence += 0.4;
        }

        if (metrics.resourceUsage && metrics.resourceUsage > 0.8) {
          insights.push('High resource usage - optimization opportunities');
          improvements.push('Optimize resource management and cleanup');
          confidence += 0.3;
        }

        return {
          success: improvements.length > 0,
          insights,
          improvements,
          newKnowledge: { performanceAnalysis: metrics },
          confidence: Math.min(confidence, 1.0),
          strategyUsed: 'performance-optimization',
          timestamp: new Date()
        };
      }
    });

    // Adaptive Strategy Selection
    this.strategies.set('adaptive-selection', {
      id: 'adaptive-selection',
      name: 'Adaptive Strategy Selection',
      description: 'Learn which strategies work best in different contexts',
      applicable: (context) => context.strategyResults && Object.keys(context.strategyResults).length > 0,
      execute: async (context, memory) => {
        const strategyResults = context.strategyResults;
        const insights = [];
        const improvements = [];

        // Find best performing strategies by context
        const contextType = context.type || 'general';
        const bestStrategies = this.analyzeStrategyPerformance(strategyResults, contextType);

        for (const [strategy, performance] of bestStrategies) {
          insights.push(`Strategy "${strategy}" performs best for ${contextType} contexts`);

          if (performance.confidence > 0.8) {
            improvements.push(`Prioritize ${strategy} for similar contexts`);
          }

          // Store strategy performance for future reference
          await memory.store('procedural', {
            strategy,
            context: contextType,
            performance,
            timestamp: new Date()
          }, { domain: 'strategy-learning', type: 'performance' }, performance.confidence);
        }

        return {
          success: bestStrategies.length > 0,
          insights,
          improvements,
          newKnowledge: { strategyPerformance: bestStrategies },
          confidence: bestStrategies.length > 0 ?
            bestStrategies.reduce((sum, [, perf]) => sum + perf.confidence, 0) / bestStrategies.length : 0,
          strategyUsed: 'adaptive-selection',
          timestamp: new Date()
        };
      }
    });

    this.logger.info('Learning strategies initialized', {
      count: this.strategies.size
    });
  }

  private initializeKnowledgeDomains(): void {
    const domains = [
      { id: 'programming', name: 'Programming' },
      { id: 'problem-solving', name: 'Problem Solving' },
      { id: 'communication', name: 'Communication' },
      { id: 'system-design', name: 'System Design' },
      { id: 'optimization', name: 'Optimization' }
    ];

    for (const domain of domains) {
      this.knowledgeDomains.set(domain.id, {
        ...domain,
        concepts: new Map(),
        relationships: new Map(),
        confidence: 0.5,
        lastUpdated: new Date()
      });
    }

    this.logger.info('Knowledge domains initialized', {
      count: domains.length
    });
  }

  public async learn(context: any): Promise<LearningResult> {
    this.metrics.totalLearningSessions++;

    this.logger.info('Starting learning session', {
      contextType: context.type,
      strategiesAvailable: this.strategies.size
    });

    // Select applicable strategies
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.applicable(context));

    if (applicableStrategies.length === 0) {
      this.logger.warn('No applicable learning strategies found');
      return {
        success: false,
        insights: ['No applicable learning strategies'],
        improvements: [],
        newKnowledge: null,
        confidence: 0,
        strategyUsed: 'none',
        timestamp: new Date()
      };
    }

    // Execute strategies and collect results
    const results: LearningResult[] = [];
    for (const strategy of applicableStrategies) {
      try {
        const result = await strategy.execute(context, this.memory);
        results.push(result);

        // Update strategy usage metrics
        this.metrics.strategiesUsed[strategy.id] =
          (this.metrics.strategiesUsed[strategy.id] || 0) + 1;

        this.logger.debug('Strategy executed', {
          strategy: strategy.id,
          success: result.success,
          confidence: result.confidence
        });

      } catch (error) {
        this.logger.error('Strategy execution failed', error, {
          strategy: strategy.id
        });
      }
    }

    // Aggregate results
    const aggregatedResult = this.aggregateLearningResults(results);

    // Update metrics
    if (aggregatedResult.success) {
      this.metrics.successfulLearning++;
      this.updateAverageConfidence(aggregatedResult.confidence);
    }

    // Store learning session
    await this.memory.store('episodic', {
      sessionType: 'learning',
      context,
      result: aggregatedResult,
      strategiesUsed: applicableStrategies.map(s => s.id)
    }, { domain: 'learning', type: 'session' }, aggregatedResult.confidence);

    // Emit learning event
    this.emit('learning:completed', aggregatedResult);

    this.logger.info('Learning session completed', {
      success: aggregatedResult.success,
      strategiesUsed: results.length,
      confidence: aggregatedResult.confidence
    });

    return aggregatedResult;
  }

  public async adapt(feedback: any): Promise<void> {
    this.logger.info('Starting adaptation process');

    // Analyze feedback
    const feedbackAnalysis = this.analyzeFeedback(feedback);

    // Adjust learning rate
    if (feedbackAnalysis.successRate > 0.8) {
      this.learningRate = Math.min(this.learningRate * 1.1, 1.0);
    } else if (feedbackAnalysis.successRate < 0.5) {
      this.learningRate = Math.max(this.learningRate * 0.9, 0.1);
    }

    // Update adaptation threshold
    if (feedbackAnalysis.confidence > this.adaptationThreshold) {
      this.adaptationThreshold = Math.min(
        this.adaptationThreshold + 0.1 * this.learningRate,
        1.0
      );
    }

    // Adapt strategies based on feedback
    await this.adaptStrategies(feedbackAnalysis);

    // Update knowledge domains
    await this.updateKnowledgeDomains(feedbackAnalysis);

    this.emit('adaptation:completed', {
      learningRate: this.learningRate,
      adaptationThreshold: this.adaptationThreshold,
      feedbackAnalysis
    });

    this.logger.info('Adaptation completed', {
      learningRate: this.learningRate,
      adaptationThreshold: this.adaptationThreshold
    });
  }

  public getKnowledgeDomain(domainId: string): KnowledgeDomain | null {
    return this.knowledgeDomains.get(domainId) || null;
  }

  public getAllKnowledgeDomains(): KnowledgeDomain[] {
    return Array.from(this.knowledgeDomains.values());
  }

  public getMetrics(): LearningMetrics {
    // Update real-time metrics
    this.metrics.knowledgeGrowth = this.calculateKnowledgeGrowth();
    this.metrics.adaptationRate = this.calculateAdaptationRate();

    return { ...this.metrics };
  }

  public async consolidateLearning(): Promise<void> {
    this.logger.info('Starting learning consolidation');

    // Consolidate knowledge domains
    await this.consolidateKnowledgeDomains();

    // Update strategy effectiveness
    await this.updateStrategyEffectiveness();

    // Optimize learning parameters
    await this.optimizeLearningParameters();

    this.logger.info('Learning consolidation completed');
  }

  private async identifyPatterns(data: any[]): Promise<any[]> {
    const patterns = [];

    // Simple pattern detection
    if (data.length >= 3) {
      // Check for sequences
      for (let i = 0; i < data.length - 2; i++) {
        const sequence = data.slice(i, i + 3);
        if (this.isRepeatingSequence(sequence)) {
          patterns.push({
            type: 'sequence',
            pattern: sequence,
            confidence: 0.8,
            description: `Repeating sequence detected`
          });
        }
      }

      // Check for anomalies
      const values = data.map(d => typeof d === 'number' ? d : 0);
      const outliers = this.detectOutliers(values);
      if (outliers.length > 0) {
        patterns.push({
          type: 'anomaly',
          pattern: outliers,
          confidence: 0.7,
          description: `Anomalies detected in data`
        });
      }
    }

    return patterns;
  }

  private extractConcepts(information: string): any[] {
    const concepts = [];

    // Simple concept extraction (in real implementation, use NLP)
    const words = information.toLowerCase().split(/\s+/);
    const conceptWords = words.filter(word =>
      word.length > 4 && !['the', 'and', 'for', 'are', 'with', 'that', 'this'].includes(word)
    );

    const uniqueConcepts = [...new Set(conceptWords)];

    for (const concept of uniqueConcepts.slice(0, 5)) { // Limit to 5 concepts
      concepts.push({
        name: concept,
        domain: 'general',
        definition: `Concept extracted from: ${information.substring(0, 100)}...`,
        examples: [concept],
        confidence: 0.6
      });
    }

    return concepts;
  }

  private getOrCreateDomain(domainId: string): KnowledgeDomain {
    let domain = this.knowledgeDomains.get(domainId);
    if (!domain) {
      domain = {
        id: domainId,
        name: domainId,
        concepts: new Map(),
        relationships: new Map(),
        confidence: 0.5,
        lastUpdated: new Date()
      };
      this.knowledgeDomains.set(domainId, domain);
    }
    return domain;
  }

  private findRelatedConcepts(concept: any, domain: KnowledgeDomain): any[] {
    const related = [];
    const conceptWords = concept.name.toLowerCase().split(/\s+/);

    for (const [existingName, existingConcept] of domain.concepts.entries()) {
      const existingWords = existingName.toLowerCase().split(/\s+/);
      const commonWords = conceptWords.filter(word => existingWords.includes(word));

      if (commonWords.length > 0) {
        related.push({
          name: existingName,
          confidence: commonWords.length / Math.max(conceptWords.length, existingWords.length)
        });
      }
    }

    return related.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sum = 0;
    for (let i = 1; i < values.length; i++) {
      sum += values[i] - values[i - 1];
    }
    return sum / (values.length - 1);
  }

  private analyzeStrategyPerformance(
    strategyResults: Record<string, any>,
    contextType: string
  ): Array<[string, { success: number; confidence: number }]> {
    const performances: Array<[string, { success: number; confidence: number }]> = [];

    for (const [strategy, results] of Object.entries(strategyResults)) {
      const success = results.success ? 1 : 0;
      const confidence = results.confidence || 0;
      performances.push([strategy, { success, confidence }]);
    }

    return performances.sort((a, b) => {
      const scoreA = a[1].success * a[1].confidence;
      const scoreB = b[1].success * b[1].confidence;
      return scoreB - scoreA;
    });
  }

  private aggregateLearningResults(results: LearningResult[]): LearningResult {
    if (results.length === 0) {
      return {
        success: false,
        insights: [],
        improvements: [],
        newKnowledge: null,
        confidence: 0,
        strategyUsed: 'none',
        timestamp: new Date()
      };
    }

    const allInsights = results.flatMap(r => r.insights);
    const allImprovements = results.flatMap(r => r.improvements);
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const overallSuccess = results.some(r => r.success);

    return {
      success: overallSuccess,
      insights: [...new Set(allInsights)], // Remove duplicates
      improvements: [...new Set(allImprovements)], // Remove duplicates
      newKnowledge: {
        strategies: results.map(r => r.strategyUsed),
        individualResults: results
      },
      confidence: avgConfidence,
      strategyUsed: `multi-strategy-${results.length}`,
      timestamp: new Date()
    };
  }

  private analyzeFeedback(feedback: any): any {
    return {
      successRate: feedback.successRate || 0.5,
      confidence: feedback.confidence || 0.5,
      errors: feedback.errors || [],
      suggestions: feedback.suggestions || []
    };
  }

  private async adaptStrategies(feedbackAnalysis: any): Promise<void> {
    // Strategy adaptation logic
    for (const [strategyId, strategy] of this.strategies.entries()) {
      // This would implement strategy-specific adaptation
      // For now, just log that adaptation would happen
      this.logger.debug('Strategy adaptation considered', { strategyId });
    }
  }

  private async updateKnowledgeDomains(feedbackAnalysis: any): Promise<void> {
    // Update domain confidences based on feedback
    for (const domain of this.knowledgeDomains.values()) {
      if (feedbackAnalysis.confidence > this.adaptationThreshold) {
        domain.confidence = Math.min(domain.confidence + 0.1, 1.0);
        domain.lastUpdated = new Date();
      }
    }
  }

  private updateAverageConfidence(newConfidence: number): void {
    const totalSessions = this.metrics.totalLearningSessions;
    const currentAvg = this.metrics.averageConfidence;

    this.metrics.averageConfidence =
      (currentAvg * (totalSessions - 1) + newConfidence) / totalSessions;
  }

  private calculateKnowledgeGrowth(): number {
    let totalConcepts = 0;
    for (const domain of this.knowledgeDomains.values()) {
      totalConcepts += domain.concepts.size;
    }
    return totalConcepts;
  }

  private calculateAdaptationRate(): number {
    return this.metrics.successfulLearning / Math.max(this.metrics.totalLearningSessions, 1);
  }

  private isRepeatingSequence(sequence: any[]): boolean {
    if (sequence.length < 3) return false;
    return sequence[0] === sequence[1] && sequence[1] === sequence[2];
  }

  private detectOutliers(values: number[]): number[] {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    return values.filter(val => Math.abs(val - mean) > 2 * stdDev);
  }

  private async consolidateKnowledgeDomains(): Promise<void> {
    // Find related concepts across domains
    for (const [domainId, domain] of this.knowledgeDomains.entries()) {
      const concepts = Array.from(domain.concepts.keys());

      // Look for similar concepts in other domains
      for (const [otherDomainId, otherDomain] of this.knowledgeDomains.entries()) {
        if (domainId === otherDomainId) continue;

        for (const concept of concepts) {
          const related = this.findRelatedConcepts(
            { name: concept },
            otherDomain
          );

          if (related.length > 0) {
            // Create cross-domain relationships
            if (!domain.relationships.has(concept)) {
              domain.relationships.set(concept, []);
            }

            related.forEach(rel => {
              if (!domain.relationships.get(concept)!.includes(rel.name)) {
                domain.relationships.get(concept)!.push(rel.name);
              }
            });
          }
        }
      }

      domain.lastUpdated = new Date();
    }
  }

  private async updateStrategyEffectiveness(): Promise<void> {
    // Update strategy effectiveness based on historical performance
    for (const [strategyId, strategy] of this.strategies.entries()) {
      const usageCount = this.metrics.strategiesUsed[strategyId] || 0;

      if (usageCount > 0) {
        // In a real implementation, calculate actual effectiveness
        this.logger.debug('Strategy effectiveness updated', {
          strategy: strategyId,
          usageCount
        });
      }
    }
  }

  private async optimizeLearningParameters(): Promise<void> {
    // Optimize learning parameters based on performance
    if (this.metrics.averageConfidence < 0.5) {
      this.learningRate = Math.min(this.learningRate * 1.1, 1.0);
    } else if (this.metrics.averageConfidence > 0.9) {
      this.learningRate = Math.max(this.learningRate * 0.9, 0.1);
    }

    this.logger.debug('Learning parameters optimized', {
      learningRate: this.learningRate,
      averageConfidence: this.metrics.averageConfidence
    });
  }
}