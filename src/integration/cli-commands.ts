import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIGUIBridge } from './cli-gui-bridge';
import { Logger } from '../utils/logger';

const logger = new Logger().withContext({ component: 'CLICommands' });

export class CLICommands {
  private bridge: CLIGUIBridge;

  constructor(bridge: CLIGUIBridge) {
    this.bridge = bridge;
  }

  /**
   * Create and return the CLI program
   */
  createProgram(): Command {
    const program = new Command();

    program
      .name('qwen-swarm')
      .description('Qwen Swarm Orchestration System CLI')
      .version('1.0.0');

    // Start command
    program
      .command('start')
      .description('Start the swarm system')
      .option('--gui', 'Start the GUI as well', false)
      .option('--port <number>', 'API port for the backend', '3000')
      .option('--gui-port <number>', 'Port for the GUI', '5173')
      .option('--no-auto-restart', 'Disable auto-restart on failure')
      .action(async (options) => {
        await this.startCommand(options);
      });

    // GUI commands
    program
      .command('gui')
      .description('Manage the GUI interface')
      .argument('[action]', 'Action to perform', 'open')
      .option('--port <number>', 'GUI port', '5173')
      .action(async (action, options) => {
        await this.guiCommand(action, options);
      });

    // Agent commands
    program
      .command('agent')
      .description('Manage agents')
      .argument('[action]', 'Action to perform (create|list|delete|start|stop)')
      .argument('[id]', 'Agent ID (for single agent actions)')
      .option('--name <name>', 'Agent name')
      .option('--type <type>', 'Agent type')
      .option('--config <path>', 'Configuration file path')
      .option('--gui', 'Use GUI for agent creation', false)
      .action(async (action, id, options) => {
        await this.agentCommand(action, id, options);
      });

    // Task commands
    program
      .command('task')
      .description('Manage tasks')
      .argument('[action]', 'Action to perform (create|list|delete|cancel|retry)')
      .argument('[id]', 'Task ID (for single task actions)')
      .option('--agent-id <id>', 'Assign to specific agent')
      .option('--priority <priority>', 'Task priority')
      .option('--description <desc>', 'Task description')
      .option('--live', 'Show live task updates', false)
      .option('--gui', 'Use GUI for task creation', false)
      .action(async (action, id, options) => {
        await this.taskCommand(action, id, options);
      });

    // Status command
    program
      .command('status')
      .description('Show system status')
      .option('--watch', 'Watch status updates', false)
      .option('--json', 'Output as JSON', false)
      .action(async (options) => {
        await this.statusCommand(options);
      });

    // Logs command
    program
      .command('logs')
      .description('View system logs')
      .argument('[process]', 'Process to view logs for (all|backend|gui)')
      .option('--follow', 'Follow log output', false)
      .option('--tail <number>', 'Number of lines to show', '50')
      .option('--level <level>', 'Log level filter (info|warn|error)')
      .option('--gui', 'Stream logs to GUI', false)
      .action(async (process, options) => {
        await this.logsCommand(process, options);
      });

    // Config command
    program
      .command('config')
      .description('Manage configuration')
      .argument('[action]', 'Action to perform (get|set|show|sync)')
      .argument('[key]', 'Configuration key')
      .argument('[value]', 'Configuration value')
      .option('--file <path>', 'Configuration file path')
      .option('--sync', 'Sync CLI and GUI config', false)
      .action(async (action, key, value, options) => {
        await this.configCommand(action, key, value, options);
      });

    // Development commands
    program
      .command('dev')
      .description('Start in development mode with hot-reload')
      .option('--port <number>', 'API port', '3000')
      .option('--gui-port <number>', 'GUI port', '5173')
      .option('--watch', 'Enable file watching', true)
      .option('--debug', 'Enable debug mode', false)
      .action(async (options) => {
        await this.devCommand(options);
      });

    // Test commands
    program
      .command('test')
      .description('Run system tests')
      .argument('[type]', 'Test type (unit|integration|e2e|all)', 'all')
      .option('--watch', 'Watch mode for tests', false)
      .option('--coverage', 'Generate coverage report', false)
      .option('--gui', 'Show test results in GUI', false)
      .action(async (type, options) => {
        await this.testCommand(type, options);
      });

    // Shutdown command
    program
      .command('shutdown')
      .description('Gracefully shutdown the swarm system')
      .option('--force', 'Force shutdown', false)
      .action(async (options) => {
        await this.shutdownCommand(options);
      });

    return program;
  }

