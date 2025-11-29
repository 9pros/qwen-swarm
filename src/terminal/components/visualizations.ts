/**
 * ASCII art and chart visualization components
 */

import { TerminalColors } from '../utils/colors';
import { TerminalFormatters } from '../utils/formatters';
import type { ChartOptions, SystemMetrics, SwarmTopology } from '../types';

export class ASCIIVisualizer {
  // ASCII art for different states and icons
  static readonly icons = {
    success: ['✓', '✓✓', '✓✓✓'],
    error: ['✗', '✗✗', '✗✗✗'],
    warning: ['⚠', '⚠⚠', '⚠⚠⚠'],
    info: ['ℹ', 'ℹℹ', 'ℹℹℹ'],
    loading: ['⟳', '⏳', '⏱'],
    network: ['🌐', '🔗', '📡'],
    agent: ['🤖', '👤', '🎯'],
    task: ['📋', '📝', '🎯'],
    swarm: ['🐝', '🦋', '🐞'],
    cloud: ['☁', '☁☁', '☁☁☁'],
    security: ['🔒', '🛡', '🔐'],
    performance: ['⚡', '🚀', '💨']
  };

  static readonly logos = {
    qwen: `
    ╔═════════════════════════════════╗
    ║        ╭───╮  ╭───╮  ╭───╮      ║
    ║  QWEN   │ Q │  │ W │  │ E │  N   ║
    ║        ╰───╯  ╰───╯  ╰───╯      ║
    ╚═════════════════════════════════╝
    `,

    swarm: `
    ╔══════════════════════╗
    ║      ╭───╮  ╭───╮    ║
    ║  🐝  │   │  │   │ 🐝 ║
    ║      ╰───╯  ╰───╯    ║
    ║     SWARM ORCHESTRATION   ║
    ╚══════════════════════╝
    `
  };

  static drawSystemHeader(title: string, subtitle?: string): string {
    const width = 60;
    const titleLine = TerminalColors.bold(TerminalColors.primary(title));
    const subtitleLine = subtitle ? TerminalColors.secondary(subtitle) : '';

    let output = '';
    output += '╔' + '═'.repeat(width - 2) + '╗\n';

    // Title line
    const titlePadding = Math.max(0, (width - 4 - title.length) / 2);
    output += '║' + ' '.repeat(Math.floor(titlePadding)) + titleLine + ' '.repeat(Math.ceil(titlePadding)) + '║\n';

    if (subtitle) {
      const subtitlePadding = Math.max(0, (width - 4 - subtitle.length) / 2);
      output += '║' + ' '.repeat(Math.floor(subtitlePadding)) + subtitleLine + ' '.repeat(Math.ceil(subtitlePadding)) + '║\n';
    }

    output += '╚' + '═'.repeat(width - 2) + '╝\n';

    return output;
  }

  static drawStatusGrid(items: Array<{label: string, status: string, details?: string}>): string {
    const cols = 3;
    const rows = Math.ceil(items.length / cols);
    const cellWidth = 25;
    let output = '';

    for (let row = 0; row < rows; row++) {
      const rowItems: string[] = [];

      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        if (index >= items.length) {
          rowItems.push(' '.repeat(cellWidth));
          continue;
        }

        const item = items[index];
        const statusColor = TerminalColors.getStatusColor(item.status);
        const statusIcon = this.getStatusIcon(item.status);

        let cell = '';
        cell += statusColor(statusIcon) + ' ';
        cell += TerminalColors.bold(item.label) + '\n';
        cell += '   ' + statusColor(item.status);

        if (item.details) {
          cell += '\n   ' + TerminalColors.muted(item.details);
        }

        // Pad to cell width
        const lines = cell.split('\n');
        while (lines.length < 3) lines.push('');
        const paddedCell = lines.map(line => line.padEnd(cellWidth)).join('\n');
        rowItems.push(paddedCell);
      }

      // Combine columns
      for (let line = 0; line < 3; line++) {
        output += rowItems.map(cell => cell.split('\n')[line]).join(' │ ') + '\n';
      }

      if (row < rows - 1) {
        output += '─'.repeat(cellWidth * cols + (cols - 1) * 3) + '\n';
      }
    }

