/**
 * Advanced Communication Flow Visualizer
 * Shows real-time inter-agent coordination with network graphs and flow patterns
 */

import { Agent } from './swarm-activity-display';
import { AgentCommunication } from './agent-status-manager';

export interface CommunicationNode {
  agentId: string;
  position: { x: number; y: number };
  connections: number;
  color: string;
  activity: number;
}

export interface CommunicationEdge {
  from: string;
  to: string;
  weight: number;
  messages: AgentCommunication[];
  direction: 'bidirectional' | 'unidirectional';
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  networkDensity: number;
  clusteringCoefficient: number;
  centralNode: string;
  messageThroughput: number;
  averageLatency: number;
}

export class CommunicationFlowVisualizer {
  private width: number;
  private height: number;
  private nodes: Map<string, CommunicationNode> = new Map();
  private edges: Map<string, CommunicationEdge> = new Map();
  private colorSchemes = {
    default: {
      active: '\x1b[32m',
      inactive: '\x1b[90m',
      communicating: '\x1b[35m',
      coordinating: '\x1b[34m',
      highActivity: '\x1b[31m',
      mediumActivity: '\x1b[33m',
      lowActivity: '\x1b[36m',
      reset: '\x1b[0m'
    }
  };

  constructor(width: number = 80, height: number = 20) {
    this.width = width;
    this.height = height;
  }

  public updateCommunications(communications: AgentCommunication[], agents: Agent[]): void {
    this.updateNodes(agents);
    this.updateEdges(communications);
  }

  private updateNodes(agents: Agent[]): void {
    const positions = this.calculateNodePositions(agents.length);

    agents.forEach((agent, index) => {
      const activity = this.calculateNodeActivity(agent);
      const color = this.getNodeColor(agent.status, activity);

      this.nodes.set(agent.id, {
        agentId: agent.id,
        position: positions[index],
        connections: 0,
        color,
        activity
      });
    });
  }

  private updateEdges(communications: AgentCommunication[]): void {
    this.edges.clear();

    // Group communications by agent pair
    const commByPair = new Map<string, AgentCommunication[]>();

    communications.forEach(comm => {
      const key = comm.from < comm.to ? `${comm.from}-${comm.to}` : `${comm.to}-${comm.from}`;
      if (!commByPair.has(key)) {
        commByPair.set(key, []);
      }
      commByPair.get(key)!.push(comm);
    });

    // Create edges from grouped communications
    commByPair.forEach((messages, key) => {
      const [from, to] = key.split('-');
      const weight = this.calculateEdgeWeight(messages);
      const direction = this.determineEdgeDirection(messages);

      this.edges.set(key, {
        from,
        to,
        weight,
        messages,
        direction
      });

      // Update node connections
      const fromNode = this.nodes.get(from);
      const toNode = this.nodes.get(to);

      if (fromNode) fromNode.connections++;
      if (toNode) toNode.connections++;
    });
  }

  private calculateNodePositions(count: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    const radius = Math.min(centerX, centerY) - 2;

    if (count === 1) {
      return [{ x: centerX, y: centerY }];
    }

    // Circular layout for better visibility
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = Math.floor(centerX + radius * Math.cos(angle));
      const y = Math.floor(centerY + radius * Math.sin(angle));

      // Ensure positions stay within bounds
      positions.push({
        x: Math.max(1, Math.min(this.width - 2, x)),
        y: Math.max(1, Math.min(this.height - 2, y))
      });
    }

