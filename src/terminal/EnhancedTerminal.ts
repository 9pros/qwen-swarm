/**
 * Enhanced Terminal Wrapper with advanced visualizations and interactions
 */

import { EventEmitter } from 'events';
import { TerminalColors } from './utils/colors';
import { TerminalFormatters } from './utils/formatters';
import { ASCIIVisualizer, TerminalCharts } from './components/visualizations';
import { ProgressBar, Spinner, MultiProgress } from './components/progress';
import type {
  TerminalConfig,
  TerminalTheme,
  StatusIndicator,
  SystemMetrics,
  AgentStatus,
  TaskInfo,
  DashboardLayout,
  NotificationOptions,
  FilterOptions,
  CommandOutput,
  TerminalSession
} from './types';

export class EnhancedTerminal extends EventEmitter {
  private config: TerminalConfig;
  private session: TerminalSession;
  private multiProgress?: MultiProgress;
  private activeSpinner?: Spinner;
  private isInteractive: boolean;

  constructor(config: Partial<TerminalConfig> = {}) {
    super();

    this.config = {
      theme: 'dark',
      width: TerminalColors.getTerminalSize().width,
      height: TerminalColors.getTerminalSize().height,
      colorSupport: TerminalColors.supportsFeature('color'),
      unicodeSupport: TerminalColors.supportsFeature('unicode'),
      interactive: true,
      ...config
    };

    this.isInteractive = this.config.interactive && process.stdout.isTTY;

    // Initialize session
    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      commands: [],
      currentDirectory: process.cwd(),
      environment: { ...process.env },
      history: [],
      bookmarks: []
    };

    this.setupTerminal();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupTerminal(): void {
    // Set color theme
    TerminalColors.setTheme(this.config.theme as 'light' | 'dark');

    // Setup terminal for interactive mode
    if (this.isInteractive) {
      // Hide cursor for better visuals
      process.stdout.write(TerminalColors.hideCursor());

      // Handle terminal resize
      process.stdout.on('resize', () => {
        this.config.width = process.stdout.columns || 80;
        this.config.height = process.stdout.rows || 24;
        this.emit('terminal:resize', { width: this.config.width, height: this.config.height });
      });

      // Handle cleanup on exit
      process.on('exit', () => {
        process.stdout.write(TerminalColors.showCursor());
      });
    }
  }

  // System Information Display
  showSystemHeader(title: string, subtitle?: string): void {
    console.log(ASCIIVisualizer.drawSystemHeader(title, subtitle));
  }

  showStatusGrid(items: Array<{label: string, status: string, details?: string}>): void {
    console.log(ASCIIVisualizer.drawStatusGrid(items));
  }

  showSystemMetrics(metrics: SystemMetrics): void {
    console.log(ASCIIVisualizer.drawSystemDashboard(metrics));
  }