    return output;
  }

  static getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      running: '▶',
      stopped: '⏹',
      error: '✗',
      warning: '⚠',
      pending: '⏳',
      success: '✓',
      active: '🟢',
      inactive: '🔴',
      loading: '⟳'
    };

    return icons[status.toLowerCase()] || '?';
  }

  static drawResourceGauge(value: number, max: number, label: string, width: number = 20): string {
    const percentage = Math.min(100, (value / max) * 100);
    const filledChars = Math.round((percentage / 100) * width);
    const emptyChars = width - filledChars;

    let barColor = TerminalColors.success;
    if (percentage >= 90) barColor = TerminalColors.error;
    else if (percentage >= 70) barColor = TerminalColors.warning;

    const filled = '█'.repeat(filledChars);
    const empty = '░'.repeat(emptyChars);

    return `${label}: [${barColor(filled)}${TerminalColors.muted(empty)}] ${percentage.toFixed(1)}%`;
  }

  static drawMiniChart(data: number[], width: number = 30, height: number = 5): string {
    if (data.length === 0) return TerminalColors.muted('No data');

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Create chart lines from top to bottom
    const lines: string[] = [];
    for (let y = height - 1; y >= 0; y--) {
      let line = '';
      for (let x = 0; x < width && x < data.length; x++) {
        const dataIndex = Math.floor((x / width) * data.length);
        const value = data[dataIndex];
        const normalizedValue = (value - min) / range;
        const charIndex = Math.floor(normalizedValue * height);

        if (charIndex === y) {
          // Calculate color based on value
          if (normalizedValue > 0.8) line += TerminalColors.error('▲');
          else if (normalizedValue > 0.6) line += TerminalColors.warning('◆');
          else if (normalizedValue > 0.4) line += TerminalColors.info('●');
          else line += TerminalColors.success('○');
        } else if (charIndex > y) {
          line += TerminalColors.muted('│');
        } else {
          line += ' ';
        }
      }
      lines.push(line);
    }

    return lines.join('\n');
  }

  static drawSparkline(data: number[], options: {
    width?: number;
    color?: 'auto' | string;
  } = {}): string {
    const { width = data.length, color = 'auto' } = options;

    if (data.length === 0) return '';

    // Normalize data to 0-7 range for sparkline characters
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const sparklineChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    let result = '';

    for (let i = 0; i < width && i < data.length; i++) {
      const normalizedIndex = Math.floor(((data[i] - min) / range) * (sparklineChars.length - 1));
      const char = sparklineChars[normalizedIndex];

      if (color === 'auto') {
        const normalizedValue = (data[i] - min) / range;
        if (normalizedValue > 0.8) result += TerminalColors.error(char);
        else if (normalizedValue > 0.6) result += TerminalColors.warning(char);
        else if (normalizedValue > 0.4) result += TerminalColors.info(char);
        else result += TerminalColors.success(char);
      } else if (typeof color === 'string') {
        result += TerminalColors.colorize(char, color);
      } else {
        result += char;
      }
    }

    return result;
  }

  static drawTopology(topology: SwarmTopology): string {
    // Simple ASCII topology visualization
    const width = 60;
    const height = 20;
    const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

    // Place agents on grid
    topology.agents.forEach((agent, index) => {
      const x = agent.position?.x || Math.floor((index + 1) * width / (topology.agents.length + 1));
      const y = agent.position?.y || Math.floor(height / 2 + Math.sin(index) * 5);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        const icon = agent.type === 'queen' ? '👑' : agent.type === 'worker' ? '⚙️' : '🔬';
        const colorFunc = TerminalColors.getStatusColor(agent.status);
        grid[y][x] = colorFunc(icon);
      }
    });

    // Draw connections
    topology.connections.forEach(conn => {
      const fromAgent = topology.agents.find(a => a.id === conn.from);
      const toAgent = topology.agents.find(a => a.id === conn.to);

      if (fromAgent && toAgent) {
        const from = fromAgent.position || { x: 10, y: 10 };
        const to = toAgent.position || { x: 50, y: 10 };

        // Simple line drawing
        this.drawLine(grid, from.x, from.y, to.x, to.y, conn.status === 'active' ? '─' : '·');
      }
    });

    // Convert grid to string
    let output = TerminalColors.bold(TerminalColors.primary('Swarm Topology:')) + '\n';
    output += '┌' + '─'.repeat(width) + '┐\n';
    grid.forEach(row => {
      output += '│' + row.join('') + '│\n';
    });
    output += '└' + '─'.repeat(width) + '┘\n';

    // Legend
    output += '\nLegend: ';
    output += TerminalColors.success('👑 Queen') + ' ';
    output += TerminalColors.info('⚙️ Worker') + ' ';
    output += TerminalColors.accent('🔬 Specialist') + ' ';
    output += TerminalColors.muted('─ Active') + ' ';
    output += TerminalColors.muted('· Inactive');

    return output;
  }

  private static drawLine(grid: string[][], x1: number, y1: number, x2: number, y2: number, char: string): void {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x1 >= 0 && x1 < grid[0].length && y1 >= 0 && y1 < grid.length) {
        if (grid[y1][x1] === ' ') {
          grid[y1][x1] = TerminalColors.muted(char);
        }
      }

      if (x1 === x2 && y1 === y2) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
    }
  }

  static drawSystemDashboard(metrics: SystemMetrics): string {
    const width = 50;
    let output = '';

    output += TerminalColors.bold(TerminalColors.primary('System Resources')) + '\n';
    output += '╔' + '═'.repeat(width - 2) + '╗\n';

    // CPU Usage
    const cpuGauge = this.drawResourceGauge(metrics.cpu, 100, 'CPU', 20);
    output += '║ ' + cpuGauge.padEnd(width - 4) + ' ║\n';

    // Memory Usage
    const memoryGauge = this.drawResourceGauge(metrics.memory, 100, 'Memory', 20);
    output += '║ ' + memoryGauge.padEnd(width - 4) + ' ║\n';

    // Disk Usage
    const diskGauge = this.drawResourceGauge(metrics.disk, 100, 'Disk', 20);
    output += '║ ' + diskGauge.padEnd(width - 4) + ' ║\n';

    // Network
    const netIn = TerminalFormatters.formatBytes(metrics.network.inbound) + '/s';
    const netOut = TerminalFormatters.formatBytes(metrics.network.outbound) + '/s';
    const networkLine = `Network: ↓${netIn.padStart(8)} ↑${netOut.padStart(8)}`;
    output += '║ ' + networkLine.padEnd(width - 4) + ' ║\n';

    // Uptime and Processes
    const uptime = TerminalFormatters.formatDuration(metrics.uptime);
    const processesLine = `Uptime: ${uptime.padEnd(12)} Processes: ${metrics.processs}`;
    output += '║ ' + processesLine.padEnd(width - 4) + ' ║\n';

    output += '╚' + '═'.repeat(width - 2) + '╝\n';

    return output;
  }

  static drawLoadingAnimation(frame: number): string {
    const animations = [
      ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      ['⣾', '⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾', '⣷'],
      ['-', '\\', '|', '/'],
      ['◐', '◓', '◑', '◒'],
      ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
    ];

    const animation = animations[frame % animations.length];
    const currentFrame = animation[Math.floor(Date.now() / 100) % animation.length];

    return TerminalColors.info(currentFrame);
  }
}

