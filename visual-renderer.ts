/**
 * Advanced Visual Renderer for 10-Agent Swarm Display
 * Features sophisticated ANSI graphics, animations, and responsive layouts
 */

import { Agent, AgentStatus, SwarmMetrics } from './swarm-activity-display';
import { AgentTask, AgentPerformance } from './agent-status-manager';

export interface RenderConfig {
  terminalWidth: number;
  terminalHeight: number;
  colorScheme: 'default' | 'dark' | 'light' | 'matrix';
  animationSpeed: 'slow' | 'normal' | 'fast';
  compactMode: boolean;
  showPerformance: boolean;
  showCommunication: boolean;
  showProgressBars: boolean;
  showIcons: boolean;
}

export interface AnimationFrame {
  duration: number;
  frames: string[];
  currentFrame: number;
  lastUpdate: number;
}

export class VisualRenderer {
  private config: RenderConfig;
  private animations: Map<string, AnimationFrame> = new Map();
  private colorPalettes = {
    default: {
      background: '\x1b[40m',
      foreground: '\x1b[37m',
      accent: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      info: '\x1b[34m',
      highlight: '\x1b[35m',
      reset: '\x1b[0m'
    },
    dark: {
      background: '\x1b[40m',
      foreground: '\x1b[90m',
      accent: '\x1b[94m',
      success: '\x1b[92m',
      warning: '\x1b[93m',
      error: '\x1b[91m',
      info: '\x1b[96m',
      highlight: '\x1b[95m',
      reset: '\x1b[0m'
    },
    light: {
      background: '\x1b[47m',
      foreground: '\x1b[30m',
      accent: '\x1b[34m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      info: '\x1b[36m',
      highlight: '\x1b[35m',
      reset: '\x1b[0m'
    },
    matrix: {
      background: '\x1b[40m',
      foreground: '\x1b[32m',
      accent: '\x1b[37m',
      success: '\x1b[92m',
      warning: '\x1b[93m',
      error: '\x1b[91m',
      info: '\x1b[96m',
      highlight: '\x1b[95m',
      reset: '\x1b[0m'
    }
  };

  constructor(config: Partial<RenderConfig> = {}) {
    this.config = {
      terminalWidth: process.stdout.columns || 120,
      terminalHeight: process.stdout.rows || 30,
      colorScheme: 'default',
      animationSpeed: 'normal',
      compactMode: false,
      showPerformance: true,
      showCommunication: true,
      showProgressBars: true,
      showIcons: true,
      ...config
    };

    this.initializeAnimations();
  }

  private initializeAnimations(): void {
    // Loading animation
    this.animations.set('loading', {
      duration: 1000,
      frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      currentFrame: 0,
      lastUpdate: Date.now()
    });

    // Pulse animation
    this.animations.set('pulse', {
      duration: 500,
      frames: ['○', '◐', '◑', '◒', '◓', '●'],
      currentFrame: 0,
      lastUpdate: Date.now()
    });

    // Activity wave animation
    this.animations.set('wave', {
      duration: 200,
      frames: ['░', '▒', '▓'],
      currentFrame: 0,
      lastUpdate: Date.now()
    });

    // Communication animation
    this.animations.set('comm', {
      duration: 300,
      frames: ['•···', '·•··', '··•·', '···•'],
      currentFrame: 0,
      lastUpdate: Date.now()
    });
  }

  private getAnimation(name: string): string {
    const anim = this.animations.get(name);
    if (!anim) return '';

    const now = Date.now();
    const speedMultiplier = this.config.animationSpeed === 'slow' ? 2 :
                           this.config.animationSpeed === 'fast' ? 0.5 : 1;

    if (now - anim.lastUpdate > anim.duration * speedMultiplier) {
      anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
      anim.lastUpdate = now;
    }

    return anim.frames[anim.currentFrame];
  }

  private getColorPalette() {
    return this.colorPalettes[this.config.colorScheme];
  }

  private colorize(text: string, color: keyof ReturnType<typeof this.getColorPalette>): string {
    const palette = this.getColorPalette();
    return `${palette[color]}${text}${palette.reset}`;
  }

  private bold(text: string): string {
    return `\x1b[1m${text}\x1b[0m`;
  }

  private dim(text: string): string {
    return `\x1b[2m${text}\x1b[0m`;
  }

  private underline(text: string): string {
    return `\x1b[4m${text}\x1b[0m`;
  }

  private blink(text: string): string {
    return `\x1b[5m${text}\x1b[0m`;
  }

  public renderFullDisplay(
    agents: Agent[],
    agentTasks: Map<string, AgentTask[]>,
    agentPerformance: Map<string, AgentPerformance>,
    metrics: SwarmMetrics,
    recentCommunications: Array<{ from: string; to: string; message: string }> = []
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(this.renderHeader());

    // Agent Grid
    if (!this.config.compactMode) {
      sections.push(this.renderAgentGrid(agents, agentTasks, agentPerformance));
    } else {
      sections.push(this.renderCompactAgentGrid(agents, agentTasks, agentPerformance));
    }

    // Performance Section
    if (this.config.showPerformance) {
      sections.push(this.renderPerformanceSection(agents, agentPerformance, metrics));
    }

    // Communication Section
    if (this.config.showCommunication && recentCommunications.length > 0) {
      sections.push(this.renderCommunicationSection(recentCommunications, agents));
    }

    // Metrics Footer
    sections.push(this.renderMetricsFooter(metrics));

    return sections.join('\n');
  }

  private renderHeader(): string {
    const timestamp = new Date().toLocaleTimeString();
    const loadingIcon = this.getAnimation('loading');
    const palette = this.getColorPalette();

    const title = this.bold(`🚀 QWEN SWARM ACTIVITY MONITOR ${loadingIcon}`);
    const subtitle = `Real-time coordination of 10 parallel agents • ${timestamp}`;

    const headerLines = [
      this.colorize('═'.repeat(this.config.terminalWidth), 'accent'),
      this.centerText(title),
      this.centerText(this.dim(subtitle)),
      this.colorize('═'.repeat(this.config.terminalWidth), 'accent')
    ];

    return headerLines.join('\n');
  }

  private renderAgentGrid(
    agents: Agent[],
    agentTasks: Map<string, AgentTask[]>,
    agentPerformance: Map<string, AgentPerformance>
  ): string {
    const rows: string[] = [];
    const colsPerRow = 5;

    for (let i = 0; i < agents.length; i += colsPerRow) {
      const rowAgents = agents.slice(i, i + colsPerRow);
      const agentBoxes = rowAgents.map(agent =>
        this.renderAgentBox(agent, agentTasks.get(agent.id) || [], agentPerformance.get(agent.id))
      );
      rows.push(this.joinBoxes(agentBoxes));
    }

    return rows.join('\n\n');
  }

  private renderCompactAgentGrid(
    agents: Agent[],
    agentTasks: Map<string, AgentTask[]>,
    agentPerformance: Map<string, AgentPerformance>
  ): string {
    const lines: string[] = [];

    agents.forEach(agent => {
      const tasks = agentTasks.get(agent.id) || [];
      const performance = agentPerformance.get(agent.id);
      const statusIcon = this.getStatusIcon(agent.status);
      const statusColor = this.getStatusColor(agent.status);

      const line = `${agent.emoji} ${statusIcon} ${this.colorize(agent.name, statusColor)}: ` +
        `${this.truncate(agent.currentTask, 30)} ` +
        `${this.renderMiniProgressBar(agent.progress)} ` +
        `⚡${agent.performance.toFixed(0)}`;

      lines.push(line);
    });

    return lines.join('\n');
  }

  private renderAgentBox(agent: Agent, tasks: AgentTask[], performance?: AgentPerformance): string {
    const statusColor = this.getStatusColor(agent.status);
    const statusIcon = this.getStatusIcon(agent.status);
    const pulseIcon = agent.status === AgentStatus.ACTIVE ? this.getAnimation('pulse') : '';

    const header = `${agent.emoji} ${agent.name} ${pulseIcon}`;
    const statusLine = `${statusIcon} ${this.colorize(agent.status.toUpperCase(), statusColor)}`;
    const taskLine = `📋 ${this.truncate(agent.currentTask, 18)}`;
    const progressLine = this.config.showProgressBars ?
      `${this.renderProgressBar(agent.progress)} ${agent.progress.toFixed(0)}%` : '';
    const metricsLine = `💬 ${agent.messages} | ⚡ ${agent.performance.toFixed(0)}`;

    const content = [header, statusLine, taskLine];
    if (progressLine) content.push(progressLine);
    if (performance && this.config.showPerformance) {
      content.push(this.renderMiniPerformanceMetrics(performance));
    }
    content.push(metricsLine);

    // Add task count if agent has multiple tasks
    if (tasks.length > 1) {
      content.push(`📦 ${tasks.length} tasks`);
    }

    return this.boxContent(content.join('\n'), statusColor);
  }

  private renderProgressBar(progress: number): string {
    const barLength = 12;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;

    const filledPart = this.colorize('█'.repeat(filled), 'success');
    const emptyPart = this.dim('░'.repeat(empty));

    return `[${filledPart}${emptyPart}]`;
  }

  private renderMiniProgressBar(progress: number): string {
    const barLength = 6;
    const filled = Math.round((progress / 100) * barLength);
    const empty = barLength - filled;

    const filledPart = this.colorize('█'.repeat(filled), 'success');
    const emptyPart = '░'.repeat(empty);

    return `[${filledPart}${emptyPart}]`;
  }

  private renderPerformanceSection(
    agents: Agent[],
    agentPerformance: Map<string, AgentPerformance>,
    metrics: SwarmMetrics
  ): string {
    const sectionTitle = this.bold(this.colorize('📊 PERFORMANCE ANALYSIS', 'info'));
    const border = this.colorize('─'.repeat(this.config.terminalWidth), 'info');

    const lines = [border, this.centerText(sectionTitle), border];

    // Performance bars for top 5 agents
    const topAgents = agents
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 5);

    topAgents.forEach((agent, index) => {
      const performance = agentPerformance.get(agent.id);
      if (!performance) return;

      const perfBar = this.renderPerformanceBar(agent.performance, 30);
      const cpuIcon = performance.cpuUsage > 70 ? this.colorize('🔥', 'error') : '💻';
      const memIcon = performance.memoryUsage > 70 ? this.colorize('⚠️', 'warning') : '🧠';

      const line = `${index + 1}. ${agent.emoji} ${this.colorize(agent.name, 'foreground')} ` +
        `${perfBar} ${agent.performance.toFixed(1)}% ` +
        `${cpuIcon}${performance.cpuUsage.toFixed(0)}% ` +
        `${memIcon}${performance.memoryUsage.toFixed(0)}%`;

      lines.push(line);
    });

    // System-wide metrics
    lines.push('');
    lines.push(this.renderSystemMetrics(metrics));

    return lines.join('\n');
  }

