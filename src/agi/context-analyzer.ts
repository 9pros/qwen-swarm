/**
 * AGI Context Analyzer - Advanced context understanding and analysis
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from '../utils/logger';
import { AGIMemoryManager, MemoryEntry } from './memory-manager';

export interface ContextAnalysis {
  intent: string;
  entities: Entity[];
  sentiment: number; // -1 to 1
  complexity: number; // 0 to 1
  domain: string;
  confidence: number;
  suggestions: string[];
  relatedContexts: string[];
}

export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'technology' | 'concept' | 'task' | 'file' | 'code';
  confidence: number;
  position: { start: number; end: number };
  properties?: Record<string, any>;
}

export interface ContextState {
  sessionId: string;
  conversationHistory: ConversationEntry[];
  currentTopic: string;
  activeTasks: string[];
  userPreferences: Record<string, any>;
  environmentContext: Record<string, any>;
  temporalContext: {
    currentTime: Date;
    sessionDuration: number;
    lastInteraction: Date;
  };
}

export interface ConversationEntry {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  analysis?: ContextAnalysis;
  metadata: Record<string, any>;
}

export interface DomainKnowledge {
  name: string;
  concepts: string[];
  patterns: string[];
  typicalTasks: string[];
  relatedDomains: string[];
  confidenceThreshold: number;
}

export class AGIContextAnalyzer extends EventEmitter {
  private logger: Logger;
  private memory: AGIMemoryManager;
  private contextState: ContextState;
  private domainKnowledge: Map<string, DomainKnowledge>;
  private entityPatterns: Map<string, RegExp[]>;
  private contextHistory: Map<string, ContextAnalysis[]>;

  constructor(memory?: AGIMemoryManager) {
    super();
    this.logger = new Logger().withContext({ component: 'AGIContextAnalyzer' });
    this.memory = memory || new AGIMemoryManager();

    this.contextState = {
      sessionId: this.generateSessionId(),
      conversationHistory: [],
      currentTopic: 'general',
      activeTasks: [],
      userPreferences: {},
      environmentContext: {},
      temporalContext: {
        currentTime: new Date(),
        sessionDuration: 0,
        lastInteraction: new Date()
      }
    };

    this.domainKnowledge = new Map();
    this.entityPatterns = new Map();
    this.contextHistory = new Map();

    this.initializeDomainKnowledge();
    this.initializeEntityPatterns();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDomainKnowledge(): void {
    // Programming domain
    this.domainKnowledge.set('programming', {
      name: 'Programming',
      concepts: [
        'function', 'class', 'variable', 'algorithm', 'data structure',
        'api', 'framework', 'library', 'database', 'deployment',
        'testing', 'debugging', 'optimization', 'refactoring'
      ],
      patterns: [
        'create.*function', 'implement.*class', 'fix.*bug', 'optimize.*code',
        'write.*test', 'deploy.*application', 'debug.*issue'
      ],
      typicalTasks: [
        'code generation', 'debugging', 'optimization', 'refactoring',
        'testing', 'documentation', 'architecture design'
      ],
      relatedDomains: ['system-design', 'optimization', 'testing'],
      confidenceThreshold: 0.7
    });

    // System design domain
    this.domainKnowledge.set('system-design', {
      name: 'System Design',
      concepts: [
        'architecture', 'scalability', 'performance', 'security',
        'microservices', 'api', 'database', 'caching', 'load balancing'
      ],
      patterns: [
        'design.*system', 'architecture.*pattern', 'scalable.*solution',
        'performance.*optimization', 'security.*implementation'
      ],
      typicalTasks: [
        'system architecture', 'performance analysis', 'security review',
        'scalability planning', 'technology selection'
      ],
      relatedDomains: ['programming', 'optimization', 'security'],
      confidenceThreshold: 0.7
    });

    // Problem solving domain
    this.domainKnowledge.set('problem-solving', {
      name: 'Problem Solving',
      concepts: [
        'analysis', 'solution', 'strategy', 'approach', 'methodology',
        'troubleshooting', 'investigation', 'research', 'evaluation'
      ],
      patterns: [
        'solve.*problem', 'analyze.*issue', 'find.*solution',
        'investigate.*error', 'troubleshoot.*problem'
      ],
      typicalTasks: [
        'root cause analysis', 'solution design', 'troubleshooting',
        'problem decomposition', 'strategy formulation'
      ],
      relatedDomains: ['programming', 'system-design', 'optimization'],
      confidenceThreshold: 0.6
    });

    // Communication domain
    this.domainKnowledge.set('communication', {
      name: 'Communication',
      concepts: [
        'explain', 'describe', 'summarize', 'clarify', 'document',
        'presentation', 'collaboration', 'coordination', 'feedback'
      ],
      patterns: [
        'explain.*concept', 'describe.*process', 'summarize.*findings',
        'provide.*feedback', 'document.*code'
      ],
      typicalTasks: [
        'explanation', 'documentation', 'code review',
        'knowledge sharing', 'clarification'
      ],
      relatedDomains: ['programming', 'problem-solving'],
      confidenceThreshold: 0.6
    });

    // Learning domain
    this.domainKnowledge.set('learning', {
      name: 'Learning',
      concepts: [
        'learn', 'understand', 'study', 'research', 'explore',
        'practice', 'master', 'improve', 'develop'
      ],
      patterns: [
        'learn.*skill', 'understand.*concept', 'study.*topic',
        'practice.*technique', 'improve.*ability'
      ],
      typicalTasks: [
        'knowledge acquisition', 'skill development', 'concept understanding',
        'best practice learning', 'pattern recognition'
      ],
      relatedDomains: ['programming', 'problem-solving', 'communication'],
      confidenceThreshold: 0.5
    });

    this.logger.info('Domain knowledge initialized', {
      domains: this.domainKnowledge.size
    });
  }

  private initializeEntityPatterns(): void {
    // File and code patterns
    this.entityPatterns.set('file', [
      /\.([a-zA-Z0-9]+)$/, // File extensions
      /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/, // File names
      /(src|lib|app|test|config|docs)/, // Common directories
    ]);

    // Code patterns
    this.entityPatterns.set('code', [
      /function\s+\w+/, /class\s+\w+/, /const\s+\w+/, /let\s+\w+/,
      /import.*from/, /export\s+(default\s+)?/,
      /\w+\(\)/, // Function calls
      /{[\s\S]*}/, // Code blocks
    ]);

    // Technology patterns
    this.entityPatterns.set('technology', [
      /(react|vue|angular|nodejs|express|mongodb|postgresql|mysql|redis|docker|k8s|aws|azure|gcp)/gi,
      /(javascript|typescript|python|java|go|rust|php|ruby|swift|kotlin)/gi,
      /(rest|graphql|grpc|websocket|http|https|tcp|udp)/gi,
    ]);

    // Task patterns
    this.entityPatterns.set('task', [
      /(create|build|implement|develop|write|code|program)/gi,
      /(fix|debug|resolve|solve|troubleshoot)/gi,
      /(optimize|improve|enhance|refactor)/gi,
      /(test|validate|verify|check)/gi,
      /(deploy|release|publish|launch)/gi,
    ]);

    // Concept patterns
    this.entityPatterns.set('concept', [
      /(algorithm|pattern|architecture|design|strategy|methodology)/gi,
      /(performance|scalability|security|reliability|maintainability)/gi,
      /(api|database|cache|queue|service|microservice)/gi,
    ]);

    this.logger.debug('Entity patterns initialized');
  }

  public async analyzeInput(input: string, context?: any): Promise<ContextAnalysis> {
    this.logger.debug('Analyzing input context', {
      inputLength: input.length,
      hasContext: !!context
    });

    const analysis: ContextAnalysis = {
      intent: await this.extractIntent(input),
      entities: await this.extractEntities(input),
      sentiment: this.analyzeSentiment(input),
      complexity: this.calculateComplexity(input),
      domain: await this.identifyDomain(input),
      confidence: 0.5, // Will be updated
      suggestions: [],
      relatedContexts: []
    };

    // Calculate overall confidence
    analysis.confidence = this.calculateConfidence(analysis);

    // Generate suggestions based on analysis
    analysis.suggestions = await this.generateSuggestions(analysis, context);

    // Find related contexts from memory
    if (this.memory) {
      analysis.relatedContexts = await this.findRelatedContexts(analysis);
    }

    // Update context state
    await this.updateContextState(input, analysis);

    // Store analysis in history
    this.storeAnalysisInHistory(analysis);

    // Emit analysis event
    this.emit('context:analyzed', { input, analysis, context });

    this.logger.debug('Input analysis completed', {
      intent: analysis.intent,
      domain: analysis.domain,
      confidence: analysis.confidence,
      entityCount: analysis.entities.length
    });

    return analysis;
  }

  public async analyzeConversation(
    conversation: ConversationEntry[]
  ): Promise<ContextAnalysis> {
    this.logger.info('Analyzing conversation context', {
      entryCount: conversation.length
    });

    // Combine all content for analysis
    const combinedContent = conversation
      .map(entry => entry.content)
      .join(' ');

    // Analyze as a whole
    const overallAnalysis = await this.analyzeInput(combinedContent);

    // Analyze conversation patterns
    const conversationPatterns = await this.analyzeConversationPatterns(conversation);

    // Update analysis with conversation-specific insights
    overallAnalysis.intent = this.dominantIntent(conversation.map(e => e.analysis?.intent || ''));
    overallAnalysis.suggestions.push(...conversationPatterns.suggestions);

    // Track topic changes
    const topicChanges = this.detectTopicChanges(conversation);
    if (topicChanges.length > 0) {
      overallAnalysis.suggestions.push(`Topic changed ${topicChanges.length} times during conversation`);
    }

    return overallAnalysis;
  }

  public getContextState(): ContextState {
    return { ...this.contextState };
  }

  public updateContext(updates: Partial<ContextState>): void {
    this.contextState = { ...this.contextState, ...updates };
    this.emit('context:updated', this.contextState);
  }

  public async predictNextContext(): Promise<ContextAnalysis> {
    if (this.contextState.conversationHistory.length < 2) {
      return {
        intent: 'unknown',
        entities: [],
        sentiment: 0,
        complexity: 0.5,
        domain: 'general',
        confidence: 0.3,
        suggestions: ['Continue the conversation to provide better predictions'],
        relatedContexts: []
      };
    }

    const recentEntries = this.contextState.conversationHistory.slice(-5);
    const recentAnalysis = await this.analyzeConversation(recentEntries);

    // Predict likely next context based on patterns
    const predictions = await this.generateContextPredictions(recentAnalysis);

    return {
      ...recentAnalysis,
      intent: predictions.intent || recentAnalysis.intent,
      suggestions: predictions.suggestions || recentAnalysis.suggestions,
      confidence: Math.max(recentAnalysis.confidence * 0.8, 0.3) // Reduce confidence for predictions
    };
  }

  private async extractIntent(input: string): Promise<string> {
    const normalizedInput = input.toLowerCase().trim();

    // Intent patterns
    const intentPatterns = [
      { pattern: /(create|build|make|generate|write|implement|develop)/, intent: 'create' },
      { pattern: /(fix|debug|solve|resolve|repair|correct)/, intent: 'fix' },
      { pattern: /(explain|describe|show|tell me|what is|how to)/, intent: 'explain' },
      { pattern: /(analyze|review|examine|check|validate)/, intent: 'analyze' },
      { pattern: /(optimize|improve|enhance|refactor|better)/, intent: 'optimize' },
      { pattern: /(test|verify|validate|check)/, intent: 'test' },
      { pattern: /(deploy|release|publish|launch)/, intent: 'deploy' },
      { pattern: /(learn|understand|study|teach)/, intent: 'learn' },
      { pattern: /(help|assist|guide|support)/, intent: 'help' },
      { pattern: /(search|find|look for|locate)/, intent: 'search' }
    ];

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(normalizedInput)) {
        return intent;
      }
    }

    // Check for question patterns
    if (normalizedInput.includes('?') || normalizedInput.startsWith('what') ||
        normalizedInput.startsWith('how') || normalizedInput.startsWith('why') ||
        normalizedInput.startsWith('when') || normalizedInput.startsWith('where')) {
      return 'question';
    }

    // Check for command patterns
    if (normalizedInput.startsWith('can you') || normalizedInput.startsWith('please') ||
        normalizedInput.match(/^(run|execute|start|stop|restart|list|show)/)) {
      return 'command';
    }

    return 'general';
  }

  private async extractEntities(input: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    const entityTypes: Array<Entity['type']> = ['file', 'code', 'technology', 'task', 'concept'];

    for (const type of entityTypes) {
      const patterns = this.entityPatterns.get(type) || [];

      for (const pattern of patterns) {
        const matches = input.matchAll(new RegExp(pattern, 'gi'));

        for (const match of matches) {
          if (match.index !== undefined) {
            const entity: Entity = {
              text: match[0],
              type,
              confidence: 0.7,
              position: {
                start: match.index,
                end: match.index + match[0].length
              }
            };

            // Extract additional properties for certain entity types
            if (type === 'technology') {
              entity.properties = {
                category: this.categorizeTechnology(entity.text)
              };
            }

            entities.push(entity);
          }
        }
      }
    }

    // Remove duplicates and sort by position
    const uniqueEntities = entities.filter((entity, index, self) =>
      index === self.findIndex(e => e.text === entity.text && e.position.start === entity.position.start)
    );

    return uniqueEntities.sort((a, b) => a.position.start - b.position.start);
  }

  private analyzeSentiment(input: string): number {
    // Simple sentiment analysis (in real implementation, use NLP library)
    const positiveWords = [
      'good', 'great', 'excellent', 'awesome', 'fantastic', 'wonderful',
      'perfect', 'amazing', 'love', 'like', 'helpful', 'useful'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike',
      'useless', 'broken', 'error', 'fail', 'problem', 'issue'
    ];

    const words = input.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
      }
      if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return 0; // Neutral
    }

    return (positiveCount - negativeCount) / totalSentimentWords;
  }

  private calculateComplexity(input: string): number {
    let complexity = 0.3; // Base complexity

    // Length factor
    if (input.length > 100) complexity += 0.1;
    if (input.length > 500) complexity += 0.1;
    if (input.length > 1000) complexity += 0.1;

    // Sentence complexity
    const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    if (avgSentenceLength > 20) complexity += 0.1;

    // Technical terms
    const technicalTerms = [
      'algorithm', 'architecture', 'implementation', 'optimization',
      'asynchronous', 'synchronous', 'concurrent', 'parallel'
    ];
    const technicalCount = technicalTerms.filter(term =>
      input.toLowerCase().includes(term)
    ).length;
    complexity += Math.min(technicalCount * 0.05, 0.2);

    // Question complexity
    const questionWords = input.toLowerCase().split(/\s+/).filter(word =>
      word.includes('how') || word.includes('why') || word.includes('what')
    ).length;
    complexity += Math.min(questionWords * 0.03, 0.1);

    return Math.min(complexity, 1.0);
  }

  private async identifyDomain(input: string): Promise<string> {
    const normalizedInput = input.toLowerCase();
    const domainScores: Record<string, number> = {};

    for (const [domainId, domain] of this.domainKnowledge.entries()) {
      let score = 0;

      // Check for domain concepts
      for (const concept of domain.concepts) {
        if (normalizedInput.includes(concept)) {
          score += 1;
        }
      }

      // Check for domain patterns
      for (const pattern of domain.patterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(normalizedInput)) {
          score += 2;
        }
      }

      // Normalize score
      domainScores[domainId] = score / domain.concepts.length;
    }

    // Find the domain with the highest score
    let bestDomain = 'general';
    let bestScore = 0;

    for (const [domainId, score] of Object.entries(domainScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domainId;
      }
    }

    // Check if best score meets confidence threshold
    const domain = this.domainKnowledge.get(bestDomain);
    if (domain && bestScore < domain.confidenceThreshold) {
      return 'general';
    }

    return bestDomain;
  }

  private calculateConfidence(analysis: ContextAnalysis): number {
    let confidence = 0.5;

    // Entity detection confidence
    if (analysis.entities.length > 0) {
      const avgEntityConfidence = analysis.entities.reduce((sum, e) => sum + e.confidence, 0) / analysis.entities.length;
      confidence += avgEntityConfidence * 0.2;
    }

    // Intent detection confidence (simplified)
    if (analysis.intent !== 'general') {
      confidence += 0.2;
    }

    // Domain detection confidence
    if (analysis.domain !== 'general') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private async generateSuggestions(analysis: ContextAnalysis, context?: any): Promise<string[]> {
    const suggestions: string[] = [];

    // Intent-based suggestions
    switch (analysis.intent) {
      case 'create':
        suggestions.push('Consider the requirements and design before implementation');
        suggestions.push('Think about scalability and maintainability');
        break;
      case 'fix':
        suggestions.push('Identify the root cause before applying fixes');
        suggestions.push('Consider writing tests to prevent regressions');
        break;
      case 'explain':
        suggestions.push('Provide clear examples and use cases');
        suggestions.push('Consider the audience\'s knowledge level');
        break;
      case 'optimize':
        suggestions.push('Profile before optimizing to identify bottlenecks');
        suggestions.push('Consider trade-offs between performance and readability');
        break;
    }

    // Domain-based suggestions
    const domain = this.domainKnowledge.get(analysis.domain);
    if (domain) {
      suggestions.push(`Consider ${domain.relatedDomains.join(', ')} related aspects`);
    }

    // Entity-based suggestions
    if (analysis.entities.some(e => e.type === 'file')) {
      suggestions.push('Review file structure and organization');
    }

    if (analysis.entities.some(e => e.type === 'technology')) {
      suggestions.push('Consider best practices for the technologies involved');
    }

    // Complexity-based suggestions
    if (analysis.complexity > 0.7) {
      suggestions.push('Consider breaking down into smaller, manageable tasks');
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private async findRelatedContexts(analysis: ContextAnalysis): Promise<string[]> {
    if (!this.memory) {
      return [];
    }

    // Search for related memories
    const searchTerms = [
      analysis.intent,
      analysis.domain,
      ...analysis.entities.map(e => e.text)
    ].filter(Boolean);

    const relatedContexts: string[] = [];

    for (const term of searchTerms) {
      const memories = await this.memory.recall({
        content: term,
        limit: 2
      });

      for (const memory of memories.slice(0, 2)) {
        relatedContexts.push(`Related: ${JSON.stringify(memory.content).substring(0, 100)}...`);
      }
    }

    return [...new Set(relatedContexts)]; // Remove duplicates
  }

  private async updateContextState(input: string, analysis: ContextAnalysis): Promise<void> {
    // Update temporal context
    this.contextState.temporalContext.currentTime = new Date();
    this.contextState.temporalContext.lastInteraction = new Date();
    this.contextState.temporalContext.sessionDuration =
      this.contextState.temporalContext.currentTime.getTime() -
      this.contextState.conversationHistory[0]?.timestamp?.getTime() || 0;

    // Add to conversation history
    const entry: ConversationEntry = {
      id: this.generateEntryId(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      analysis,
      metadata: {}
    };

    this.contextState.conversationHistory.push(entry);

    // Update current topic if changed
    if (analysis.domain !== this.contextState.currentTopic) {
      this.contextState.currentTopic = analysis.domain;
    }

    // Extract active tasks
    const taskEntities = analysis.entities.filter(e => e.type === 'task');
    if (taskEntities.length > 0) {
      this.contextState.activeTasks = [
        ...this.contextState.activeTasks,
        ...taskEntities.map(e => e.text)
      ];
    }

    // Emit context update event
    this.emit('context:updated', this.contextState);
  }

  private storeAnalysisInHistory(analysis: ContextAnalysis): void {
    const history = this.contextHistory.get(analysis.domain) || [];
    history.push(analysis);

    // Keep only last 50 analyses per domain
    if (history.length > 50) {
      history.shift();
    }

    this.contextHistory.set(analysis.domain, history);
  }

  private generateEntryId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeTechnology(technology: string): string {
    const categories: Record<string, string[]> = {
      'frontend': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css'],
      'backend': ['nodejs', 'express', 'django', 'flask', 'spring', 'rails'],
      'database': ['mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'],
      'cloud': ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
      'mobile': ['react-native', 'flutter', 'swift', 'kotlin']
    };

    const tech = technology.toLowerCase();
    for (const [category, technologies] of Object.entries(categories)) {
      if (technologies.some(t => tech.includes(t))) {
        return category;
      }
    }

    return 'other';
  }

  private async analyzeConversationPatterns(conversation: ConversationEntry[]): Promise<{
    suggestions: string[];
    patterns: string[];
  }> {
    const suggestions: string[] = [];
    const patterns: string[] = [];

    // Analyze conversation flow
    const intents = conversation.map(e => e.analysis?.intent).filter(Boolean) as string[];
    const intentFrequency: Record<string, number> = {};

    for (const intent of intents) {
      intentFrequency[intent] = (intentFrequency[intent] || 0) + 1;
    }

    // Identify dominant patterns
    const dominantIntents = Object.entries(intentFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([intent]) => intent);

    if (dominantIntents.length > 0) {
      patterns.push(`Primary intent pattern: ${dominantIntents.join(', ')}`);
      suggestions.push(`Focus on ${dominantIntents[0]}-related tasks`);
    }

    // Check for stuck patterns
    if (conversation.length > 5) {
      const recentIntents = intents.slice(-5);
      const uniqueRecentIntents = [...new Set(recentIntents)];

      if (uniqueRecentIntents.length === 1) {
        suggestions.push('Consider changing approach or asking for clarification');
        patterns.push('Repetitive intent pattern detected');
      }
    }

    return { suggestions, patterns };
  }

  private dominantIntent(intents: string[]): string {
    const intentCount: Record<string, number> = {};

    for (const intent of intents) {
      if (intent) {
        intentCount[intent] = (intentCount[intent] || 0) + 1;
      }
    }

    let maxCount = 0;
    let dominantIntent = 'general';

    for (const [intent, count] of Object.entries(intentCount)) {
      if (count > maxCount) {
        maxCount = count;
        dominantIntent = intent;
      }
    }

    return dominantIntent;
  }

  private detectTopicChanges(conversation: ConversationEntry[]): number {
    if (conversation.length < 2) {
      return 0;
    }

    let topicChanges = 0;
    let lastTopic = conversation[0].analysis?.domain || 'general';

    for (let i = 1; i < conversation.length; i++) {
      const currentTopic = conversation[i].analysis?.domain || 'general';
      if (currentTopic !== lastTopic) {
        topicChanges++;
        lastTopic = currentTopic;
      }
    }

    return topicChanges;
  }

  private async generateContextPredictions(analysis: ContextAnalysis): Promise<{
    intent?: string;
    suggestions?: string[];
  }> {
    const predictions: { intent?: string; suggestions?: string[] } = {};

    // Predict next intent based on conversation history
    const recentEntries = this.contextState.conversationHistory.slice(-3);
    const recentIntents = recentEntries.map(e => e.analysis?.intent).filter(Boolean) as string[];

    if (recentIntents.length > 0) {
      const intentSequence = recentIntents.join(' -> ');

      // Simple pattern-based prediction
      if (intentSequence.includes('create') && !intentSequence.includes('deploy')) {
        predictions.intent = 'deploy';
        predictions.suggestions = ['Consider deployment strategy', 'Plan testing before deployment'];
      } else if (intentSequence.includes('fix') && !intentSequence.includes('test')) {
        predictions.intent = 'test';
        predictions.suggestions = ['Write tests to verify the fix', 'Consider edge cases'];
      } else if (intentSequence.includes('analyze') && !intentSequence.includes('optimize')) {
        predictions.intent = 'optimize';
        predictions.suggestions = ['Look for optimization opportunities', 'Consider performance improvements'];
      }
    }

    return predictions;
  }
}