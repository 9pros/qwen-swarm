import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConsensusProposal,
  ConsensusType,
  ConsensusStatus,
  Vote,
  VoteDecision,
  AgentStatus,
  TaskPriority
} from '@/types';
import { Logger } from '@/utils/logger';

export interface ConsensusEvents {
  'proposal:created': (proposal: ConsensusProposal) => void;
  'proposal:updated': (proposal: ConsensusProposal) => void;
  'proposal:resolved': (proposal: ConsensusProposal) => void;
  'vote:cast': (proposalId: string, vote: Vote) => void;
  'quorum:reached': (proposalId: string) => void;
  'consensus:reached': (proposalId: string, result: unknown) => void;
  'consensus:failed': (proposalId: string, reason: string) => void;
  'timeout:expired': (proposalId: string) => void;
}

export interface VotingConfig {
  type: ConsensusType;
  requiredQuorum: number;
  timeout: number;
  votingWeight: (agentId: string) => number;
  tieBreaker: 'first_vote' | 'random' | 'chair';
  chairAgentId?: string;
}

export interface ConsensusMetrics {
  totalProposals: number;
  successfulProposals: number;
  failedProposals: number;
  averageConsensusTime: number;
  participationRate: number;
  totalVotesCast: number;
  proposalsByType: Map<ConsensusType, number>;
}