  private renderPerformanceBar(value: number, width: number): string {
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;

    const color = value >= 80 ? 'success' : value >= 50 ? 'warning' : 'error';
    const filledPart = this.colorize('█'.repeat(filled), color);
    const emptyPart = this.dim('░'.repeat(empty));

    return `[${filledPart}${emptyPart}]`;
  }

  private renderSystemMetrics(metrics: SwarmMetrics): string {
    const consensusBar = this.renderConsensusBar(metrics.consensusLevel);
    const efficiencyIcons = '⚡'.repeat(Math.ceil(metrics.efficiency / 25));

    const metricsLine = this.bold('SYSTEM METRICS:') + ' ' +
      `🤝 Consensus: ${consensusBar} ${metrics.consensusLevel.toFixed(0)}% | ` +
      `⚡ Efficiency: ${this.colorize(efficiencyIcons, 'success')} | ` +
      `📊 Avg Performance: ${this.colorize(metrics.averagePerformance.toFixed(1) + '%', 'info')}`;

    return metricsLine;
  }

  private renderCommunicationSection(
    communications: Array<{ from: string; to: string; message: string }>,
    agents: Agent[]
  ): string {
    const sectionTitle = this.bold(this.colorize('🔄 COMMUNICATION FLOW', 'highlight'));
    const border = this.colorize('─'.repeat(this.config.terminalWidth), 'highlight');

    const lines = [border, this.centerText(sectionTitle), border];

    // Show last 5 communications
    const recentComm = communications.slice(-5);

    recentComm.forEach((comm, index) => {
      const fromAgent = agents.find(a => a.id === comm.from);
      const toAgent = agents.find(a => a.id === comm.to);
      const commAnim = this.getAnimation('comm');

      const line = `${commAnim} ${fromAgent?.emoji || '❓'} → ${toAgent?.emoji || '❓'} ` +
        `${this.colorize(this.truncate(comm.message, 40), 'info')}`;

      lines.push(line);
    });

    if (recentComm.length === 0) {
      lines.push(this.dim('No recent communications'));
    }

    return lines.join('\n');
  }

