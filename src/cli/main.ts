#!/usr/bin/env node

import { UnifiedLauncher } from './unified-launcher';
import { CLICommands } from '../integration/cli-commands';
import { CLIGUIBridge } from '../integration/cli-gui-bridge';
import { ConfigSync } from '../integration/config-sync';
import { IPCBridge } from '../integration/ipc-bridge';
import { Logger } from '../utils/logger';
import { Command } from 'commander';

const logger = new Logger().withContext({ component: 'Main' });

/**
 * Main CLI entry point with enhanced integration
 */
class MainCLI {
  private launcher: UnifiedLauncher;
  private bridge: CLIGUIBridge;
  private configSync: ConfigSync;
  private ipcBridge: IPCBridge;
  private cliCommands: CLICommands;
  private program: Command;

  constructor() {
    this.launcher = new UnifiedLauncher();
    this.bridge = new CLIGUIBridge();
    this.configSync = new ConfigSync();
    this.ipcBridge = new IPCBridge();
    this.cliCommands = new CLICommands(this.bridge);
    this.program = this.cliCommands.createProgram();
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Qwen Swarm CLI');

    try {
      // Initialize core components
      await Promise.all([
        this.bridge.initialize(),
        this.configSync.initialize(),
        this.ipcBridge.initialize()
      ]);

      // Setup component integration
      this.setupIntegration();

      // Setup enhanced CLI commands
      this.setupEnhancedCommands();

      logger.info('Qwen Swarm CLI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CLI', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Run the CLI with provided arguments
   */
  async run(argv: string[]): Promise<void> {
    try {
      // Check for special unified launch commands first
      if (await this.handleSpecialCommands(argv)) {
        return;
      }

      // Parse regular CLI commands
      await this.program.parseAsync(argv);

    } catch (error) {
      logger.error('CLI execution failed', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  }

  /**
   * Handle special unified commands
   */
  private async handleSpecialCommands(argv: string[]): Promise<boolean> {
    const command = argv[2];

    switch (command) {
      case 'launch':
        await this.handleLaunchCommand(argv.slice(3));
        return true;

      case 'dev':
        await this.handleDevCommand(argv.slice(3));
        return true;

      case 'stop':
        await this.handleStopCommand(argv.slice(3));
        return true;

      case 'restart':
        await this.handleRestartCommand(argv.slice(3));
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle launch command
   */
  private async handleLaunchCommand(args: string[]): Promise<void> {
    const { Command } = await import('commander');
    const launchCmd = new Command('launch');

    launchCmd
      .description('Launch the complete Qwen Swarm system')
      .option('--backend-port <number>', 'Backend API port', '3000')
      .option('--gui-port <number>', 'GUI port', '5173')
      .option('--no-gui', 'Disable GUI')
      .option('--auto-open', 'Automatically open GUI in browser', false)
      .option('--env <environment>', 'Environment (development|production|staging)', 'development')
      .option('--no-auto-restart', 'Disable auto-restart on failure')
      .action(async (options) => {
        await this.launchSystem(options);
      });

    await launchCmd.parseAsync(['launch', ...args]);
  }

  /**
   * Handle dev command
   */
  private async handleDevCommand(args: string[]): Promise<void> {
    const { Command } = await import('commander');
    const devCmd = new Command('dev');

    devCmd
      .description('Start in development mode')
      .option('--backend-port <number>', 'Backend API port', '3000')
      .option('--gui-port <number>', 'GUI port', '5173')
      .option('--debug', 'Enable debug mode', false)
      .option('--no-hot-reload', 'Disable hot reload', false)
      .action(async (options) => {
        await this.launchDevelopmentMode(options);
      });

    await devCmd.parseAsync(['dev', ...args]);
  }

  /**
   * Handle stop command
   */
  private async handleStopCommand(args: string[]): Promise<void> {
    const { Command } = await import('commander');
    const stopCmd = new Command('stop');

    stopCmd
      .description('Stop the Qwen Swarm system')
      .argument('[component]', 'Component to stop (all|backend|gui)', 'all')
      .option('--force', 'Force shutdown', false)
      .action(async (component, options) => {
        await this.stopSystem(component, options);
      });

    await stopCmd.parseAsync(['stop', ...args]);
  }

  /**
   * Handle restart command
   */
  private async handleRestartCommand(args: string[]): Promise<void> {
    const { Command } = await import('commander');
    const restartCmd = new Command('restart');

    restartCmd
      .description('Restart Qwen Swarm components')
      .argument('[component]', 'Component to restart (all|backend|gui)', 'all')
      .action(async (component) => {
        await this.restartSystem(component);
      });

    await restartCmd.parseAsync(['restart', ...args]);
  }

  /**
   * Launch the complete system
   */
  private async launchSystem(options: any): Promise<void> {
    logger.info('Launching Qwen Swarm system', options);

    try {
      // Create launch configuration
      const launchConfig = {
        backend: {
          port: parseInt(options.backendPort),
          host: 'localhost',
          env: options.env as 'development' | 'production' | 'staging',
          autoRestart: options.autoRestart !== false
        },
        gui: options.gui !== false ? {
          port: parseInt(options.guiPort),
          autoOpen: options.autoOpen,
          env: options.env === 'production' ? 'production' : 'development'
        } : undefined,
        integration: {
          enabled: true,
          bridgePort: 3002,
          wsPort: 3003
        }
      };

      // Create and configure launcher
      const launcher = new UnifiedLauncher(launchConfig);

      // Setup event handlers
      launcher.on('system:ready', ({ components }) => {
        console.log('✅ Qwen Swarm system is ready!');
        console.log(`🚀 Components: ${components.join(', ')}`);
        if (launchConfig.backend) {
          console.log(`📡 Backend API: http://localhost:${launchConfig.backend.port}`);
        }
        if (launchConfig.gui) {
          console.log(`🖥️  GUI: http://localhost:${launchConfig.gui.port}`);
        }
      });

      launcher.on('process:error', (status) => {
        console.error(`❌ Process error: ${status.name} - ${status.lastError}`);
      });

      launcher.on('system:error', ({ error }) => {
        console.error(`💥 System error: ${error}`);
      });

      // Launch the system
      await launcher.launch();

      // Keep the process running
      this.setupKeepAlive(launcher);

    } catch (error) {
      console.error('❌ Failed to launch Qwen Swarm system:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Launch in development mode
   */
  private async launchDevelopmentMode(options: any): Promise<void> {
    logger.info('Launching Qwen Swarm in development mode', options);

    try {
      const launchConfig = {
        backend: {
          port: parseInt(options.backendPort),
          host: 'localhost',
          env: 'development' as const,
          autoRestart: true
        },
        gui: {
          port: parseInt(options.guiPort),
          autoOpen: true,
          env: 'development' as const
        },
        integration: {
          enabled: true,
          bridgePort: 3002,
          wsPort: 3003
        },
        development: {
          hotReload: options.hotReload !== false,
          debug: options.debug,
          watchMode: true
        }
      };

      const launcher = new UnifiedLauncher(launchConfig);

      // Development-specific event handlers
      launcher.on('system:ready', ({ components }) => {
        console.log('🚀 Qwen Swarm development environment ready!');
        console.log(`🔧 Debug mode: ${options.debug ? 'enabled' : 'disabled'}`);
        console.log(`🔄 Hot reload: ${options.hotReload !== false ? 'enabled' : 'disabled'}`);
        console.log(`📡 Backend API: http://localhost:${launchConfig.backend.port}`);
        console.log(`🖥️  Frontend: http://localhost:${launchConfig.gui.port}`);
        console.log('\n📝 Development tips:');
        console.log('   • Changes will auto-reload');
        console.log('   • Check browser console for errors');
        console.log('   • Use Ctrl+C to stop all services');
      });

      await launcher.launchDevelopment();
      this.setupKeepAlive(launcher);

    } catch (error) {
      console.error('❌ Failed to launch development environment:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * Stop the system
   */
  private async stopSystem(component: string, options: any): Promise<void> {
    logger.info('Stopping Qwen Swarm system', { component, force: options.force });

    try {
      // Connect to existing launcher via IPC and send shutdown command
      const ipcClient = new (await import('../integration/ipc-bridge')).IPCClient('cli');

      try {
        await ipcClient.connect();
        await ipcClient.sendMessage({
          type: 'system:shutdown',
          target: 'all',
          payload: { component, force: options.force }
        });
        console.log('✅ Shutdown command sent');
      } catch (error) {
        console.log('ℹ️  No running system found or connection failed');
      }

      await ipcClient.disconnect();

    } catch (error) {
      console.error('❌ Failed to stop system:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Restart the system
   */
  private async restartSystem(component: string): Promise<void> {
    logger.info('Restarting Qwen Swarm system', { component });

    try {
      // Connect to existing launcher via IPC and send restart command
      const ipcClient = new (await import('../integration/ipc-bridge')).IPCClient('cli');

      try {
        await ipcClient.connect();
        await ipcClient.sendMessage({
          type: 'system:restart',
          target: 'all',
          payload: { component }
        });
        console.log('✅ Restart command sent');
      } catch (error) {
        console.log('ℹ️  No running system found, attempting to start fresh...');
        await this.launchSystem({
          backendPort: 3000,
          guiPort: 5173,
          gui: true,
          autoOpen: true,
          env: 'development'
        });
      }

      await ipcClient.disconnect();

    } catch (error) {
      console.error('❌ Failed to restart system:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Setup integration between components
   */
  private setupIntegration(): void {
    // Bridge to IPC integration
    this.bridge.on('process:started', (status) => {
      this.ipcBridge.broadcast({
        type: 'process:started',
        payload: status
      });
    });

    this.bridge.on('process:stopped', (status) => {
      this.ipcBridge.broadcast({
        type: 'process:stopped',
        payload: status
      });
    });

    // Config sync to IPC integration
    this.configSync.on('config:changed', (items) => {
      this.ipcBridge.broadcast({
        type: 'config:changed',
        payload: { items }
      });
    });

    // Handle IPC commands
    this.ipcBridge.on('message:received', async (message) => {
      await this.handleIPCCommand(message);
    });
  }

  /**
   * Handle IPC commands
   */
  private async handleIPCCommand(message: any): Promise<void> {
    switch (message.type) {
      case 'system:shutdown':
        // Handle system shutdown
        break;
      case 'system:restart':
        // Handle system restart
        break;
      case 'process:command':
        // Handle process commands
        const { action, processId } = message.payload;
        try {
          switch (action) {
            case 'start':
              await this.bridge.startProcess(processId);
              break;
            case 'stop':
              await this.bridge.stopProcess(processId);
              break;
            case 'restart':
              await this.bridge.restartProcess(processId);
              break;
          }
        } catch (error) {
          // Send error response back
        }
        break;
    }
  }

  /**
   * Setup enhanced CLI commands
   */
  private setupEnhancedCommands(): void {
    // Add enhanced commands to the program
    this.program
      .command('launch')
      .description('Launch the complete Qwen Swarm system with GUI integration')
      .option('--backend-port <number>', 'Backend API port', '3000')
      .option('--gui-port <number>', 'GUI port', '5173')
      .option('--no-gui', 'Disable GUI')
      .option('--auto-open', 'Automatically open GUI in browser', false)
      .option('--env <environment>', 'Environment', 'development')
      .action(async (options) => {
        await this.launchSystem(options);
      });

    this.program
      .command('dev')
      .description('Start in development mode with hot-reload')
      .option('--backend-port <number>', 'Backend API port', '3000')
      .option('--gui-port <number>', 'GUI port', '5173')
      .option('--debug', 'Enable debug mode', false)
      .action(async (options) => {
        await this.launchDevelopmentMode(options);
      });

    this.program
      .command('stop')
      .description('Stop the Qwen Swarm system')
      .argument('[component]', 'Component to stop (all|backend|gui)', 'all')
      .option('--force', 'Force shutdown', false)
      .action(async (component, options) => {
        await this.stopSystem(component, options);
      });

    this.program
      .command('restart')
      .description('Restart Qwen Swarm components')
      .argument('[component]', 'Component to restart (all|backend|gui)', 'all')
      .action(async (component) => {
        await this.restartSystem(component);
      });
  }

  /**
   * Setup keep-alive for long-running processes
   */
  private setupKeepAlive(launcher: UnifiedLauncher): void {
    const gracefulShutdown = async () => {
      console.log('\n🛑 Shutting down Qwen Swarm system...');
      await launcher.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up main CLI');

    await Promise.all([
      this.bridge.shutdown ? this.bridge.shutdown() : Promise.resolve(),
      this.configSync.cleanup(),
      this.ipcBridge.shutdown()
    ]);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const cli = new MainCLI();

  try {
    await cli.initialize();
    await cli.run(process.argv);

    // If no command was provided, show help
    if (!process.argv.slice(2).length) {
      cli['program'].outputHelp();
    }

  } catch (error) {
    logger.error('CLI execution failed', error instanceof Error ? error : new Error(String(error)));
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

export { MainCLI };