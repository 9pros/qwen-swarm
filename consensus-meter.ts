/**
 * Advanced Consensus Meter for 10-Agent Agreement Visualization
 * Shows real-time consensus levels, voting patterns, and decision-making analytics
 */

import { Agent, AgentStatus } from './swarm-activity-display';

export interface Vote {
  agentId: string;
  choice: 'agree' | 'disagree' | 'abstain';
  confidence: number;
  timestamp: Date;
  reason?: string;
}

export interface Decision {
  id: string;
  topic: string;
  description: string;
  votes: Vote[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'passed' | 'failed' | 'timeout';
  consensusThreshold: number; // percentage required to pass
  minParticipants: number;
}

export interface ConsensusMetrics {
  currentConsensusLevel: number;
  totalDecisions: number;
  passedDecisions: number;
  failedDecisions: number;
  averageDecisionTime: number;
  participationRate: number;
  agreementRate: number;
  votingActivity: Vote[];
}

export interface ConsensusPattern {
  type: 'unanimous' | 'majority' | 'polarized' | 'low-participation';
  description: string;
  strength: number;
  trend: 'improving' | 'declining' | 'stable';
}

export class ConsensusMeter {
  private decisions: Map<string, Decision> = new Map();
  private votingHistory: Vote[] = [];
  private consensusHistory: Array<{ timestamp: number; level: number }> = [];
  private maxHistorySize = 100;
  private defaultThreshold = 70; // 70% consensus required
  private defaultMinParticipants = 6; // At least 6 of 10 agents must participate

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.updateConsensusHistory();
      this.cleanupOldDecisions();
    }, 1000);
  }

  public startDecision(
    topic: string,
    description: string,
    consensusThreshold: number = this.defaultThreshold,
    minParticipants: number = this.defaultMinParticipants
  ): string {
    const decisionId = `decision_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const decision: Decision = {
      id: decisionId,
      topic,
      description,
      votes: [],
      startTime: new Date(),
      status: 'active',
      consensusThreshold,
      minParticipants
    };

    this.decisions.set(decisionId, decision);
    return decisionId;
  }

  public castVote(
    decisionId: string,
    agentId: string,
    choice: Vote['choice'],
    confidence: number,
    reason?: string
  ): boolean {
    const decision = this.decisions.get(decisionId);
    if (!decision || decision.status !== 'active') {
      return false;
    }

    // Check if agent already voted
    const existingVoteIndex = decision.votes.findIndex(v => v.agentId === agentId);
    const vote: Vote = {
      agentId,
      choice,
      confidence: Math.max(0, Math.min(100, confidence)),
      timestamp: new Date(),
      reason
    };

    if (existingVoteIndex >= 0) {
      // Update existing vote
      decision.votes[existingVoteIndex] = vote;
    } else {
      // Add new vote
      decision.votes.push(vote);
    }

    // Add to voting history
    this.votingHistory.push(vote);

    // Check if decision should conclude
    this.checkDecisionCompletion(decisionId);

    return true;
  }

  private checkDecisionCompletion(decisionId: string): void {
    const decision = this.decisions.get(decisionId);
    if (!decision || decision.status !== 'active') return;

    const totalVotes = decision.votes.length;
    const agreeVotes = decision.votes.filter(v => v.choice === 'agree').length;
    const consensusLevel = totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;

    // Check if minimum participation reached
    if (totalVotes >= decision.minParticipants) {
      // Check consensus threshold
      if (consensusLevel >= decision.consensusThreshold) {
        decision.status = 'passed';
        decision.endTime = new Date();
      } else if (totalVotes >= 10) { // All agents have voted
        decision.status = 'failed';
        decision.endTime = new Date();
      }
    }

    // Check timeout (30 seconds)
    const elapsed = Date.now() - decision.startTime.getTime();
    if (elapsed > 30000 && totalVotes >= decision.minParticipants) {
      decision.status = consensusLevel >= decision.consensusThreshold ? 'passed' : 'failed';
      decision.endTime = new Date();
    }
  }

  private updateConsensusHistory(): void {
    const currentMetrics = this.calculateConsensusMetrics();
    this.consensusHistory.push({
      timestamp: Date.now(),
      level: currentMetrics.currentConsensusLevel
    });

    // Keep only recent history (last 100 points)
    if (this.consensusHistory.length > this.maxHistorySize) {
      this.consensusHistory = this.consensusHistory.slice(-this.maxHistorySize);
    }
  }

  private cleanupOldDecisions(): void {
    const cutoffTime = Date.now() - 300000; // Keep last 5 minutes

    for (const [id, decision] of this.decisions) {
      const decisionTime = decision.endTime?.getTime() || decision.startTime.getTime();
      if (decisionTime < cutoffTime) {
        this.decisions.delete(id);
      }
    }

    // Clean up voting history
    this.votingHistory = this.votingHistory.filter(
      vote => vote.timestamp.getTime() > cutoffTime
    );
  }

  public calculateConsensusMetrics(): ConsensusMetrics {
    const activeDecision = Array.from(this.decisions.values())
      .find(d => d.status === 'active');

    let currentConsensusLevel = 0;
    let votingActivity: Vote[] = [];

    if (activeDecision) {
      const agreeVotes = activeDecision.votes.filter(v => v.choice === 'agree').length;
      const totalVotes = activeDecision.votes.length;
      currentConsensusLevel = totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;
      votingActivity = activeDecision.votes;
    }

    const totalDecisions = this.decisions.size;
    const passedDecisions = Array.from(this.decisions.values())
      .filter(d => d.status === 'passed').length;
    const failedDecisions = Array.from(this.decisions.values())
      .filter(d => d.status === 'failed').length;

    // Calculate average decision time
    const completedDecisions = Array.from(this.decisions.values())
      .filter(d => d.endTime);
    const averageDecisionTime = completedDecisions.length > 0 ?
      completedDecisions.reduce((sum, d) => sum + (d.endTime!.getTime() - d.startTime.getTime()), 0) /
      completedDecisions.length : 0;

    // Calculate participation rate (last minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentVotes = this.votingHistory.filter(v => v.timestamp.getTime() > oneMinuteAgo);
    const participationRate = this.votingHistory.length > 0 ?
      (recentVotes.length / Math.min(this.votingHistory.length, 10)) * 100 : 0;

    // Calculate agreement rate
    const agreementRate = totalDecisions > 0 ? (passedDecisions / totalDecisions) * 100 : 0;

    return {
      currentConsensusLevel,
      totalDecisions,
      passedDecisions,
      failedDecisions,
      averageDecisionTime,
      participationRate,
      agreementRate,
      votingActivity
    };
  }

  public analyzeConsensusPattern(): ConsensusPattern {
    const recentHistory = this.consensusHistory.slice(-20); // Last 20 data points
    if (recentHistory.length < 5) {
      return {
        type: 'low-participation',
        description: 'Insufficient data for pattern analysis',
        strength: 0,
        trend: 'stable'
      };
    }

    const avgConsensus = recentHistory.reduce((sum, h) => sum + h.level, 0) / recentHistory.length;
    const variance = recentHistory.reduce((sum, h) => sum + Math.pow(h.level - avgConsensus, 2), 0) / recentHistory.length;
    const standardDeviation = Math.sqrt(variance);

    // Determine trend
    const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
    const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, h) => sum + h.level, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, h) => sum + h.level, 0) / secondHalf.length;

    const trend = secondHalfAvg > firstHalfAvg + 5 ? 'improving' :
                  secondHalfAvg < firstHalfAvg - 5 ? 'declining' : 'stable';

    // Determine pattern type
    let type: ConsensusPattern['type'];
    let description: string;
    let strength: number;

    if (avgConsensus >= 90 && standardDeviation < 10) {
      type = 'unanimous';
      description = 'Strong unanimous agreement across all agents';
      strength = avgConsensus;
    } else if (avgConsensus >= 70 && standardDeviation < 20) {
      type = 'majority';
      description = 'Healthy majority consensus with moderate agreement';
      strength = avgConsensus;
    } else if (standardDeviation >= 30) {
      type = 'polarized';
      description = 'Polarized opinions with significant disagreement';
      strength = 100 - standardDeviation;
    } else {
      type = 'low-participation';
      description = 'Low participation or weak consensus formation';
      strength = avgConsensus;
    }

    return { type, description, strength, trend };
  }

  public renderConsensusMeter(agents: Agent[]): string {
    const metrics = this.calculateConsensusMetrics();
    const pattern = this.analyzeConsensusPattern();
    const activeDecision = Array.from(this.decisions.values())
      .find(d => d.status === 'active');

    const sections = [];

    // Consensus bar
    sections.push(this.renderConsensusBar(metrics.currentConsensusLevel));

    // Pattern analysis
    sections.push(this.renderPatternAnalysis(pattern));

    // Active decision (if any)
    if (activeDecision) {
      sections.push(this.renderActiveDecision(activeDecision, agents));
    }

    // Metrics summary
    sections.push(this.renderMetricsSummary(metrics));

    return sections.join('\n\n');
  }

  private renderConsensusBar(level: number): string {
    const barLength = 20;
    const filled = Math.round((level / 100) * barLength);
    const empty = barLength - filled;

    let color = '\x1b[31m'; // red
    if (level >= 70) color = '\x1b[32m'; // green
    else if (level >= 40) color = '\x1b[33m'; // yellow

    const consensusBar = `\x1b[1m🤝 CONSENSUS LEVEL: ${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${'\x1b[0m'} ${level.toFixed(1)}%\x1b[0m`;

    // Status indicator
    let statusEmoji = '🔴';
    let statusText = 'Low Consensus';
    if (level >= 70) {
      statusEmoji = '🟢';
      statusText = 'Strong Consensus';
    } else if (level >= 40) {
      statusEmoji = '🟡';
      statusText = 'Moderate Consensus';
    }

    return `${consensusBar}\n${statusEmoji} ${statusText}`;
  }

  private renderPatternAnalysis(pattern: ConsensusPattern): string {
    const patternEmoji = pattern.type === 'unanimous' ? '🎯' :
                        pattern.type === 'majority' ? '✅' :
                        pattern.type === 'polarized' ? '⚠️' : '📊';

    const trendEmoji = pattern.trend === 'improving' ? '📈' :
                      pattern.trend === 'declining' ? '📉' : '➡️';

    return `\x1b[1m${patternEmoji} PATTERN ANALYSIS:\x1b[0m
${this.colorize(pattern.description, 'info')}
Strength: ${this.renderStrengthBar(pattern.strength)}
Trend: ${trendEmoji} ${this.colorize(pattern.trend.toUpperCase(), pattern.trend === 'improving' ? 'green' : pattern.trend === 'declining' ? 'red' : 'gray')}`;
  }

  private renderActiveDecision(decision: Decision, agents: Agent[]): string {
    const voteCounts = {
      agree: decision.votes.filter(v => v.choice === 'agree').length,
      disagree: decision.votes.filter(v => v.choice === 'disagree').length,
      abstain: decision.votes.filter(v => v.choice === 'abstain').length
    };

    const participationPercent = (decision.votes.length / 10) * 100;

    let lines = [
      `\x1b[1m🗳️  ACTIVE DECISION:\x1b[0m`,
      `\x1b[33m${decision.topic}\x1b[0m`,
      this.truncate(decision.description, 60),
      '',
      `📊 Votes: 🟢 ${voteCounts.agree} | 🔴 ${voteCounts.disagree} | ⚪ ${voteCounts.abstain}`,
      `👥 Participation: ${participationPercent.toFixed(0)}% (${decision.votes.length}/10 agents)`
    ];

    // Show individual votes
    if (decision.votes.length > 0) {
      lines.push('', '\x1b[1mIndividual Votes:\x1b[0m');

      const sortedVotes = decision.votes.sort((a, b) => b.confidence - a.confidence);

      sortedVotes.forEach(vote => {
        const agent = agents.find(a => a.id === vote.agentId);
        const agentEmoji = agent ? agent.emoji : '🤖';
        const voteIcon = vote.choice === 'agree' ? '✅' : vote.choice === 'disagree' ? '❌' : '⚪';
        const confidenceBar = this.renderMiniConfidenceBar(vote.confidence);

        lines.push(`${agentEmoji} ${voteIcon} ${confidenceBar} ${vote.confidence.toFixed(0)}%`);

        if (vote.reason) {
          lines.push(`   ${this.dim(this.truncate(vote.reason, 50))}`);
        }
      });
    }

    return lines.join('\n');
  }

  private renderMetricsSummary(metrics: ConsensusMetrics): string {
    const decisionSuccessRate = metrics.totalDecisions > 0 ?
      (metrics.passedDecisions / metrics.totalDecisions) * 100 : 0;

    return `\x1b[1m📊 CONSENSUS METRICS:\x1b[0m
🎯 Total Decisions: ${metrics.totalDecisions}
✅ Passed: ${metrics.passedDecisions} | ❌ Failed: ${metrics.failedDecisions}
📈 Success Rate: ${this.renderMiniProgressBar(decisionSuccessRate)} ${decisionSuccessRate.toFixed(0)}%
⏱️  Avg Decision Time: ${(metrics.averageDecisionTime / 1000).toFixed(1)}s
👥 Participation Rate: ${this.renderMiniProgressBar(metrics.participationRate)} ${metrics.participationRate.toFixed(0)}%`;
  }

  private renderStrengthBar(strength: number): string {
    const barLength = 10;
    const filled = Math.round((strength / 100) * barLength);
    const empty = barLength - filled;

    const color = strength >= 80 ? 'green' : strength >= 50 ? 'yellow' : 'red';
    const filledPart = this.colorize('█'.repeat(filled), color);
    const emptyPart = '░'.repeat(empty);

    return `[${filledPart}${emptyPart}] ${strength.toFixed(0)}%`;
  }

  private renderMiniConfidenceBar(confidence: number): string {
    const barLength = 5;
    const filled = Math.round((confidence / 100) * barLength);
    const empty = barLength - filled;

    const color = confidence >= 80 ? 'green' : confidence >= 50 ? 'yellow' : 'red';
    const filledPart = this.colorize('█'.repeat(filled), color);
    const emptyPart = '░'.repeat(empty);

    return `[${filledPart}${emptyPart}]`;
  }

  private renderMiniProgressBar(value: number): string {
    const barLength = 6;
    const filled = Math.round((value / 100) * barLength);
    const empty = barLength - filled;

    const filledPart = this.colorize('█'.repeat(filled), 'success');
    const emptyPart = '░'.repeat(empty);

    return `[${filledPart}${emptyPart}]`;
  }

  public renderConsensusTimeline(): string {
    if (this.consensusHistory.length < 2) {
      return this.colorize('📊 Insufficient data for consensus timeline', 'gray');
    }

    const timelineHeight = 8;
    const timelineWidth = 40;
    const recentHistory = this.consensusHistory.slice(-timelineWidth);

    // Create timeline canvas
    const canvas: string[][] = Array(timelineHeight).fill(null).map(() => Array(timelineWidth).fill(' '));

    // Plot consensus history
    recentHistory.forEach((point, index) => {
      const x = index;
      const y = Math.floor((1 - point.level / 100) * (timelineHeight - 1));

      if (y >= 0 && y < timelineHeight) {
        const color = point.level >= 70 ? 'green' : point.level >= 40 ? 'yellow' : 'red';
        canvas[y][x] = this.colorize('█', color);
      }
    });

    const lines = [this.colorize('📊 CONSENSUS TIMELINE (Last 40 updates)', 'info')];

    // Render timeline
    for (let y = 0; y < timelineHeight; y++) {
      const row = canvas[y].join('');
      lines.push(`│${row}│`);
    }

    // Add axes and labels
    lines.push('└' + '─'.repeat(timelineWidth) + '┘');
    lines.push(`${this.dim('0%')} ${this.dim('Consensus Level')} ${this.dim('100%')}`);

    return lines.join('\n');
  }

  public simulateVotingRound(agents: Agent[]): void {
    const topics = [
      'Implement new optimization algorithm',
      'Adopt different communication protocol',
      'Increase task parallelism level',
      'Update error handling strategy',
      'Modify consensus threshold'
    ];

    const topic = topics[Math.floor(Math.random() * topics.length)];
    const decisionId = this.startDecision(topic, `Discussion about: ${topic}`);

    // Simulate agents voting with some delay
    agents.forEach((agent, index) => {
      setTimeout(() => {
        const choices: Vote['choice'][] = ['agree', 'disagree', 'abstain'];
        const weights = [0.6, 0.3, 0.1]; // 60% agree, 30% disagree, 10% abstain

        // Adjust weights based on agent status
        let adjustedWeights = [...weights];
        if (agent.status === AgentStatus.ERROR) {
          adjustedWeights = [0.3, 0.6, 0.1]; // More likely to disagree
        }

        const choice = this.weightedRandomChoice(choices, adjustedWeights);
        const confidence = 50 + Math.random() * 50; // 50-100% confidence

        this.castVote(decisionId, agent.id, choice, confidence, `${agent.name} opinion`);
      }, index * 500 + Math.random() * 1000);
    });
  }

  private weightedRandomChoice<T>(choices: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < choices.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return choices[i];
      }
    }

    return choices[choices.length - 1];
  }

  private colorize(text: string, color: string): string {
    const colors: { [key: string]: string } = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      reset: '\x1b[0m'
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  private dim(text: string): string {
    return `\x1b[2m${text}\x1b[0m`;
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  public getActiveDecision(): Decision | undefined {
    return Array.from(this.decisions.values()).find(d => d.status === 'active');
  }

  public getDecisionHistory(): Decision[] {
    return Array.from(this.decisions.values());
  }

  public getMetrics(): ConsensusMetrics {
    return this.calculateConsensusMetrics();
  }

  public getPattern(): ConsensusPattern {
    return this.analyzeConsensusPattern();
  }

  public setConsensusThreshold(threshold: number): void {
    this.defaultThreshold = Math.max(0, Math.min(100, threshold));
  }

  public setMinParticipants(min: number): void {
    this.defaultMinParticipants = Math.max(1, Math.min(10, min));
  }
}