export class ConsensusManager extends EventEmitter<ConsensusEvents> {
  private proposals: Map<string, ConsensusProposal> = new Map();
  private activeAgents: Map<string, AgentStatus> = new Map();
  private votingStrategies: Map<ConsensusType, VotingStrategy> = new Map();
  private defaultConfig: VotingConfig;
  private metrics: ConsensusMetrics;
  private logger: Logger;
  private timeoutTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.logger = new Logger().withContext({ component: 'ConsensusManager' });
    this.metrics = this.initializeMetrics();
    this.defaultConfig = this.createDefaultConfig();
    this.initializeVotingStrategies();
  }

  public async createProposal(
    proposer: string,
    type: ConsensusType,
    payload: unknown,
    options: {
      requiredQuorum?: number;
      timeout?: number;
      votingWeight?: (agentId: string) => number;
      tieBreaker?: 'first_vote' | 'random' | 'chair';
      chairAgentId?: string;
    } = {}
  ): Promise<string> {
    const proposalId = uuidv4();
    const votingDeadline = new Date(Date.now() + (options.timeout || this.defaultConfig.timeout));

    const proposal: ConsensusProposal = {
      id: proposalId,
      proposer,
      type,
      payload,
      votingDeadline,
      requiredQuorum: options.requiredQuorum || this.defaultConfig.requiredQuorum,
      currentVotes: [],
      status: ConsensusStatus.PROPOSED,
      createdAt: new Date()
    };

    try {
      this.proposals.set(proposalId, proposal);
      this.setupTimeoutTimer(proposalId);
      this.updateMetrics('created', type);

      this.logger.info('Consensus proposal created', {
        proposalId,
        proposer,
        type,
        votingDeadline,
        requiredQuorum: proposal.requiredQuorum
      });

      this.emit('proposal:created', proposal);

      proposal.status = ConsensusStatus.VOTING;
      this.emit('proposal:updated', proposal);

      await this.notifyAgents(proposal);

      return proposalId;
    } catch (error) {
      this.proposals.delete(proposalId);
      this.logger.error('Failed to create consensus proposal', error instanceof Error ? error : new Error(String(error)), { proposalId });
      throw error;
    }
  }

  public async castVote(
    proposalId: string,
    voter: string,
    decision: VoteDecision,
    reasoning?: string,
    weight?: number
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== ConsensusStatus.VOTING) {
      throw new Error(`Proposal ${proposalId} is not in voting status`);
    }

    if (new Date() > proposal.votingDeadline) {
      throw new Error(`Voting deadline passed for proposal ${proposalId}`);
    }

    const existingVoteIndex = proposal.currentVotes.findIndex(vote => vote.voter === voter);
    if (existingVoteIndex !== -1) {
      proposal.currentVotes[existingVoteIndex] = {
        voter,
        decision,
        weight: weight ?? this.calculateVoteWeight(voter),
        reasoning,
        timestamp: new Date()
      };
    } else {
      proposal.currentVotes.push({
        voter,
        decision,
        weight: weight ?? this.calculateVoteWeight(voter),
        reasoning,
        timestamp: new Date()
      });
    }

    this.logger.debug('Vote cast', {
      proposalId,
      voter,
      decision,
      weight: weight ?? this.calculateVoteWeight(voter),
      reasoning
    });

    this.emit('vote:cast', proposalId, proposal.currentVotes[proposal.currentVotes.length - 1]);

    await this.checkConsensus(proposalId);
  }

  public async withdrawProposal(proposalId: string, reason?: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status === ConsensusStatus.ACCEPTED || proposal.status === ConsensusStatus.REJECTED) {
      throw new Error(`Cannot withdraw resolved proposal: ${proposalId}`);
    }

    proposal.status = ConsensusStatus.CANCELLED;
    proposal.result = { reason: reason || 'Withdrawn by proposer' };
    proposal.resolvedAt = new Date();

    this.clearTimeoutTimer(proposalId);
    this.updateMetrics('failed', proposal.type);

    this.logger.info('Proposal withdrawn', { proposalId, reason });
    this.emit('proposal:updated', proposal);
    this.emit('consensus:failed', proposalId, reason || 'Withdrawn');
  }

  public async delegateVote(
    proposalId: string,
    delegator: string,
    delegatee: string
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const delegatorVote = proposal.currentVotes.find(vote => vote.voter === delegator);
    if (delegatorVote) {
      proposal.currentVotes = proposal.currentVotes.filter(vote => vote.voter !== delegator);
      this.logger.info('Vote delegation removed', { proposalId, delegator });
    }

    this.logger.info('Vote delegated', { proposalId, delegator, delegatee });
  }

  public getProposal(proposalId: string): ConsensusProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public getAllProposals(): ConsensusProposal[] {
    return Array.from(this.proposals.values());
  }

  public getProposalsByStatus(status: ConsensusStatus): ConsensusProposal[] {
    return Array.from(this.proposals.values()).filter(proposal => proposal.status === status);
  }

  public getProposalsByType(type: ConsensusType): ConsensusProposal[] {
    return Array.from(this.proposals.values()).filter(proposal => proposal.type === type);
  }

  public getActiveProposals(): ConsensusProposal[] {
    return Array.from(this.proposals.values()).filter(
      proposal => proposal.status === ConsensusStatus.PROPOSED || proposal.status === ConsensusStatus.VOTING
    );
  }

  public updateAgentStatus(agentId: string, status: AgentStatus): void {
    this.activeAgents.set(agentId, status);
    this.logger.debug('Agent status updated', { agentId, status });
  }

  public removeAgent(agentId: string): void {
    this.activeAgents.delete(agentId);

    for (const proposal of this.proposals.values()) {
      proposal.currentVotes = proposal.currentVotes.filter(vote => vote.voter !== agentId);
    }

    this.logger.info('Agent removed from consensus', { agentId });
  }

  public getMetrics(): ConsensusMetrics {
    this.metrics.participationRate = this.calculateParticipationRate();
    return { ...this.metrics };
  }

  public async extendVotingDeadline(proposalId: string, extensionMs: number): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== ConsensusStatus.VOTING) {
      throw new Error(`Cannot extend voting deadline for proposal in status: ${proposal.status}`);
    }

    this.clearTimeoutTimer(proposalId);
    proposal.votingDeadline = new Date(proposal.votingDeadline.getTime() + extensionMs);
    this.setupTimeoutTimer(proposalId);

    this.logger.info('Voting deadline extended', { proposalId, extensionMs });
    this.emit('proposal:updated', proposal);
  }

  private async checkConsensus(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return;
    }

    const strategy = this.votingStrategies.get(proposal.type);
    if (!strategy) {
      this.logger.error('No voting strategy found', { proposalId, type: proposal.type });
      return;
    }

    const result = await strategy.evaluate(proposal);

    if (result.hasQuorum) {
      this.emit('quorum:reached', proposalId);

      if (result.hasConsensus) {
        await this.resolveProposal(proposalId, ConsensusStatus.ACCEPTED, result.outcome);
      } else if (result.isDefinitive) {
        await this.resolveProposal(proposalId, ConsensusStatus.REJECTED, result.outcome);
      }
    }
  }

  private async resolveProposal(
    proposalId: string,
    status: ConsensusStatus.ACCEPTED | ConsensusStatus.REJECTED,
    result?: unknown
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return;
    }

    proposal.status = status;
    proposal.result = result;
    proposal.resolvedAt = new Date();

    this.clearTimeoutTimer(proposalId);

    if (status === ConsensusStatus.ACCEPTED) {
      this.updateMetrics('successful', proposal.type);
      this.emit('consensus:reached', proposalId, result);
    } else {
      this.updateMetrics('failed', proposal.type);
      this.emit('consensus:failed', proposalId, 'Consensus not reached');
    }

    const consensusTime = proposal.resolvedAt.getTime() - proposal.createdAt.getTime();
    this.updateAverageConsensusTime(consensusTime);

    this.logger.info('Proposal resolved', {
      proposalId,
      status,
      consensusTime,
      totalVotes: proposal.currentVotes.length
    });

    this.emit('proposal:resolved', proposal);
    this.emit('proposal:updated', proposal);
  }

  private setupTimeoutTimer(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return;
    }

    const timeoutMs = proposal.votingDeadline.getTime() - Date.now();
    if (timeoutMs <= 0) {
      this.handleTimeout(proposalId);
      return;
    }

    const timer = setTimeout(() => {
      this.handleTimeout(proposalId);
    }, timeoutMs);

    this.timeoutTimers.set(proposalId, timer);
  }

  private clearTimeoutTimer(proposalId: string): void {
    const timer = this.timeoutTimers.get(proposalId);
    if (timer) {
      clearTimeout(timer);
      this.timeoutTimers.delete(proposalId);
    }
  }

  private handleTimeout(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== ConsensusStatus.VOTING) {
      return;
    }

    this.timeoutTimers.delete(proposalId);

    if (proposal.currentVotes.length >= proposal.requiredQuorum) {
      const strategy = this.votingStrategies.get(proposal.type);
      if (strategy) {
        strategy.evaluate(proposal).then(result => {
          if (result.hasConsensus) {
            this.resolveProposal(proposalId, ConsensusStatus.ACCEPTED, result.outcome);
          } else {
            this.resolveProposal(proposalId, ConsensusStatus.REJECTED, result.outcome);
          }
        });
      } else {
        this.resolveProposal(proposalId, ConsensusStatus.EXPIRED, { reason: 'Voting timeout' });
      }
    } else {
      this.resolveProposal(proposalId, ConsensusStatus.EXPIRED, { reason: 'Quorum not reached' });
    }

    this.emit('timeout:expired', proposalId);
    this.logger.warn('Proposal voting timeout', { proposalId });
  }

  private async notifyAgents(proposal: ConsensusProposal): Promise<void> {
    this.logger.info('Notifying agents about proposal', { proposalId: proposal.id });
  }

  private calculateVoteWeight(agentId: string): number {
    const agentStatus = this.activeAgents.get(agentId);
    if (!agentStatus || agentStatus === AgentStatus.FAILED || agentStatus === AgentStatus.TERMINATED) {
      return 0;
    }
    return 1;
  }

  private calculateParticipationRate(): number {
    const activeProposals = this.getActiveProposals();
    if (activeProposals.length === 0) {
      return 0;
    }

    const totalPossibleVotes = activeProposals.reduce((sum, proposal) => {
      return sum + this.activeAgents.size;
    }, 0);

    const totalActualVotes = activeProposals.reduce((sum, proposal) => {
      return sum + proposal.currentVotes.length;
    }, 0);

    return totalPossibleVotes > 0 ? totalActualVotes / totalPossibleVotes : 0;
  }

  private updateAverageConsensusTime(consensusTime: number): void {
    const totalProposals = this.metrics.successfulProposals + this.metrics.failedProposals;
    if (totalProposals > 0) {
      this.metrics.averageConsensusTime =
        (this.metrics.averageConsensusTime * (totalProposals - 1) + consensusTime) / totalProposals;
    }
  }

  private updateMetrics(action: 'created' | 'successful' | 'failed', type: ConsensusType): void {
    this.metrics.totalProposals++;

    if (action === 'successful') {
      this.metrics.successfulProposals++;
    } else if (action === 'failed') {
      this.metrics.failedProposals++;
    }

    const typeCount = this.metrics.proposalsByType.get(type) || 0;
    this.metrics.proposalsByType.set(type, typeCount + 1);
  }

  private initializeMetrics(): ConsensusMetrics {
    return {
      totalProposals: 0,
      successfulProposals: 0,
      failedProposals: 0,
      averageConsensusTime: 0,
      participationRate: 0,
      totalVotesCast: 0,
      proposalsByType: new Map()
    };
  }

  private createDefaultConfig(): VotingConfig {
    return {
      type: ConsensusType.SIMPLE_MAJORITY,
      requiredQuorum: 3,
      timeout: 300000,
      votingWeight: () => 1,
      tieBreaker: 'first_vote'
    };
  }

  private initializeVotingStrategies(): void {
    this.votingStrategies.set(ConsensusType.SIMPLE_MAJORITY, new SimpleMajorityStrategy());
    this.votingStrategies.set(ConsensusType.SUPER_MAJORITY, new SuperMajorityStrategy());
    this.votingStrategies.set(ConsensusType.UNANIMOUS, new UnanimousStrategy());
    this.votingStrategies.set(ConsensusType.WEIGHTED, new WeightedStrategy());
    this.votingStrategies.set(ConsensusType.DELEGATED, new DelegatedStrategy());
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Consensus Manager');

    for (const timer of this.timeoutTimers.values()) {
      clearTimeout(timer);
    }
    this.timeoutTimers.clear();

    for (const proposal of this.proposals.values()) {
      if (proposal.status === ConsensusStatus.VOTING) {
        proposal.status = ConsensusStatus.CANCELLED;
        proposal.result = { reason: 'System shutdown' };
        proposal.resolvedAt = new Date();
      }
    }

    this.proposals.clear();
    this.activeAgents.clear();
    this.votingStrategies.clear();

    this.logger.info('Consensus Manager shutdown complete');
  }
}