export class TerminalCharts {
  static drawBarChart(data: Array<{label: string, value: number}>, options: ChartOptions): string {
    const { width = 40, height = 10, colors = [TerminalColors.success] } = options;

    if (data.length === 0) return TerminalColors.muted('No data to display');

    const maxValue = options.maxValue || Math.max(...data.map(d => d.value));
    const barWidth = Math.floor(width / data.length);

    let output = '';

    if (options.title) {
      output += TerminalColors.bold(options.title) + '\n';
    }

    // Draw bars
    for (let y = height; y > 0; y--) {
      let line = '';
      data.forEach((item, index) => {
        const barHeight = Math.round((item.value / maxValue) * height);
        const color = colors[index % colors.length];

        if (barHeight >= y) {
          line += color('█'.repeat(barWidth));
        } else {
          line += ' '.repeat(barWidth);
        }
        line += ' ';
      });
      output += line + '\n';
    }

    // Draw labels
    if (options.showLabels) {
      let labelLine = '';
      data.forEach(item => {
        const label = TerminalFormatters.truncateText(item.label, barWidth);
        labelLine += TerminalColors.muted(label.padEnd(barWidth)) + ' ';
      });
      output += labelLine + '\n';

      // Values
      let valueLine = '';
      data.forEach((item, index) => {
        const color = colors[index % colors.length];
        const value = item.value.toString();
        valueLine += color(value.padStart(barWidth)) + ' ';
      });
      output += valueLine + '\n';
    }

    return output;
  }

  static drawLineChart(data: Array<{label: string, value: number}>, options: ChartOptions): string {
    const { width = 50, height = 10 } = options;

    if (data.length === 0) return TerminalColors.muted('No data to display');

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    let output = '';

    if (options.title) {
      output += TerminalColors.bold(options.title) + '\n';
    }

    // Create chart grid
    const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

    // Plot points and draw lines
    for (let i = 0; i < data.length && i < width; i++) {
      const normalizedValue = (values[i] - min) / range;
      const y = Math.floor(normalizedValue * (height - 1));
      const x = Math.floor((i / data.length) * width);

      // Draw point
      grid[height - 1 - y][x] = TerminalColors.primary('●');

      // Draw line to next point
      if (i < data.length - 1 && i < width - 1) {
        const nextNormalizedValue = (values[i + 1] - min) / range;
        const nextY = Math.floor(nextNormalizedValue * (height - 1));
        const nextX = Math.floor(((i + 1) / data.length) * width);

        this.drawLine(grid, x, height - 1 - y, nextX, height - 1 - nextY, TerminalColors.info('─'));
      }
    }

    // Render grid
    grid.forEach(row => {
      output += '│' + row.join('') + '│\n';
    });

    // Draw bottom axis
    output += '└' + '─'.repeat(width) + '┘\n';

    return output;
  }

  private static drawLine(grid: string[][], x1: number, y1: number, x2: number, y2: number, char: string): void {
    // Simple horizontal line for line charts
    if (y1 === y2) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        if (grid[y1] && grid[y1][x] === ' ') {
          grid[y1][x] = char;
        }
      }
    }
  }
}