  private renderMetricsFooter(metrics: SwarmMetrics): string {
    const border = this.colorize('═'.repeat(this.config.terminalWidth), 'accent');

    const footerMetrics = [
      `💬 ${this.colorize(metrics.totalMessages.toString(), 'warning')} messages`,
      `🤝 ${this.colorize(metrics.consensusLevel.toFixed(0) + '%', 'success')} consensus`,
      `⚡ ${this.colorize(metrics.efficiency.toFixed(0) + '%', 'info')} efficiency`,
      `📋 ${this.colorize(metrics.activeTasks.toString(), 'error')} active, ${this.colorize(metrics.completedTasks.toString(), 'success')} completed`
    ];

    const footerLine = footerMetrics.map(metric => `[${metric}]`).join(' ');

    return [
      border,
      this.centerText(footerLine),
      border
    ].join('\n');
  }

  private renderMiniPerformanceMetrics(performance: AgentPerformance): string {
    const cpuColor = performance.cpuUsage > 70 ? 'error' :
                    performance.cpuUsage > 40 ? 'warning' : 'success';
    const memColor = performance.memoryUsage > 70 ? 'error' :
                    performance.memoryUsage > 40 ? 'warning' : 'success';

    return `💻${this.colorize(performance.cpuUsage.toFixed(0) + '%', cpuColor)} ` +
           `🧠${this.colorize(performance.memoryUsage.toFixed(0) + '%', memColor)}`;
  }