export interface VotingResult {
  hasQuorum: boolean;
  hasConsensus: boolean;
  isDefinitive: boolean;
  outcome?: unknown;
  voteBreakdown: {
    approve: number;
    reject: number;
    abstain: number;
    totalWeight: number;
  };
}

export abstract class VotingStrategy {
  public abstract async evaluate(proposal: ConsensusProposal): Promise<VotingResult>;

  protected calculateVoteBreakdown(votes: Vote[]): {
    approve: number;
    reject: number;
    abstain: number;
    totalWeight: number;
  } {
    return votes.reduce(
      (acc, vote) => {
        acc.totalWeight += vote.weight;

        switch (vote.decision) {
          case VoteDecision.APPROVE:
            acc.approve += vote.weight;
            break;
          case VoteDecision.REJECT:
            acc.reject += vote.weight;
            break;
          case VoteDecision.ABSTAIN:
            acc.abstain += vote.weight;
            break;
        }

        return acc;
      },
      { approve: 0, reject: 0, abstain: 0, totalWeight: 0 }
    );
  }
}

export class SimpleMajorityStrategy extends VotingStrategy {
  public async evaluate(proposal: ConsensusProposal): Promise<VotingResult> {
    const breakdown = this.calculateVoteBreakdown(proposal.currentVotes);
    const hasQuorum = proposal.currentVotes.length >= proposal.requiredQuorum;
    const total = breakdown.approve + breakdown.reject + breakdown.abstain;

    const hasConsensus = hasQuorum && breakdown.approve > breakdown.reject;
    const isDefinitive = hasQuorum && total > 0;

    return {
      hasQuorum,
      hasConsensus,
      isDefinitive,
      outcome: {
        approved: hasConsensus,
        voteBreakdown: breakdown,
        totalVotes: proposal.currentVotes.length
      },
      voteBreakdown: breakdown
    };
  }
}

