#!/usr/bin/env node

/**
 * Enhanced CLI with advanced terminal visualizations and swarm integration
 */

import { SwarmTerminalIntegration } from '../terminal/SwarmTerminalIntegration';
import { SwarmOrchestrator } from '../core/orchestrator';
import { APIServer } from '../api/server';
import { ConfigManager } from '../config';
import { Logger } from '../utils/logger';
import { Command } from 'commander';
import { open } from 'open';

const logger = new Logger().withContext({ component: 'EnhancedCLI' });

export class EnhancedCLI {
  private swarmIntegration?: SwarmTerminalIntegration;
  private orchestrator?: SwarmOrchestrator;
  private apiServer?: APIServer;
  private configManager?: ConfigManager;
  private program: Command;

  constructor() {
    this.program = this.createProgram();
  }

  private createProgram(): Command {
    const program = new Command();

    program
      .name('qwen-swarm')
      .description('Qwen Swarm Orchestration System - Enhanced Terminal Interface')
      .version('1.0.0');

    // Dashboard commands
    program
      .command('dashboard')
      .description('Show real-time swarm dashboard')
      .option('--watch', 'Auto-refresh dashboard', false)
      .option('--no-colors', 'Disable color output', false)
      .action(async (options) => {
        await this.showDashboard(options);
      });

    // Agent commands with enhanced visualization
    program
      .command('agents')
      .description('Manage and visualize swarm agents')
      .argument('[action]', 'Action to perform (list|create|manage|topology)', 'list')
      .argument('[id]', 'Agent ID for specific actions')
      .option('--filter <text>', 'Filter agents by name or type')
      .option('--status <status>', 'Filter by status (running|stopped|error)')
      .option('--interactive', 'Use interactive mode', false)
      .action(async (action, id, options) => {
        await this.handleAgentCommand(action, id, options);
      });

    // Task commands with enhanced visualization
    program
      .command('tasks')
      .description('Manage and visualize swarm tasks')
      .argument('[action]', 'Action to perform (list|create|manage)', 'list')
      .argument('[id]', 'Task ID for specific actions')
      .option('--status <status>', 'Filter by status (pending|running|completed|failed)')
      .option('--priority <priority>', 'Filter by priority (low|medium|high|critical)')
      .option('--interactive', 'Use interactive mode', false)
      .action(async (action, id, options) => {
        await this.handleTaskCommand(action, id, options);
      });

    // Metrics and monitoring
    program
      .command('metrics')
      .description('Show system metrics and performance data')
      .option('--format <format>', 'Output format (table|chart|json)', 'table')
      .option('--refresh <seconds>', 'Auto-refresh interval in seconds', '0')
      .action(async (options) => {
        await this.showMetrics(options);
      });

    // Topology visualization
    program
      .command('topology')
      .description('Show swarm topology and agent connections')
      .option('--format <format>', 'Output format (ascii|graph|dot)', 'ascii')
      .action(async (options) => {
        await this.showTopology(options);
      });

    // System status with enhanced display
    program
      .command('status')
      .description('Show comprehensive system status')
      .option('--detailed', 'Show detailed status information', false)
      .option('--json', 'Output as JSON', false)
      .option('--watch', 'Watch for status changes', false)
      .action(async (options) => {
        await this.showStatus(options);
      });

    // Interactive mode
    program
      .command('interactive')
      .description('Launch interactive terminal mode')
      .option('--theme <theme>', 'Color theme (light|dark)', 'dark')
      .action(async (options) => {
        await this.startInteractiveMode(options);
      });

    // Logs with enhanced formatting
    program
      .command('logs')
      .description('View system logs with enhanced formatting')
      .argument('[component]', 'Component to view logs for (all|backend|agents|tasks)', 'all')
      .option('--follow', 'Follow log output', false)
      .option('--level <level>', 'Log level filter (debug|info|warn|error)', 'info')
      .option('--tail <number>', 'Number of lines to show', '50')
      .option('--highlight <text>', 'Highlight text in logs')
      .action(async (component, options) => {
        await this.showLogs(component, options);
      });

    // Performance analysis
    program
      .command('analyze')
      .description('Analyze swarm performance and suggest optimizations')
      .option('--deep', 'Perform deep analysis', false)
      .option('--export <format>', 'Export results (json|csv|html)', 'json')
      .action(async (options) => {
        await this.analyzePerformance(options);
      });

    // Configuration management with validation
    program
      .command('config')
      .description('Manage swarm configuration')
      .argument('[action]', 'Action to perform (show|get|set|validate|reset)', 'show')
      .argument('[key]', 'Configuration key')
      .argument('[value]', 'Configuration value')
      .option('--file <path>', 'Configuration file path')
      .option('--validate', 'Validate configuration after changes', false)
      .action(async (action, key, value, options) => {
        await this.handleConfigCommand(action, key, value, options);
      });

    // Enhanced launch command
    program
      .command('launch')
      .description('Launch Qwen Swarm with enhanced terminal interface')
      .option('--mode <mode>', 'Launch mode (development|production|monitoring)', 'development')
      .option('--dashboard', 'Show dashboard on launch', false)
      .option('--no-gui', 'Disable GUI', false)
      .option('--theme <theme>', 'Terminal theme (light|dark)', 'dark')
      .action(async (options) => {
        await this.launchEnhanced(options);
      });

    // Debug and diagnostics
    program
      .command('debug')
      .description('Debug and diagnostic tools')
      .argument('[command]', 'Debug command (health|test|trace|profile)', 'health')
      .option('--component <name>', 'Specific component to debug')
      .option('--verbose', 'Verbose output', false)
      .action(async (command, options) => {
        await this.runDiagnostics(command, options);
      });

    return program;
  }

