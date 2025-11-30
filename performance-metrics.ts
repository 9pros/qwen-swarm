/**
 * Real-time Performance Metrics System for 10-Agent Swarm
 * Features live graphs, performance tracking, and optimization insights
 */

import { Agent } from './swarm-activity-display';
import { AgentPerformance } from './agent-status-manager';

export interface PerformanceDataPoint {
  timestamp: number;
  value: number;
  agentId?: string;
  metric: string;
}

export interface PerformanceGraph {
  title: string;
  data: PerformanceDataPoint[];
  width: number;
  height: number;
  maxValue: number;
  minValue: number;
  colorScheme: string[];
  timeWindow: number; // milliseconds
}

export interface SystemAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  agentId?: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export interface OptimizationSuggestion {
  priority: 'low' | 'medium' | 'high';
  category: 'performance' | 'coordination' | 'load' | 'communication';
  description: string;
  affectedAgents: string[];
  expectedImprovement: string;
}

export class PerformanceMetrics {
  private graphs: Map<string, PerformanceGraph> = new Map();
  private alerts: SystemAlert[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  private thresholds: Map<string, { warning: number; error: number }> = new Map();
  private maxDataPoints = 100;
  private updateInterval = 1000; // 1 second

  constructor() {
    this.initializeGraphs();
    this.initializeThresholds();
    this.startMonitoring();
  }

  private initializeGraphs(): void {
    const defaultGraphConfig = {
      width: 40,
      height: 10,
      maxValue: 100,
      minValue: 0,
      colorScheme: ['\x1b[32m', '\x1b[33m', '\x1b[31m', '\x1b[35m', '\x1b[36m'],
      timeWindow: 60000 // 1 minute
    };

    const graphConfigs = [
      { title: 'CPU Usage', metric: 'cpuUsage' },
      { title: 'Memory Usage', metric: 'memoryUsage' },
      { title: 'Response Time', metric: 'responseTime', maxValue: 500 },
      { title: 'Throughput', metric: 'throughput' },
      { title: 'Error Rate', metric: 'errorRate' },
      { title: 'Success Rate', metric: 'successRate' }
    ];

    graphConfigs.forEach(config => {
      this.graphs.set(config.metric, {
        ...defaultGraphConfig,
        title: config.title,
        metric: config.metric,
        maxValue: config.maxValue || defaultGraphConfig.maxValue,
        data: []
      });
    });

    // System-wide graphs
    this.graphs.set('systemPerformance', {
      ...defaultGraphConfig,
      title: 'System Performance',
      metric: 'systemPerformance',
      data: []
    });

    this.graphs.set('consensusLevel', {
      ...defaultGraphConfig,
      title: 'Consensus Level',
      metric: 'consensusLevel',
      data: []
    });

    this.graphs.set('efficiency', {
      ...defaultGraphConfig,
      title: 'Swarm Efficiency',
      metric: 'efficiency',
      data: []
    });
  }

  private initializeThresholds(): void {
    this.thresholds.set('cpuUsage', { warning: 70, error: 90 });
    this.thresholds.set('memoryUsage', { warning: 70, error: 85 });
    this.thresholds.set('responseTime', { warning: 200, error: 400 });
    this.thresholds.set('throughput', { warning: 50, error: 30 });
    this.thresholds.set('errorRate', { warning: 5, error: 15 });
    this.thresholds.set('successRate', { warning: 90, error: 75 });
    this.thresholds.set('systemPerformance', { warning: 70, error: 50 });
    this.thresholds.set('consensusLevel', { warning: 60, error: 40 });
    this.thresholds.set('efficiency', { warning: 60, error: 40 });
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.cleanupOldData();
      this.updateOptimizationSuggestions();
    }, this.updateInterval);
  }

  public updateAgentPerformance(agentId: string, performance: AgentPerformance): void {
    const timestamp = Date.now();

    Object.entries(performance).forEach(([metric, value]) => {
      if (typeof value === 'number' && this.graphs.has(metric)) {
        this.addDataPoint(metric, value, timestamp, agentId);
        this.checkThresholds(metric, value, agentId);
      }
    });
  }

  public updateSystemMetrics(
    systemPerformance: number,
    consensusLevel: number,
    efficiency: number
  ): void {
    const timestamp = Date.now();

    this.addDataPoint('systemPerformance', systemPerformance, timestamp);
    this.addDataPoint('consensusLevel', consensusLevel, timestamp);
    this.addDataPoint('efficiency', efficiency, timestamp);

    this.checkThresholds('systemPerformance', systemPerformance);
    this.checkThresholds('consensusLevel', consensusLevel);
    this.checkThresholds('efficiency', efficiency);
  }

  private addDataPoint(metric: string, value: number, timestamp: number, agentId?: string): void {
    const graph = this.graphs.get(metric);
    if (!graph) return;

    const dataPoint: PerformanceDataPoint = { timestamp, value, agentId, metric };
    graph.data.push(dataPoint);

    // Remove old data points outside time window
    const cutoffTime = timestamp - graph.timeWindow;
    graph.data = graph.data.filter(point => point.timestamp > cutoffTime);

    // Limit maximum data points
    if (graph.data.length > this.maxDataPoints) {
      graph.data = graph.data.slice(-this.maxDataPoints);
    }

    // Update graph max value if needed
    if (value > graph.maxValue) {
      graph.maxValue = Math.ceil(value * 1.1);
    }
  }

  private checkThresholds(metric: string, value: number, agentId?: string): void {
    const threshold = this.thresholds.get(metric);
    if (!threshold) return;

    let alertType: SystemAlert['type'] | null = null;
    let thresholdValue = 0;

    if (value >= threshold.error) {
      alertType = 'error';
      thresholdValue = threshold.error;
    } else if (value >= threshold.warning) {
      alertType = 'warning';
      thresholdValue = threshold.warning;
    }

    if (alertType) {
      this.addAlert(alertType, metric, value, thresholdValue, agentId);
    }
  }

  private addAlert(
    type: SystemAlert['type'],
    metric: string,
    value: number,
    threshold: number,
    agentId?: string
  ): void {
    // Check if similar alert already exists (avoid spam)
    const recentAlert = this.alerts.find(alert =>
      alert.metric === metric &&
      alert.agentId === agentId &&
      alert.type === type &&
      Date.now() - alert.timestamp.getTime() < 5000 // Within last 5 seconds
    );

    if (recentAlert) return;

    const alert: SystemAlert = {
      type,
      message: this.generateAlertMessage(type, metric, value, threshold, agentId),
      agentId,
      metric,
      value,
      threshold,
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Keep only recent alerts (last 50)
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  private generateAlertMessage(
    type: SystemAlert['type'],
    metric: string,
    value: number,
    threshold: number,
    agentId?: string
  ): string {
    const agentStr = agentId ? ` (${agentId})` : '';
    const formattedValue = value.toFixed(1);
    const formattedThreshold = threshold.toFixed(1);

    switch (type) {
      case 'error':
        return `Critical: ${metric}${agentStr} = ${formattedValue}% (threshold: ${formattedThreshold}%)`;
      case 'warning':
        return `Warning: ${metric}${agentStr} = ${formattedValue}% (threshold: ${formattedThreshold}%)`;
      default:
        return `${metric}${agentStr} = ${formattedValue}%`;
    }
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 60000; // Keep last 1 minute
    this.alerts = this.alerts.filter(alert => alert.timestamp.getTime() > cutoffTime);
  }

  private updateOptimizationSuggestions(): void {
    this.suggestions = [];

    // Analyze current performance and generate suggestions
    this.graphs.forEach((graph, metric) => {
      if (graph.data.length < 10) return; // Need enough data

      const recentData = graph.data.slice(-10);
      const avgValue = recentData.reduce((sum, point) => sum + point.value, 0) / recentData.length;
      const threshold = this.thresholds.get(metric);

      if (threshold && avgValue > threshold.warning) {
        this.suggestions.push(this.generateOptimizationSuggestion(metric, avgValue, threshold));
      }
    });

    // Sort suggestions by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    this.suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    // Keep only top 5 suggestions
    this.suggestions = this.suggestions.slice(0, 5);
  }

  private generateOptimizationSuggestion(
    metric: string,
    value: number,
    threshold: { warning: number; error: number }
  ): OptimizationSuggestion {
    const priority = value >= threshold.error ? 'high' : 'medium';
    const category = this.getMetricCategory(metric);

    let description = '';
    let expectedImprovement = '';
    let affectedAgents: string[] = [];

    switch (metric) {
      case 'cpuUsage':
        description = 'High CPU usage detected. Consider optimizing algorithms or distributing workload.';
        expectedImprovement = 'Reduce CPU usage by 20-30%';
        affectedAgents = ['code', 'analysis', 'performance'];
        break;
      case 'memoryUsage':
        description = 'Memory usage is high. Implement better memory management or garbage collection.';
        expectedImprovement = 'Reduce memory usage by 15-25%';
        affectedAgents = ['code', 'integration', 'architecture'];
        break;
      case 'responseTime':
        description = 'Response times are elevated. Optimize network calls and reduce processing latency.';
        expectedImprovement = 'Improve response time by 30-40%';
        affectedAgents = ['queen', 'performance', 'integration'];
        break;
      case 'throughput':
        description = 'Low throughput detected. Increase parallelism and optimize bottlenecks.';
        expectedImprovement = 'Increase throughput by 25-35%';
        affectedAgents = ['code', 'performance', 'architecture'];
        break;
      case 'errorRate':
        description = 'Error rate is concerning. Review error handling and improve reliability.';
        expectedImprovement = 'Reduce error rate by 50-70%';
        affectedAgents = ['testing', 'security', 'code'];
        break;
      case 'systemPerformance':
        description = 'System performance is suboptimal. Review overall coordination and resource allocation.';
        expectedImprovement = 'Improve system performance by 20-30%';
        affectedAgents = ['queen', 'performance', 'code'];
        break;
      case 'consensusLevel':
        description = 'Consensus level is low. Improve communication protocols and decision-making.';
        expectedImprovement = 'Increase consensus by 15-25%';
        affectedAgents = ['queen', 'analysis', 'architecture'];
        break;
      case 'efficiency':
        description = 'Swarm efficiency needs improvement. Optimize task distribution and coordination.';
        expectedImprovement = 'Increase efficiency by 20-30%';
        affectedAgents = ['queen', 'performance', 'code'];
        break;
      default:
        description = `Optimize ${metric} to improve overall system performance.`;
        expectedImprovement = `Improve ${metric} by 15-25%`;
        affectedAgents = [];
    }

    return {
      priority,
      category,
      description,
      affectedAgents,
      expectedImprovement
    };
  }

  private getMetricCategory(metric: string): OptimizationSuggestion['category'] {
    if (['cpuUsage', 'memoryUsage', 'responseTime'].includes(metric)) return 'performance';
    if (['consensusLevel', 'efficiency'].includes(metric)) return 'coordination';
    if (['throughput', 'systemPerformance'].includes(metric)) return 'load';
    if (['errorRate', 'successRate'].includes(metric)) return 'communication';
    return 'performance';
  }

  public renderGraph(metric: string): string {
    const graph = this.graphs.get(metric);
    if (!graph || graph.data.length < 2) {
      return this.colorize(`No data available for ${graph?.title || metric}`, 'gray');
    }

    const lines = [this.colorize(`📊 ${graph.title}`, 'info')];

    // Create graph canvas
    const canvas: string[][] = Array(graph.height).fill(null).map(() => Array(graph.width).fill(' '));

    // Plot data points
    const now = Date.now();
    const timeWindow = graph.timeWindow;

    graph.data.forEach((point, index) => {
      const x = Math.floor(((point.timestamp - (now - timeWindow)) / timeWindow) * (graph.width - 1));
      const y = Math.floor((1 - point.value / graph.maxValue) * (graph.height - 1));

      if (x >= 0 && x < graph.width && y >= 0 && y < graph.height) {
        const colorIndex = point.agentId ? Math.abs(this.hashString(point.agentId)) % graph.colorScheme.length : 0;
        canvas[y][x] = this.colorize('█', graph.colorScheme[colorIndex]);
      }
    });

    // Render canvas
    for (let y = 0; y < graph.height; y++) {
      let row = canvas[y].join('');
      if (row.trim().length === 0) {
        row = this.dim('│' + ' '.repeat(graph.width - 2) + '│');
      } else {
        row = '│' + row + '│';
      }
      lines.push(row);
    }

    // Add axes
    const xAxis = '└' + '─'.repeat(graph.width - 2) + '┘';
    lines.push(this.colorize(xAxis, 'gray'));

    // Add current value
    if (graph.data.length > 0) {
      const currentValue = graph.data[graph.data.length - 1].value;
      lines.push(`\nCurrent: ${this.colorize(currentValue.toFixed(1), 'success')} / ${graph.maxValue}`);
    }

    return lines.join('\n');
  }

  public renderAlertsPanel(): string {
    if (this.alerts.length === 0) {
      return this.colorize('✅ No active alerts', 'success');
    }

    const recentAlerts = this.alerts.slice(-5).reverse();
    const lines = [this.colorize('⚠️  Recent Alerts', 'error')];

    recentAlerts.forEach(alert => {
      const icon = alert.type === 'error' ? '🔴' : '🟡';
      const time = alert.timestamp.toLocaleTimeString();
      const message = this.truncate(alert.message, 50);

      lines.push(`${icon} ${this.dim(time)} ${message}`);
    });

    return lines.join('\n');
  }

  public renderSuggestionsPanel(agents: Agent[]): string {
    if (this.suggestions.length === 0) {
      return this.colorize('🎯 System is running optimally', 'success');
    }

    const lines = [this.colorize('💡 Optimization Suggestions', 'info')];

    this.suggestions.forEach((suggestion, index) => {
      const priorityIcon = suggestion.priority === 'high' ? '🔴' :
                          suggestion.priority === 'medium' ? '🟡' : '🟢';
      const categoryIcon = this.getCategoryIcon(suggestion.category);

      lines.push(`${index + 1}. ${priorityIcon} ${categoryIcon}`);
      lines.push(`   ${this.dim(suggestion.description)}`);

      if (suggestion.affectedAgents.length > 0) {
        const agentEmojis = suggestion.affectedAgents.map(id => {
          const agent = agents.find(a => a.id === id);
          return agent ? agent.emoji : '🤖';
        }).join(' ');
        lines.push(`   ${agentEmojis} ${suggestion.expectedImprovement}`);
      }

      lines.push('');
    });

    return lines.join('\n');
  }

  public renderPerformanceDashboard(agents: Agent[]): string {
    const sections = [
      this.renderMultiGraphRow(['cpuUsage', 'memoryUsage']),
      this.renderMultiGraphRow(['responseTime', 'throughput']),
      this.renderAlertsPanel(),
      this.renderSuggestionsPanel(agents)
    ];

    return sections.join('\n\n');
  }

  private renderMultiGraphRow(metrics: string[]): string {
    const graphs = metrics.map(metric => this.renderGraph(metric));
    const lines: string[] = [];

    // Split graphs into lines and combine them
    const graphLines = graphs.map(graph => graph.split('\n'));
    const maxLines = Math.max(...graphLines.map(lines => lines.length));

    for (let i = 0; i < maxLines; i++) {
      const row = graphLines.map(lines => lines[i] || ' '.repeat(42)).join('   ');
      lines.push(row);
    }

    return lines.join('\n');
  }

  private getCategoryIcon(category: OptimizationSuggestion['category']): string {
    switch (category) {
      case 'performance': return '⚡';
      case 'coordination': return '🤝';
      case 'load': return '📊';
      case 'communication': return '💬';
      default: return '💡';
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
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

  public getGraphs(): Map<string, PerformanceGraph> {
    return new Map(this.graphs);
  }

  public getAlerts(): SystemAlert[] {
    return [...this.alerts];
  }

  public getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions];
  }

  public clearData(): void {
    this.graphs.forEach(graph => {
      graph.data = [];
    });
    this.alerts = [];
    this.suggestions = [];
  }

  public setThreshold(metric: string, warning: number, error: number): void {
    this.thresholds.set(metric, { warning, error });
  }

  public getThreshold(metric: string): { warning: number; error: number } | undefined {
    return this.thresholds.get(metric);
  }
}