  private renderConsensusBar(level: number): string {
    const barLength = 10;
    const filled = Math.round((level / 100) * barLength);
    const empty = barLength - filled;

    const color = level >= 80 ? 'success' : level >= 50 ? 'warning' : 'error';
    const filledPart = this.colorize('█'.repeat(filled), color);
    const emptyPart = this.dim('░'.repeat(empty));

    return `[${filledPart}${emptyPart}]`;
  }

  private joinBoxes(boxes: string[]): string {
    const boxLines = boxes.map(box => box.split('\n'));
    const maxLines = Math.max(...boxLines.map(lines => lines.length));
    const result: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const line = boxLines
        .map(lines => lines[i] || ' '.repeat(lines[0]?.length || 0))
        .join('   ');
      result.push(line);
    }

    return result.join('\n');
  }

  private boxContent(content: string, borderColor: string): string {
    const lines = content.split('\n');
    const maxLineLength = Math.max(...lines.map(line => this.stripAnsi(line).length));
    const paddedLines = lines.map(line => line.padEnd(maxLineLength + this.getAnsiLength(line) - this.stripAnsi(line).length));

    const boxTop = `┌${'─'.repeat(maxLineLength + 2)}┐`;
    const boxBottom = `└${'─'.repeat(maxLineLength + 2)}┘`;
    const boxMiddle = paddedLines.map(line => `│ ${line} │`).join('\n');

    return this.colorize(boxTop, borderColor) + '\n' + boxMiddle + '\n' + this.colorize(boxBottom, borderColor);
  }

  private getStatusIcon(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.ACTIVE: return '🟢';
      case AgentStatus.THINKING: return '🟡';
      case AgentStatus.ERROR: return '🔴';
      case AgentStatus.COORDINATING: return '🔵';
      case AgentStatus.COMMUNICATING: return '🟣';
      default: return '⚪';
    }
  }

  private getStatusColor(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.ACTIVE: return 'success';
      case AgentStatus.THINKING: return 'warning';
      case AgentStatus.ERROR: return 'error';
      case AgentStatus.COORDINATING: return 'info';
      case AgentStatus.COMMUNICATING: return 'highlight';
      default: return 'foreground';
    }
  }

  private centerText(text: string): string {
    const strippedLength = this.stripAnsi(text).length;
    const padding = Math.max(0, this.config.terminalWidth - strippedLength) / 2;
    return ' '.repeat(Math.floor(padding)) + text + ' '.repeat(Math.ceil(padding));
  }

  private truncate(text: string, maxLength: number): string {
    const stripped = this.stripAnsi(text);
    if (stripped.length <= maxLength) return text;

    const suffix = '...';
    const truncatedText = stripped.substring(0, maxLength - suffix.length);

    // Preserve ANSI codes from original text
    let result = '';
    let textIndex = 0;
    let truncatedIndex = 0;

    for (let i = 0; i < text.length && truncatedIndex < truncatedText.length; i++) {
      if (text[i] === '\x1b') {
        // Copy ANSI sequence
        let j = i;
        while (j < text.length && text[j] !== 'm') j++;
        result += text.substring(i, j + 1);
        i = j;
      } else {
        result += text[i];
        truncatedIndex++;
      }
    }

    return result + suffix;
  }

  private stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  private getAnsiLength(text: string): number {
    return text.length - this.stripAnsi(text).length;
  }

  public updateConfig(newConfig: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.terminalWidth !== undefined) {
      this.config.terminalWidth = newConfig.terminalWidth;
    }

    if (newConfig.terminalHeight !== undefined) {
      this.config.terminalHeight = newConfig.terminalHeight;
    }
  }

  public getConfig(): RenderConfig {
    return { ...this.config };
  }

  public clearScreen(): string {
    return '\x1b[2J\x1b[H';
  }

  public moveCursorToTop(): string {
    return '\x1b[H';
  }

  public hideCursor(): string {
    return '\x1b[?25l';
  }

  public showCursor(): string {
    return '\x1b[?25h';
  }
}