export class SuperMajorityStrategy extends VotingStrategy {
  constructor(private threshold: number = 0.67) {
    super();
  }

  public async evaluate(proposal: ConsensusProposal): Promise<VotingResult> {
    const breakdown = this.calculateVoteBreakdown(proposal.currentVotes);
    const hasQuorum = proposal.currentVotes.length >= proposal.requiredQuorum;
    const total = breakdown.approve + breakdown.reject + breakdown.abstain;

    const hasConsensus = hasQuorum && (breakdown.approve / total) >= this.threshold;
    const isDefinitive = hasQuorum && total > 0;

    return {
      hasQuorum,
      hasConsensus,
      isDefinitive,
      outcome: {
        approved: hasConsensus,
        voteBreakdown: breakdown,
        totalVotes: proposal.currentVotes.length,
        threshold: this.threshold
      },
      voteBreakdown: breakdown
    };
  }
}

export class UnanimousStrategy extends VotingStrategy {
  public async evaluate(proposal: ConsensusProposal): Promise<VotingResult> {
    const breakdown = this.calculateVoteBreakdown(proposal.currentVotes);
    const hasQuorum = proposal.currentVotes.length >= proposal.requiredQuorum;
    const total = breakdown.approve + breakdown.reject + breakdown.abstain;

    const hasConsensus = hasQuorum && breakdown.reject === 0 && breakdown.approve > 0;
    const isDefinitive = hasQuorum && total > 0;

    return {
      hasQuorum,
      hasConsensus,
      isDefinitive,
      outcome: {
        approved: hasConsensus,
        voteBreakdown: breakdown,
        totalVotes: proposal.currentVotes.length
      },
      voteBreakdown: breakdown
    };
  }
}