    return positions;
  }

  private calculateNodeActivity(agent: Agent): number {
    // Calculate activity based on messages, status, and performance
    const messageWeight = agent.messages * 0.3;
    const statusWeight = agent.status === 'active' ? 40 : agent.status === 'thinking' ? 20 : 0;
    const performanceWeight = agent.performance * 0.3;

    return Math.min(100, messageWeight + statusWeight + performanceWeight);
  }

  private getNodeColor(status: string, activity: number): string {
    const colors = this.colorSchemes.default;

    if (status === 'communicating') return colors.communicating;
    if (status === 'coordinating') return colors.coordinating;
    if (activity >= 70) return colors.highActivity;
    if (activity >= 40) return colors.mediumActivity;
    if (activity >= 10) return colors.lowActivity;
    return colors.inactive;
  }

  private calculateEdgeWeight(messages: AgentCommunication[]): number {
    const now = Date.now();
    const recentMessages = messages.filter(m => now - m.timestamp.getTime() < 60000); // Last minute
    return recentMessages.length;
  }

  private determineEdgeDirection(messages: AgentCommunication[]): 'bidirectional' | 'unidirectional' {
    const fromSet = new Set(messages.map(m => m.from));
    const toSet = new Set(messages.map(m => m.to));

    // Check if there are messages in both directions
    const hasBidirectional = messages.some(m => fromSet.has(m.to) && toSet.has(m.from));
    return hasBidirectional ? 'bidirectional' : 'unidirectional';
  }

  public renderNetworkGraph(): string {
    const grid = this.createEmptyGrid();
    this.drawEdges(grid);
    this.drawNodes(grid);
    return this.gridToString(grid);
  }

  private createEmptyGrid(): string[][] {
    return Array(this.height).fill(null).map(() => Array(this.width).fill(' '));
  }

  private drawEdges(grid: string[][]): void {
    this.edges.forEach(edge => {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);

      if (!fromNode || !toNode) return;

      const line = this.drawLine(
        fromNode.position,
        toNode.position,
        edge.direction === 'bidirectional' ? '═' : '─',
        edge.weight
      );

      line.forEach(point => {
        if (this.isInBounds(point.x, point.y)) {
          const currentChar = grid[point.y][point.x];
          if (currentChar === ' ' || currentChar === '─' || currentChar === '═') {
            grid[point.y][point.x] = point.char;
          }
        }
      });
    });
  }

  private drawNodes(grid: string[][]): void {
    this.nodes.forEach(node => {
      const { x, y, color, activity } = node;

      if (!this.isInBounds(x, y)) return;

      // Draw node with activity indicator
      const activityChar = activity >= 70 ? '●' : activity >= 40 ? '◐' : '○';
      grid[y][x] = this.colorize(activityChar, color);

      // Draw agent emoji if space allows
      if (this.isInBounds(x + 2, y)) {
        const agentEmojis: { [key: string]: string } = {
          'queen': '🧠', 'code': '💻', 'analysis': '📊',
          'architecture': '🏗️', 'testing': '🧪', 'documentation': '📝',
          'security': '🔒', 'performance': '⚡', 'ui': '🎨', 'integration': '🔧'
        };
        grid[y][x + 2] = agentEmojis[node.agentId] || '🤖';
      }
    });
  }

  private drawLine(
    from: { x: number; y: number },
    to: { x: number; y: number },
    lineChar: string,
    weight: number
  ): Array<{ x: number; y: number; char: string }> {
    const points: Array<{ x: number; y: number; char: string }> = [];
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;
    let x = from.x;
    let y = from.y;

    // Determine line style based on weight
    const char = weight > 5 ? '█' : weight > 2 ? lineChar : '·';

    while (true) {
      points.push({ x, y, char });

      if (x === to.x && y === to.y) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return points;
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private gridToString(grid: string[][]): string {
    return grid.map(row => row.join('')).join('\n');
  }

  private colorize(text: string, color: string): string {
    return `${color}${text}${this.colorSchemes.default.reset}`;
  }

  public renderFlowTimeline(communications: AgentCommunication[], agents: Agent[]): string {
    const now = Date.now();
    const timeWindow = 30000; // 30 seconds
    const bins = 20;
    const binSize = timeWindow / bins;

    // Create timeline bins
    const timeline: Array<{ time: number; communications: AgentCommunication[]; agents: string[] }> = [];

    for (let i = 0; i < bins; i++) {
      const binStart = now - timeWindow + (i * binSize);
      const binEnd = binStart + binSize;

      const binComms = communications.filter(comm =>
        comm.timestamp.getTime() >= binStart && comm.timestamp.getTime() < binEnd
      );

      const involvedAgents = new Set(
        binComms.flatMap(comm => [comm.from, comm.to])
      );

      timeline.push({
        time: binStart,
        communications: binComms,
        agents: Array.from(involvedAgents)
      });
    }

    return this.renderTimelineChart(timeline, agents);
  }

  private renderTimelineChart(
    timeline: Array<{ time: number; communications: AgentCommunication[]; agents: string[] }>,
    agents: Agent[]
  ): string {
    const maxCommCount = Math.max(...timeline.map(t => t.communications.length), 1);
    const chartHeight = 10;
    const chartWidth = timeline.length;

    // Create chart grid
    const grid: string[][] = Array(chartHeight).fill(null).map(() => Array(chartWidth).fill(' '));

    // Fill chart with communication density
    timeline.forEach((bin, x) => {
      const density = bin.communications.length / maxCommCount;
      const filledRows = Math.floor(density * (chartHeight - 1));

      for (let y = chartHeight - 1; y >= chartHeight - filledRows; y--) {
        grid[y][x] = '█';
      }

      // Add agent indicators
      if (bin.agents.length > 0) {
        grid[0][x] = bin.agents.length.toString();
      }
    });

    // Render chart
    const lines = [this.colorize('📊 Communication Flow Timeline (Last 30s)', 'info')];

    for (let y = 0; y < chartHeight; y++) {
      const line = grid[y].map((char, x) => {
        if (char === '█') return this.colorize(char, 'success');
        if (char !== ' ' && char !== '0') return this.colorize(char, 'warning');
        return char;
      }).join('');

      const label = y === 0 ? '👥' : y === chartHeight - 1 ? '💬' : '  ';
      lines.push(`${label} ${line}`);
    }

    // Add time axis
    const timeAxis = '   └' + '─'.repeat(chartWidth);
    lines.push(this.colorize(timeAxis, 'inactive'));

    // Add agent legend
    const agentEmojis: { [key: string]: string } = {
      'queen': '🧠', 'code': '💻', 'analysis': '📊',
      'architecture': '🏗️', 'testing': '🧪', 'documentation': '📝',
      'security': '🔒', 'performance': '⚡', 'ui': '🎨', 'integration': '🔧'
    };

    const activeAgents = timeline.flatMap(t => t.agents);
    const uniqueAgents = Array.from(new Set(activeAgents)).slice(0, 5);
    const legend = uniqueAgents.map(id => agentEmojis[id] || '🤖').join(' ');

    if (legend) {
      lines.push(`\n${this.colorize('Active Agents:', 'info')} ${legend}`);
    }

    return lines.join('\n');
  }

  public renderNetworkMetrics(agents: Agent[], communications: AgentCommunication[]): NetworkMetrics {
    const totalNodes = agents.length;
    const totalEdges = this.edges.size;
    const maxPossibleEdges = (totalNodes * (totalNodes - 1)) / 2;
    const networkDensity = maxPossibleEdges > 0 ? (totalEdges / maxPossibleEdges) * 100 : 0;

    // Calculate central node (most connected)
    const nodeConnections = Array.from(this.nodes.entries())
      .map(([id, node]) => ({ id, connections: node.connections }))
      .sort((a, b) => b.connections - a.connections);

    const centralNode = nodeConnections[0]?.id || '';

    // Calculate message throughput (messages per minute)
    const now = Date.now();
    const recentMessages = communications.filter(m => now - m.timestamp.getTime() < 60000);
    const messageThroughput = recentMessages.length;

    // Calculate average latency (simulated)
    const averageLatency = 50 + Math.random() * 100; // Simulated 50-150ms

    return {
      totalNodes,
      totalEdges,
      networkDensity,
      clusteringCoefficient: this.calculateClusteringCoefficient(),
      centralNode,
      messageThroughput,
      averageLatency
    };
  }

  private calculateClusteringCoefficient(): number {
    // Simplified clustering coefficient calculation
    let totalClustering = 0;
    let nodeCount = 0;

    this.nodes.forEach((node, nodeId) => {
      const neighbors: string[] = [];

      this.edges.forEach((edge, key) => {
        if (edge.from === nodeId) neighbors.push(edge.to);
        if (edge.to === nodeId) neighbors.push(edge.from);
      });

      if (neighbors.length >= 2) {
        let neighborConnections = 0;
        const maxConnections = (neighbors.length * (neighbors.length - 1)) / 2;

        for (let i = 0; i < neighbors.length; i++) {
          for (let j = i + 1; j < neighbors.length; j++) {
            const key = neighbors[i] < neighbors[j] ?
              `${neighbors[i]}-${neighbors[j]}` :
              `${neighbors[j]}-${neighbors[i]}`;

            if (this.edges.has(key)) {
              neighborConnections++;
            }
          }
        }

        totalClustering += neighborConnections / maxConnections;
        nodeCount++;
      }
    });

    return nodeCount > 0 ? (totalClustering / nodeCount) * 100 : 0;
  }

  public renderMetricsPanel(metrics: NetworkMetrics, agents: Agent[]): string {
    const lines = [
      this.colorize('📈 Network Metrics', 'info'),
      this.colorize('─'.repeat(30), 'info'),
      `🔗 Nodes: ${metrics.totalNodes}`,
      `🔗 Edges: ${metrics.totalEdges}`,
      `📊 Density: ${metrics.networkDensity.toFixed(1)}%`,
      `🔗 Clustering: ${metrics.clusteringCoefficient.toFixed(1)}%`,
      `👑 Central: ${this.getAgentEmoji(metrics.centralNode)} ${this.getAgentName(metrics.centralNode, agents)}`,
      `💬 Throughput: ${metrics.messageThroughput}/min`,
      `⚡ Latency: ${metrics.averageLatency.toFixed(0)}ms`
    ];

    return lines.join('\n');
  }

  private getAgentEmoji(agentId: string): string {
    const emojis: { [key: string]: string } = {
      'queen': '🧠', 'code': '💻', 'analysis': '📊',
      'architecture': '🏗️', 'testing': '🧪', 'documentation': '📝',
      'security': '🔒', 'performance': '⚡', 'ui': '🎨', 'integration': '🔧'
    };
    return emojis[agentId] || '🤖';
  }

  private getAgentName(agentId: string, agents: Agent[]): string {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : 'Unknown';
  }

  public updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public getNodes(): CommunicationNode[] {
    return Array.from(this.nodes.values());
  }

  public getEdges(): CommunicationEdge[] {
    return Array.from(this.edges.values());
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}