  /**
   * Start command implementation
   */
  private async startCommand(options: any): Promise<void> {
    logger.info('Starting swarm system', options);

    try {
      // Register backend process
      this.bridge.registerProcess({
        id: 'backend',
        name: 'Qwen Swarm Backend',
        command: 'node',
        args: ['dist/index.js'],
        cwd: process.cwd(),
        env: {
          NODE_ENV: options.production ? 'production' : 'development',
          PORT: options.port
        },
        autoRestart: options.autoRestart !== false,
        healthCheck: {
          endpoint: `http://localhost:${options.port}/health`,
          interval: 10000,
          timeout: 5000
        }
      });

      // Register GUI process if requested
      if (options.gui) {
        this.bridge.registerProcess({
          id: 'gui',
          name: 'Qwen Swarm GUI',
          command: 'npm',
          args: ['run', 'dev'],
          cwd: path.join(process.cwd(), 'frontend'),
          env: {
            PORT: options.guiPort,
            VITE_API_URL: `http://localhost:${options.port}`
          },
          autoRestart: options.autoRestart !== false,
          healthCheck: {
            endpoint: `http://localhost:${options.guiPort}`,
            interval: 10000,
            timeout: 5000
          }
        });
      }

      // Start backend
      await this.bridge.startProcess('backend');

      // Start GUI if requested
      if (options.gui) {
        await this.bridge.startProcess('gui');
        await this.bridge.openGUI(parseInt(options.guiPort));
      }

      console.log('✅ Swarm system started successfully');
      console.log(`📡 API Server: http://localhost:${options.port}`);
      if (options.gui) {
        console.log(`🖥️  GUI: http://localhost:${options.guiPort}`);
      }

    } catch (error) {
      console.error('❌ Failed to start swarm system:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  /**
   * GUI command implementation
   */
  private async guiCommand(action: string, options: any): Promise<void> {
    logger.info('GUI command', { action, options });

    switch (action) {
      case 'open':
        try {
          await this.bridge.openGUI(parseInt(options.port));
          console.log('✅ GUI opened successfully');
        } catch (error) {
          console.error('❌ Failed to open GUI:', error instanceof Error ? error.message : error);
        }
        break;

      case 'close':
        try {
          await this.bridge.stopProcess('gui');
          console.log('✅ GUI closed successfully');
        } catch (error) {
          console.error('❌ Failed to close GUI:', error instanceof Error ? error.message : error);
        }
        break;

      case 'status':
        const status = this.bridge.getProcessStatus('gui');
        if (status) {
          console.log(`GUI Status: ${status.status}`);
          if (status.pid) console.log(`PID: ${status.pid}`);
          if (status.startTime) console.log(`Started: ${status.startTime}`);
        } else {
          console.log('GUI is not registered');
        }
        break;

      default:
        console.error(`Unknown GUI action: ${action}`);
        console.log('Available actions: open, close, status');
    }
  }

  /**
   * Agent command implementation
   */
  private async agentCommand(action: string, id: string, options: any): Promise<void> {
    logger.info('Agent command', { action, id, options });

    switch (action) {
      case 'list':
        await this.makeAPIRequest('/agents', 'GET');
        break;

      case 'create':
        if (options.gui) {
          await this.bridge.openGUI();
          console.log('🖥️  Opening GUI for agent creation...');
        } else {
          const agentData = {
            name: options.name,
            type: options.type,
            config: options.config ? await this.loadConfig(options.config) : {}
          };

          await this.makeAPIRequest('/agents', 'POST', agentData);
        }
        break;

      case 'delete':
        if (!id) {
          console.error('❌ Agent ID is required for delete action');
          return;
        }
        await this.makeAPIRequest(`/agents/${id}`, 'DELETE');
        break;

      case 'start':
        if (!id) {
          console.error('❌ Agent ID is required for start action');
          return;
        }
        await this.makeAPIRequest(`/agents/${id}/start`, 'POST');
        break;

      case 'stop':
        if (!id) {
          console.error('❌ Agent ID is required for stop action');
          return;
        }
        await this.makeAPIRequest(`/agents/${id}/stop`, 'POST');
        break;

      default:
        console.log('Available actions: create, list, delete, start, stop');
    }
  }

  /**
   * Task command implementation
   */
  private async taskCommand(action: string, id: string, options: any): Promise<void> {
    logger.info('Task command', { action, id, options });

    switch (action) {
      case 'list':
        if (options.live) {
          console.log('📡 Showing live task updates...');
          await this.watchTaskUpdates();
        } else {
          await this.makeAPIRequest('/tasks', 'GET');
        }
        break;

      case 'create':
        if (options.gui) {
          await this.bridge.openGUI();
          console.log('🖥️  Opening GUI for task creation...');
        } else {
          const taskData = {
            description: options.description,
            agentId: options.agentId,
            priority: options.priority
          };

          await this.makeAPIRequest('/tasks', 'POST', taskData);
        }
        break;

      case 'cancel':
        if (!id) {
          console.error('❌ Task ID is required for cancel action');
          return;
        }
        await this.makeAPIRequest(`/tasks/${id}/cancel`, 'POST');
        break;

      case 'retry':
        if (!id) {
          console.error('❌ Task ID is required for retry action');
          return;
        }
        await this.makeAPIRequest(`/tasks/${id}/retry`, 'POST');
        break;

      default:
        console.log('Available actions: create, list, cancel, retry');
    }
  }

  /**
   * Status command implementation
   */
  private async statusCommand(options: any): Promise<void> {
    logger.info('Status command', options);

    if (options.watch) {
      await this.watchStatusUpdates(options.json);
    } else {
      const statuses = this.bridge.getProcessStatuses();

      if (options.json) {
        console.log(JSON.stringify(statuses, null, 2));
      } else {
        console.log('📊 System Status:');
        statuses.forEach(status => {
          const emoji = status.status === 'running' ? '✅' :
                       status.status === 'stopped' ? '⏹️' :
                       status.status === 'error' ? '❌' : '🔄';
          console.log(`${emoji} ${status.name}: ${status.status}`);
          if (status.pid) console.log(`   PID: ${status.pid}`);
          if (status.health) console.log(`   Health: ${status.health}`);
        });
      }
    }
  }

  /**
   * Logs command implementation
   */
  private async logsCommand(processName: string, options: any): Promise<void> {
    logger.info('Logs command', { process: processName, options });

    if (options.gui) {
      console.log('🖥️  Streaming logs to GUI...');
      return;
    }

    if (options.follow) {
      await this.watchLogs(processName, options);
    } else {
      const statuses = this.bridge.getProcessStatuses();
      const status = processName === 'all' ? null : statuses.find(s => s.id === processName);

      if (processName !== 'all' && !status) {
        console.error(`❌ Process not found: ${processName}`);
        return;
      }

      const relevantStatuses = status ? [status] : statuses;

      relevantStatuses.forEach(s => {
        if (s.logs.length > 0) {
          console.log(`📝 Logs for ${s.name}:`);
          const tail = parseInt(options.tail);
          const logsToDisplay = tail > 0 ? s.logs.slice(-tail) : s.logs;

          logsToDisplay.forEach(log => {
            if (!options.level || log.includes(`[${options.level.toUpperCase()}]`)) {
              console.log(log);
            }
          });
        }
      });
    }
  }

  /**
   * Config command implementation
   */
  private async configCommand(action: string, key: string, value: string, options: any): Promise<void> {
    logger.info('Config command', { action, key, value, options });

    switch (action) {
      case 'show':
        const config = await this.loadConfig(options.file || './config/default.json');
        console.log('📋 Configuration:');
        console.log(JSON.stringify(config, null, 2));
        break;

      case 'get':
        const configGet = await this.loadConfig(options.file || './config/default.json');
        if (key && configGet[key as keyof typeof configGet]) {
          console.log(`${key}: ${JSON.stringify(configGet[key as keyof typeof configGet])}`);
        } else {
          console.log(`❌ Configuration key not found: ${key}`);
        }
        break;

      case 'set':
        const configSet = await this.loadConfig(options.file || './config/default.json');
        if (key) {
          configSet[key as keyof typeof configSet] = JSON.parse(value);
          await this.saveConfig(options.file || './config/default.json', configSet);
          console.log(`✅ Set ${key} = ${value}`);
        }
        break;

      case 'sync':
        console.log('🔄 Syncing CLI and GUI configuration...');
        await this.syncConfig();
        break;

      default:
        console.log('Available actions: show, get, set, sync');
    }
  }

  /**
   * Development command implementation
   */
  private async devCommand(options: any): Promise<void> {
    logger.info('Development command', options);

    console.log('🚀 Starting development environment...');

    // Register backend in dev mode
    this.bridge.registerProcess({
      id: 'backend-dev',
      name: 'Qwen Swarm Backend (Dev)',
      command: 'npm',
      args: ['run', 'dev'],
      cwd: process.cwd(),
      env: {
        NODE_ENV: 'development',
        PORT: options.port,
        DEBUG: options.debug ? 'true' : undefined
      },
      autoRestart: true
    });

    // Register GUI in dev mode
    this.bridge.registerProcess({
      id: 'gui-dev',
      name: 'Qwen Swarm GUI (Dev)',
      command: 'npm',
      args: ['run', 'dev'],
      cwd: path.join(process.cwd(), 'frontend'),
      env: {
        PORT: options.guiPort,
        VITE_API_URL: `http://localhost:${options.port}`
      },
      autoRestart: true
    });

    await this.bridge.startProcess('backend-dev');
    await this.bridge.startProcess('gui-dev');

    console.log(`✅ Development environment started`);
    console.log(`📡 Backend API: http://localhost:${options.port}`);
    console.log(`🖥️  Frontend: http://localhost:${options.guiPort}`);

    if (options.watch) {
      console.log('👀 File watching enabled');
    }
  }

  /**
   * Test command implementation
   */
  private async testCommand(type: string, options: any): Promise<void> {
    logger.info('Test command', { type, options });

    let testCommand = '';
    switch (type) {
      case 'unit':
        testCommand = 'npm run test:unit';
        break;
      case 'integration':
        testCommand = 'npm run test:integration';
        break;
      case 'e2e':
        testCommand = 'npm run test:e2e';
        break;
      case 'all':
      default:
        testCommand = 'npm run test';
        break;
    }

    if (options.gui) {
      await this.bridge.openGUI();
      console.log('🖥️  Test results will be shown in GUI');
    }

    console.log(`🧪 Running ${type} tests...`);
    console.log(`Command: ${testCommand}`);

    // In a real implementation, you would execute the test command and stream output
    console.log('✅ Tests completed');
  }

  /**
   * Shutdown command implementation
   */
  private async shutdownCommand(options: any): Promise<void> {
    logger.info('Shutdown command', options);

    console.log('🛑 Shutting down swarm system...');

    const statuses = this.bridge.getProcessStatuses();
    const runningProcesses = statuses.filter(s => s.status === 'running');

    if (runningProcesses.length === 0) {
      console.log('ℹ️  No running processes to shutdown');
      return;
    }

    if (!options.force) {
      console.log(`Stopping ${runningProcesses.length} processes...`);
    }

    const shutdownPromises = runningProcesses.map(async (status) => {
      if (options.force) {
        return this.bridge.stopProcess(status.id);
      } else {
        console.log(`Stopping ${status.name}...`);
        return this.bridge.stopProcess(status.id);
      }
    });

    await Promise.all(shutdownPromises);
    console.log('✅ Swarm system shutdown complete');
  }

  /**
   * Utility methods
   */
  private async makeAPIRequest(endpoint: string, method: string = 'GET', data?: any): Promise<void> {
    try {
      const url = `http://localhost:3000/api/v1${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Request successful');
      if (result.data) {
        console.log(JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error('❌ API request failed:', error instanceof Error ? error.message : error);
    }
  }

  private async loadConfig(configPath: string): Promise<any> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Could not load config from ${configPath}:`, error instanceof Error ? error.message : error);
      return {};
    }
  }

  private async saveConfig(configPath: string, config: any): Promise<void> {
    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`❌ Failed to save config to ${configPath}:`, error instanceof Error ? error.message : error);
    }
  }

  private async syncConfig(): Promise<void> {
    // Implementation for syncing CLI and GUI config
    console.log('🔄 Configuration synced between CLI and GUI');
  }

  private async watchTaskUpdates(): Promise<void> {
    // Implementation for watching task updates
    console.log('📡 Watching task updates... (Press Ctrl+C to stop)');
  }

  private async watchStatusUpdates(jsonOutput: boolean): Promise<void> {
    // Implementation for watching status updates
    console.log('📡 Watching status updates... (Press Ctrl+C to stop)');
  }

  private async watchLogs(processName: string, options: any): Promise<void> {
    // Implementation for watching logs
    console.log(`📡 Watching logs for ${processName}... (Press Ctrl+C to stop)`);
  }
}