export class WeightedStrategy extends VotingStrategy {
  public async evaluate(proposal: ConsensusProposal): Promise<VotingResult> {
    const breakdown = this.calculateVoteBreakdown(proposal.currentVotes);
    const hasQuorum = proposal.currentVotes.length >= proposal.requiredQuorum;

    const hasConsensus = hasQuorum && breakdown.approve > breakdown.reject;
    const isDefinitive = hasQuorum && breakdown.totalWeight > 0;

    return {
      hasQuorum,
      hasConsensus,
      isDefinitive,
      outcome: {
        approved: hasConsensus,
        voteBreakdown: breakdown,
        totalVotes: proposal.currentVotes.length,
        totalWeight: breakdown.totalWeight
      },
      voteBreakdown: breakdown
    };
  }
}

export class DelegatedStrategy extends VotingStrategy {
  public async evaluate(proposal: ConsensusProposal): Promise<VotingResult> {
    const breakdown = this.calculateVoteBreakdown(proposal.currentVotes);
    const hasQuorum = proposal.currentVotes.length >= proposal.requiredQuorum;

    const hasConsensus = hasQuorum && breakdown.approve > breakdown.reject;
    const isDefinitive = hasQuorum && breakdown.totalWeight > 0;

    return {
      hasQuorum,
      hasConsensus,
      isDefinitive,
      outcome: {
        approved: hasConsensus,
        voteBreakdown: breakdown,
        totalVotes: proposal.currentVotes.length,
        delegated: true
      },
      voteBreakdown: breakdown
    };
  }
}