  // Agent Management Visualizations
  showAgentList(agents: AgentStatus[], options: FilterOptions = {}): void {
    let filteredAgents = agents;

    // Apply filters
    if (options.status && options.status.length > 0) {
      filteredAgents = filteredAgents.filter(agent =>
        options.status!.includes(agent.status)
      );
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredAgents = filteredAgents.filter(agent =>
        agent.name.toLowerCase().includes(searchLower) ||
        agent.type.toLowerCase().includes(searchLower) ||
        agent.id.toLowerCase().includes(searchLower)
      );
    }

    // Sort by status and name
    filteredAgents.sort((a, b) => {
      const statusOrder = { running: 0, error: 1, warning: 2, stopped: 3, pending: 4 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 99) -
                        (statusOrder[b.status as keyof typeof statusOrder] || 99);
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });

    // Format as table
    const tableData = filteredAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      tasks: `${agent.tasksInProgress}/${agent.tasksCompleted}`,
      cpu: `${agent.resources.cpu}%`,
      memory: `${agent.resources.memory}%`,
      lastActivity: TerminalFormatters.formatRelativeTime(agent.lastActivity)
    }));

    console.log(TerminalColors.bold(TerminalColors.primary(`Swarm Agents (${filteredAgents.length}):`)));
    console.log(TerminalFormatters.formatTable(tableData, [
      { header: 'ID', key: 'id', width: 12, format: (v) => TerminalFormatters.truncateText(v, 10) },
      { header: 'Name', key: 'name', width: 15 },
      { header: 'Type', key: 'type', width: 12, color: (v) => v === 'queen' ? 'primary' : v === 'worker' ? 'info' : 'accent' },
      { header: 'Status', key: 'status', color: (v) => v },
      { header: 'Tasks', key: 'tasks', width: 10, align: 'center' },
      { header: 'CPU', key: 'cpu', width: 6, align: 'right', color: (v) => parseInt(v) > 80 ? 'error' : parseInt(v) > 60 ? 'warning' : 'success' },
      { header: 'Memory', key: 'memory', width: 8, align: 'right', color: (v) => parseInt(v) > 80 ? 'error' : parseInt(v) > 60 ? 'warning' : 'success' },
      { header: 'Last Activity', key: 'lastActivity', width: 12 }
    ], {
      headers: true,
      borders: true,
      padding: 1
    }));
  }

  showTaskQueue(tasks: TaskInfo[]): void {
    // Group tasks by status
    const tasksByStatus = tasks.reduce((acc, task) => {
      if (!acc[task.status]) acc[task.status] = [];
      acc[task.status].push(task);
      return acc;
    }, {} as Record<string, TaskInfo[]>);

    console.log(TerminalColors.bold(TerminalColors.primary('Task Queue Status:')));
    console.log();

    // Show summary
    const summary = [
      { status: 'pending', count: tasksByStatus.pending?.length || 0, color: 'warning' },
      { status: 'running', count: tasksByStatus.running?.length || 0, color: 'info' },
      { status: 'completed', count: tasksByStatus.completed?.length || 0, color: 'success' },
      { status: 'failed', count: tasksByStatus.failed?.length || 0, color: 'error' },
      { status: 'cancelled', count: tasksByStatus.cancelled?.length || 0, color: 'muted' }
    ];

    summary.forEach(({ status, count, color }) => {
      const percentage = tasks.length > 0 ? (count / tasks.length * 100).toFixed(1) : '0.0';
      const icon = this.getTaskIcon(status);
      console.log(`${TerminalColors[color as keyof typeof TerminalColors](icon)} ${status.padEnd(10)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });

    console.log();

    // Show recent tasks
    const recentTasks = tasks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    if (recentTasks.length > 0) {
      console.log(TerminalColors.bold('Recent Tasks:'));
      console.log(TerminalFormatters.formatTable(recentTasks, [
        { header: 'ID', key: 'id', width: 10, format: (v) => TerminalFormatters.truncateText(v, 8) },
        { header: 'Description', key: 'description', width: 30, format: (v) => TerminalFormatters.truncateText(v, 28) },
        { header: 'Status', key: 'status', width: 10, color: (v) => v },
        { header: 'Priority', key: 'priority', width: 8, color: (v) => v === 'critical' ? 'error' : v === 'high' ? 'warning' : v === 'medium' ? 'info' : 'muted' },
        { header: 'Progress', key: 'progress', width: 10, format: (v) => `${v}%`, color: (v) => v > 80 ? 'success' : v > 50 ? 'info' : v > 20 ? 'warning' : 'muted' },
        { header: 'Agent', key: 'assignedAgent', width: 12, format: (v) => v || 'Unassigned' },
        { header: 'Created', key: 'createdAt', width: 12, format: (v) => TerminalFormatters.formatRelativeTime(v) }
      ], {
        headers: true,
        borders: true,
        padding: 1
      }));
    }
  }

  private getTaskIcon(status: string): string {
    const icons = {
      pending: '⏳',
      running: '▶',
      completed: '✓',
      failed: '✗',
      cancelled: '⏹'
    };
    return icons[status as keyof typeof icons] || '?';
  }

  // Progress and Loading
  createProgressBar(total: number = 100, label: string = 'Progress'): ProgressBar {
    return new ProgressBar({
      width: Math.min(40, this.config.width - 20),
      showPercent: true,
      showTime: true,
      animated: true
    });
  }

  createSpinner(type?: string): Spinner {
    return new Spinner({
      frames: type === 'dots' ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] : undefined,
      interval: 100
    });
  }

  startMultiProgress(): MultiProgress {
    this.multiProgress = new MultiProgress();
    return this.multiProgress;
  }

  // Notifications and Alerts
  showNotification(options: NotificationOptions): void {
    const { type, title, message, duration = 5000 } = options;

    let icon = '';
    let colorFunc: (text: string) => string;

    switch (type) {
      case 'success':
        icon = '✓';
        colorFunc = TerminalColors.success;
        break;
      case 'warning':
        icon = '⚠';
        colorFunc = TerminalColors.warning;
        break;
      case 'error':
        icon = '✗';
        colorFunc = TerminalColors.error;
        break;
      case 'info':
      default:
        icon = 'ℹ';
        colorFunc = TerminalColors.info;
        break;
    }

    const notification = TerminalFormatters.formatBox(
      `${colorFunc(icon + ' ' + title)}${message ? '\n' + TerminalColors.muted(message) : ''}`,
      {
        padding: 1,
        margin: 0,
        borderStyle: 'rounded',
        borderColor: type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'success' ? 'green' : 'blue'
      }
    );

    console.log(notification);

    if (duration && duration > 0 && this.isInteractive) {
      setTimeout(() => {
        // Clear notification after duration
        this.clearLines(notification.split('\n').length + 2);
      }, duration);
    }
  }

  private clearLines(count: number): void {
    for (let i = 0; i < count; i++) {
      process.stdout.write('\x1b[1F\x1b[2K');
    }
  }

  // Interactive Elements
  async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    if (!this.isInteractive) return defaultValue;

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const question = `${message} ${defaultValue ? '(Y/n)' : '(y/N)'} `;
      rl.question(question, (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        if (normalized === '') {
          resolve(defaultValue);
        } else {
          resolve(normalized === 'y' || normalized === 'yes');
        }
      });
    });
  }

  async prompt(message: string, defaultValue?: string): Promise<string> {
    if (!this.isInteractive) return defaultValue || '';

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const question = defaultValue ? `${message} (${defaultValue}): ` : `${message}: `;
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim() || defaultValue || '');
      });
    });
  }

  async select(message: string, options: string[], defaultIndex: number = 0): Promise<string> {
    if (!this.isInteractive) return options[defaultIndex];

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Display options
    console.log(TerminalColors.bold(message));
    options.forEach((option, index) => {
      const prefix = index === defaultIndex ? '→' : ' ';
      const color = index === defaultIndex ? TerminalColors.primary : TerminalColors.muted;
      console.log(`  ${prefix} ${index + 1}. ${color(option)}`);
    });

    return new Promise((resolve) => {
      rl.question('\nSelect option (number): ', (answer) => {
        rl.close();
        const index = parseInt(answer.trim()) - 1;
        if (index >= 0 && index < options.length) {
          resolve(options[index]);
        } else {
          resolve(options[defaultIndex]);
        }
      });
    });
  }

  // Command Execution and History
  async executeCommand(command: string, args: string[] = []): Promise<CommandOutput> {
    const startTime = Date.now();
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;

    // Add to history
    this.session.history.push(fullCommand);

    // Show command being executed
    console.log(TerminalColors.muted(`$ ${fullCommand}`));

    try {
      // In a real implementation, this would execute the actual command
      // For now, we'll simulate it
      const { spawn } = await import('child_process');

      return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          process.stdout.write(output);
        });

        child.stderr?.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          process.stderr.write(TerminalColors.error(output));
        });

        child.on('close', (code) => {
          const duration = Date.now() - startTime;
          const result: CommandOutput = {
            command: fullCommand,
            exitCode: code || 0,
            stdout,
            stderr,
            duration,
            timestamp: new Date()
          };

          this.session.commands.push(result);
          this.emit('command:executed', result);

          resolve(result);
        });

        child.on('error', (error) => {
          const duration = Date.now() - startTime;
          const result: CommandOutput = {
            command: fullCommand,
            exitCode: 1,
            stdout: '',
            stderr: error.message,
            duration,
            timestamp: new Date()
          };

          this.session.commands.push(result);
          this.emit('command:executed', result);
          reject(error);
        });
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: CommandOutput = {
        command: fullCommand,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: new Date()
      };

      this.session.commands.push(result);
      this.emit('command:executed', result);
      throw error;
    }
  }

  showCommandHistory(count: number = 10): void {
    const recent = this.session.commands.slice(-count);

    if (recent.length === 0) {
      console.log(TerminalColors.muted('No command history'));
      return;
    }

    console.log(TerminalColors.bold('Command History:'));
    recent.forEach((cmd, index) => {
      const status = cmd.exitCode === 0 ? TerminalColors.success('✓') : TerminalColors.error('✗');
      const duration = TerminalColors.muted(`(${TerminalFormatters.formatDuration(cmd.duration)})`);
      console.log(`${status} ${cmd.command} ${duration}`);
    });
  }

  // Session Management
  getSession(): TerminalSession {
    return { ...this.session };
  }

  saveSession(): void {
    // In a real implementation, this would save to disk
    console.log(TerminalColors.info(`Session ${this.session.id} saved`));
  }

  // Cleanup
  cleanup(): void {
    if (this.isInteractive) {
      process.stdout.write(TerminalColors.showCursor());
    }

    if (this.activeSpinner) {
      this.activeSpinner.stop();
    }

    this.removeAllListeners();
  }
}