  private async initialize(): Promise<void> {
    try {
      this.configManager = new ConfigManager();
      const config = this.configManager.getSystemConfig();

      this.orchestrator = new SwarmOrchestrator(config);
      await this.orchestrator.initialize();

      this.apiServer = new APIServer(this.orchestrator, config);

      this.swarmIntegration = new SwarmTerminalIntegration(this.orchestrator, this.apiServer);
      await this.swarmIntegration.connect();

      logger.info('Enhanced CLI initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize enhanced CLI', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async showDashboard(options: any): Promise<void> {
    const terminal = await this.getTerminal();

    if (options.watch) {
      let running = true;
      process.on('SIGINT', () => {
        running = false;
      });

      while (running) {
        console.clear();
        await this.swarmIntegration?.showDashboard();

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      await this.swarmIntegration?.showDashboard();
    }
  }

  private async handleAgentCommand(action: string, id: string, options: any): Promise<void> {
    const terminal = await this.getTerminal();

    switch (action) {
      case 'list':
        await this.swarmIntegration?.showAgentStatus(options.filter);
        break;

      case 'create':
        if (options.interactive) {
          await this.swarmIntegration?.createAgentInteractive();
        } else {
          console.log('Use --interactive flag to create agents interactively');
        }
        break;

      case 'manage':
        if (!id) {
          console.error('Agent ID is required for management');
          return;
        }
        await this.swarmIntegration?.manageAgent(id);
        break;

      case 'topology':
        await this.swarmIntegration?.showSwarmTopology();
        break;

      default:
        console.log('Available actions: list, create, manage, topology');
    }
  }

  private async handleTaskCommand(action: string, id: string, options: any): Promise<void> {
    const terminal = await this.getTerminal();

    switch (action) {
      case 'list':
        await this.swarmIntegration?.showTaskQueue();
        break;

      case 'create':
        if (options.interactive) {
          await this.swarmIntegration?.createTaskInteractive();
        } else {
          console.log('Use --interactive flag to create tasks interactively');
        }
        break;

      case 'manage':
        if (!id) {
          console.error('Task ID is required for management');
          return;
        }
        await this.manageTask(id);
        break;

      default:
        console.log('Available actions: list, create, manage');
    }
  }

  private async showMetrics(options: any): Promise<void> {
    const terminal = await this.getTerminal();

    switch (options.format) {
      case 'table':
        await this.swarmIntegration?.showSystemMetrics();
        break;

      case 'chart':
        await this.showMetricsChart();
        break;

      case 'json':
        const metrics = await this.orchestrator?.getMetrics();
        console.log(JSON.stringify(metrics, null, 2));
        break;

      default:
        console.log('Available formats: table, chart, json');
    }
  }

  private async showTopology(options: any): Promise<void> {
    await this.swarmIntegration?.showSwarmTopology();
  }

  private async showStatus(options: any): Promise<void> {
    const terminal = await this.getTerminal();

    if (options.detailed) {
      await this.swarmIntegration?.showDashboard();
    } else {
      const terminal = this.swarmIntegration?.getTerminal();
      terminal?.showSystemHeader('Qwen Swarm Status');

      const agents = await this.orchestrator?.getAgents();
      const tasks = await this.orchestrator?.getTasks();
      const metrics = await this.orchestrator?.getMetrics();

      const statusItems = [
        { label: 'Agents', status: 'running', details: `${agents?.length || 0} total` },
        { label: 'Tasks', status: 'running', details: `${tasks?.length || 0} total` },
        { label: 'CPU Usage', status: metrics?.cpu > 80 ? 'warning' : 'running', details: `${metrics?.cpu || 0}%` },
        { label: 'Memory', status: metrics?.memory > 80 ? 'warning' : 'running', details: `${metrics?.memory || 0}%` }
      ];

      terminal?.showStatusGrid(statusItems);
    }
  }

  private async startInteractiveMode(options: any): Promise<void> {
    const terminal = await this.getTerminal();

    terminal.showSystemHeader('Qwen Swarm Interactive Mode');

    // Implement interactive terminal loop
    console.log('Interactive mode - Type "help" for commands or "exit" to quit');

    // This would implement a full interactive REPL
    console.log('Interactive mode implementation would go here...');
  }

  private async showLogs(component: string, options: any): Promise<void> {
    // Enhanced log viewing with filtering and highlighting
    console.log(`Showing logs for component: ${component}`);
    console.log('Enhanced log viewer implementation would go here...');
  }

  private async analyzePerformance(options: any): Promise<void> {
    const terminal = await this.getTerminal();

    terminal.showSystemHeader('Performance Analysis');

    // Collect performance data
    const metrics = await this.orchestrator?.getMetrics();
    const agents = await this.orchestrator?.getAgents();
    const tasks = await this.orchestrator?.getTasks();

    // Analyze and provide recommendations
    console.log('Performance analysis implementation would go here...');
  }

  private async handleConfigCommand(action: string, key: string, value: string, options: any): Promise<void> {
    switch (action) {
      case 'show':
        const config = this.configManager?.getSystemConfig();
        console.log(JSON.stringify(config, null, 2));
        break;

      case 'get':
        // Implementation for getting specific config value
        break;

      case 'set':
        // Implementation for setting config value
        break;

      case 'validate':
        // Implementation for validating config
        break;

      case 'reset':
        // Implementation for resetting config
        break;

      default:
        console.log('Available actions: show, get, set, validate, reset');
    }
  }

  private async launchEnhanced(options: any): Promise<void> {
    await this.initialize();

    const terminal = this.swarmIntegration?.getTerminal();
    terminal?.showSystemHeader('Qwen Swarm Enhanced Launcher', `Mode: ${options.mode}`);

    // Start API server if not in monitoring mode
    if (options.mode !== 'monitoring' && this.apiServer) {
      await this.apiServer.start();
      console.log(`📡 API Server: http://localhost:${this.configManager?.getSystemConfig().api.port}`);
    }

    // Show dashboard if requested
    if (options.dashboard) {
      await this.swarmIntegration?.showDashboard();
    }

    // Open GUI if not disabled
    if (!options.noGui) {
      const port = this.configManager?.getSystemConfig().gui.port || 5173;
      console.log(`🖥️  Opening GUI: http://localhost:${port}`);
      await open(`http://localhost:${port}`);
    }

    console.log('✅ Qwen Swarm Enhanced system started successfully');
  }

  private async runDiagnostics(command: string, options: any): Promise<void> {
    const terminal = await this.getTerminal();

    terminal.showSystemHeader('Qwen Swarm Diagnostics', `Command: ${command}`);

    switch (command) {
      case 'health':
        await this.runHealthCheck();
        break;

      case 'test':
        await this.runSystemTests();
        break;

      case 'trace':
        await this.runTraceAnalysis();
        break;

      case 'profile':
        await this.runProfiler();
        break;

      default:
        console.log('Available commands: health, test, trace, profile');
    }
  }

  private async getTerminal() {
    if (!this.swarmIntegration) {
      await this.initialize();
    }
    return this.swarmIntegration?.getTerminal();
  }

  // Placeholder implementations
  private async manageTask(id: string): Promise<void> {
    console.log(`Managing task: ${id}`);
  }

  private async showMetricsChart(): Promise<void> {
    console.log('Metrics chart implementation would go here...');
  }

  private async runHealthCheck(): Promise<void> {
    console.log('Health check implementation would go here...');
  }

  private async runSystemTests(): Promise<void> {
    console.log('System tests implementation would go here...');
  }

  private async runTraceAnalysis(): Promise<void> {
    console.log('Trace analysis implementation would go here...');
  }

  private async runProfiler(): Promise<void> {
    console.log('Profiler implementation would go here...');
  }

  // Main execution method
  async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      logger.error('Enhanced CLI execution failed', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.swarmIntegration?.cleanup();
    await this.orchestrator?.shutdown();
    await this.apiServer?.stop();
  }
}

// Main execution
async function main(): Promise<void> {
  const cli = new EnhancedCLI();

  // Setup graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down Enhanced Qwen Swarm CLI...');
    await cli.cleanup();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await cli.run(process.argv);
  } catch (error) {
    logger.critical('Fatal error in Enhanced CLI', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.critical('Unhandled rejection', new Error(String(reason)), { promise });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.critical('Uncaught exception', error);
  process.exit(1);
});

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.critical('Fatal error', error);
    process.exit(1);
  });
}

export { EnhancedCLI };