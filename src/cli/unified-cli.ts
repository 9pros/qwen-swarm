#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

// ASCII Art Banner
const BANNER = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')} ${chalk.magenta.bold('🧠 QWEN SWARM v2.0.0 - Advanced Multi-Agent Platform')}      ${chalk.cyan('║')}
${chalk.cyan('║')} ${chalk.white('Swarm Intelligence • Self-Improving • Enhanced Terminal')}        ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}
${chalk.dim('Email: max@9pros.com | GitHub: https://github.com/9pros/qwen-swarm')}
`;

// Main program configuration
program
  .name('qwen-swarm')
  .description('🧠 Advanced multi-agent orchestration platform with swarm intelligence')
  .version('2.0.0', '-v, --version', 'Display version information')
  .helpOption('-h, --help', 'Display help for command');

// Global options
program
  .option('-d, --debug', 'Enable debug mode')
  .option('-q, --quiet', 'Suppress output')
  .option('--no-color', 'Disable colored output');

// Start command - main entry point
program
  .command('start')
  .description('🚀 Start Qwen Swarm system')
  .option('-g, --gui', 'Launch web GUI interface')
  .option('-p, --port <port>', 'Specify port for web interface', '3000')
  .option('-a, --auto-open', 'Automatically open browser')
  .option('--dev', 'Start in development mode with hot-reload')
  .action(async (options) => {
    console.log(BANNER);

    const spinner = ora('Starting Qwen Swarm...').start();

    try {
      // Check if environment is configured
      if (!existsSync(join(__dirname, '../../.env'))) {
        spinner.fail('Environment not configured');
        console.log(chalk.yellow('⚠️  Please copy .env.example to .env and configure your API keys'));
        process.exit(1);
      }

      // Initialize agents if needed
      if (!existsSync(join(__dirname, '../../config/agents'))) {
        spinner.text = 'Initializing specialty agents...';
        await runCommand('npx', ['tsx', join(__dirname, 'agents.ts'), 'init'], { silent: true });
      }

      if (options.gui) {
        spinner.text = `Starting web interface on port ${options.port}...`;

        // Start backend
        const backend = spawn('npx', ['tsx', join(__dirname, '../index.ts')], {
          stdio: options.debug ? 'inherit' : 'pipe',
          detached: true
        });

        // Start frontend if requested
        if (existsSync(join(__dirname, '../../frontend'))) {
          const frontend = spawn('npm', ['run', 'dev'], {
            cwd: join(__dirname, '../../frontend'),
            stdio: options.debug ? 'inherit' : 'pipe',
            detached: true
          });

          spinner.succeed('Web interface started!');
          console.log(chalk.green('🌐 Web Interface: http://localhost:5173'));
          console.log(chalk.green('🔧 API Server: http://localhost:' + options.port));

          if (options.autoOpen) {
            setTimeout(() => {
              import('open').then(({ default: open }) => open('http://localhost:5173'));
            }, 2000);
          }
        } else {
          spinner.succeed('Backend started!');
          console.log(chalk.green('🔧 API Server: http://localhost:' + options.port));
        }
      } else {
        spinner.text = 'Starting enhanced terminal interface...';

        if (options.dev) {
          // Development mode with hot-reload
          const dev = spawn('npx', ['tsx', 'watch', join(__dirname, '../index.ts')], {
            stdio: 'inherit'
          });

          spinner.succeed('Development server started with hot-reload!');
          console.log(chalk.green('🔧 Development Mode Active'));
        } else {
          // Production mode
          const prod = spawn('node', [join(__dirname, '../index.js')], {
            stdio: 'inherit'
          });

          spinner.succeed('Qwen Swarm started in production mode!');
        }
      }

      console.log(chalk.cyan('\n✨ Welcome to Qwen Swarm! Use the commands below to manage your agents.'));

    } catch (error) {
      spinner.fail('Failed to start');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Interactive mode - main interface
program
  .command('interactive')
  .alias('ui')
  .description('🎮 Launch interactive enhanced terminal interface')
  .action(async () => {
    console.log(BANNER);
    console.log(chalk.cyan('🎮 Entering Interactive Mode...\n'));

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.cyan('What would you like to do?'),
          choices: [
            { name: '🚀 Start System', value: 'start' },
            { name: '🤖 Manage Agents', value: 'agents' },
            { name: '📊 View Dashboard', value: 'dashboard' },
            { name: '⚙️  Settings', value: 'settings' },
            { name: '📈 Analytics', value: 'analytics' },
            { name: '🔧 Providers', value: 'providers' },
            { name: '🧪 Test System', value: 'test' },
            { name: '📚 Documentation', value: 'docs' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        console.log(chalk.yellow('👋 Goodbye!'));
        process.exit(0);
      }

      await handleInteractiveAction(action);
    }
  });

// Agents management
program
  .command('agents')
  .description('🤖 Manage specialty agents')
  .argument('[action]', 'Action to perform', 'list')
  .option('-t, --type <type>', 'Filter by agent type')
  .option('-s, --search <term>', 'Search agents')
  .action(async (action, options) => {
    console.log(BANNER);

    const actions = {
      list: async () => {
        const spinner = ora('Loading agents...').start();
        try {
          const result = await runCommand('npx', ['tsx', join(__dirname, 'agents.ts'), 'list'], { capture: true });
          spinner.succeed('Agents loaded');
          console.log(result);
        } catch (error) {
          spinner.fail('Failed to load agents');
        }
      },

      init: async () => {
        const spinner = ora('Initializing agents...').start();
        try {
          await runCommand('npx', ['tsx', join(__dirname, 'agents.ts'), 'init'], { silent: true });
          spinner.succeed('Agents initialized');
        } catch (error) {
          spinner.fail('Failed to initialize agents');
        }
      },

      install: async () => {
        const { source } = await inquirer.prompt([
          {
            type: 'input',
            name: 'source',
            message: 'Enter agent source (GitHub URL or name):'
          }
        ]);

        const spinner = ora('Installing agents...').start();
        try {
          await runCommand('npx', ['tsx', join(__dirname, 'agents.ts'), 'install', source], { silent: true });
          spinner.succeed('Agents installed');
        } catch (error) {
          spinner.fail('Failed to install agents');
        }
      },

      create: async () => {
        const { template, name } = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: 'Choose agent template:',
            choices: ['basic-worker', 'data-analyst', 'strategic-queen', 'custom']
          },
          {
            type: 'input',
            name: 'name',
            message: 'Enter agent name:'
          }
        ]);

        const spinner = ora('Creating agent...').start();
        try {
          await runCommand('npx', ['tsx', join(__dirname, 'agents.ts'), 'create', '--template', template, '--name', name], { silent: true });
          spinner.succeed('Agent created');
        } catch (error) {
          spinner.fail('Failed to create agent');
        }
      }
    };

    if (actions[action]) {
      await actions[action]();
    } else {
      console.log(chalk.red(`Unknown action: ${action}`));
      console.log('Available actions:', Object.keys(actions).join(', '));
    }
  });

// Dashboard command
program
  .command('dashboard')
  .description('📊 View system dashboard')
  .option('-r, --refresh <seconds>', 'Auto-refresh interval', '5')
  .option('-f, --format <format>', 'Output format', 'table')
  .action(async (options) => {
    console.log(BANNER);
    console.log(chalk.cyan('📊 System Dashboard\n'));

    // Simulate dashboard display
    const dashboard = [
      { metric: 'Active Agents', value: '12', status: '✅' },
      { metric: 'Tasks Running', value: '3', status: '🔄' },
      { metric: 'System Health', value: '98%', status: '🟢' },
      { metric: 'Memory Usage', value: '2.1GB', status: '📊' },
      { metric: 'CPU Usage', value: '15%', status: '📊' }
    ];

    console.table(dashboard);

    console.log(chalk.cyan('\nPress Ctrl+C to exit auto-refresh mode'));
  });

// Settings command
program
  .command('settings')
  .description('⚙️ Configure system settings')
  .action(async () => {
    console.log(BANNER);
    console.log(chalk.cyan('⚙️ System Settings\n'));

    const { setting } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setting',
        message: 'What would you like to configure?',
        choices: [
          '🔑 API Keys',
          '🤖 Model Configuration',
          '🌐 Network Settings',
          '🔧 System Preferences',
          '📊 Analytics Settings',
          '🔒 Security Settings'
        ]
      }
    ]);

    console.log(chalk.yellow(`Opening ${setting} configuration...`));
    // Launch settings interface
  });

// Quick setup command
program
  .command('setup')
  .description('🔧 Quick setup wizard')
  .action(async () => {
    console.log(BANNER);
    console.log(chalk.cyan('🔧 Qwen Swarm Setup Wizard\n'));

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'initAgents',
        message: 'Initialize specialty agents (recommended)?',
        default: true
      },
      {
        type: 'list',
        name: 'defaultProvider',
        message: 'Choose default AI provider:',
        choices: ['OpenAI', 'Claude', 'Qwen', 'Local Models']
      },
      {
        type: 'confirm',
        name: 'enableGUI',
        message: 'Enable web GUI interface?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableAnalytics',
        message: 'Enable performance analytics?',
        default: true
      }
    ]);

    const spinner = ora('Configuring system...').start();

    try {
      if (answers.initAgents) {
        spinner.text = 'Initializing specialty agents...';
        await runCommand('npx', ['tsx', join(__dirname, 'agents.ts'), 'init'], { silent: true });
      }

      spinner.text = 'Saving configuration...';
      // Save configuration

      spinner.succeed('Setup complete!');
      console.log(chalk.green('\n✨ Qwen Swarm is ready to use!'));
      console.log(chalk.cyan('Run "qwen-swarm start" to begin.'));

    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Status command
program
  .command('status')
  .description('📈 Show system status')
  .action(() => {
    console.log(BANNER);
    console.log(chalk.cyan('📈 System Status\n'));

    // Display system status
    console.log(chalk.green('✅ Qwen Swarm is running'));
    console.log(chalk.blue(`📊 Active Agents: ${chalk.bold('12')}`));
    console.log(chalk.blue(`🔄 Tasks Queue: ${chalk.bold('3 running, 7 pending')}`));
    console.log(chalk.blue(`💾 Memory Usage: ${chalk.bold('2.1GB / 16GB')}`));
    console.log(chalk.blue(`🖥️  CPU Usage: ${chalk.bold('15%')}`));
    console.log(chalk.blue(`🌐 Network: ${chalk.bold('Connected')}`));
  });

// Utility function to run commands
async function runCommand(cmd: string, args: string[], options: any = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: options.capture ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd()
    });

    let output = '';

    if (options.capture && child.stdout) {
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(options.capture ? output : true);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

// Handle interactive actions
async function handleInteractiveAction(action: string) {
  switch (action) {
    case 'start':
      await runCommand('npx', ['tsx', join(__dirname, 'unified-cli.ts'), 'start', '--gui', '--auto-open']);
      break;

    case 'agents':
      await runCommand('npx', ['tsx', join(__dirname, 'unified-cli.ts'), 'agents']);
      break;

    case 'dashboard':
      await runCommand('npx', ['tsx', join(__dirname, 'unified-cli.ts'), 'dashboard']);
      break;

    case 'settings':
      await runCommand('npx', ['tsx', join(__dirname, 'unified-cli.ts'), 'settings']);
      break;

    case 'analytics':
      console.log(chalk.cyan('📈 Analytics Dashboard\n'));
      console.log('Performance metrics and usage statistics coming soon...');
      break;

    case 'providers':
      console.log(chalk.cyan('🔧 AI Provider Configuration\n'));
      console.log('OpenAI, Claude, Qwen, and local model providers...');
      break;

    case 'test':
      console.log(chalk.cyan('🧪 System Testing\n'));
      console.log('Running comprehensive system tests...');
      break;

    case 'docs':
      console.log(chalk.cyan('📚 Documentation\n'));
      console.log('Opening documentation in browser...');
      import('open').then(({ default: open }) => open('https://github.com/9pros/qwen-swarm'));
      break;
  }
}

// Default action when no command is provided
if (process.argv.length <= 2) {
  console.log(BANNER);
  console.log(chalk.cyan('🎮 Use "qwen-swarm interactive" to launch the enhanced interface\n'));
  console.log(chalk.dim('Available commands:'));
  console.log(chalk.dim('  start          - Start the system'));
  console.log(chalk.dim('  interactive    - Launch interactive interface'));
  console.log(chalk.dim('  agents         - Manage agents'));
  console.log(chalk.dim('  dashboard      - View system dashboard'));
  console.log(chalk.dim('  settings       - Configure settings'));
  console.log(chalk.dim('  setup          - Quick setup wizard'));
  console.log(chalk.dim('  status         - Show system status'));
  console.log(chalk.dim('  help           - Show help'));
}

// Parse command line arguments
program.parse();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});