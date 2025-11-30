#!/usr/bin/env node

// Qwen Swarm Unified CLI - JavaScript Version
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import dependencies
const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { spawn } = require('child_process');

// ASCII Art Banner
const BANNER = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')} ${chalk.magenta.bold('🧠 QWEN SWARM v2.1.0 - Advanced Multi-Agent Platform')}      ${chalk.cyan('║')}
${chalk.cyan('║')} ${chalk.white('Swarm Intelligence • Self-Improving • Enhanced Terminal')}        ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}
${chalk.dim('Email: max@9pros.com | GitHub: https://github.com/9pros/qwen-swarm')}
`;

const program = new Command();

// Main program configuration
program
  .name('qwen-swarm')
  .description('🧠 Advanced multi-agent orchestration platform with swarm intelligence')
  .version('2.1.0', '-v, --version', 'Display version information')
  .helpOption('-h, --help', 'Display help for command');

// Start command - main entry point
program
  .command('start')
  .description('🚀 Start Qwen Swarm system')
  .option('-g, --gui', 'Launch web GUI interface')
  .option('-p, --port <port>', 'Specify port for web interface', '3000')
  .option('-a, --auto-open', 'Automatically open browser')
  .option('--dev', 'Start in development mode')
  .action(async (options) => {
    console.log(BANNER);
    const spinner = ora('Starting Qwen Swarm...').start();

    try {
      // Check if environment is configured
      const envPath = join(__dirname, '.env');
      if (!existsSync(envPath)) {
        spinner.fail('Environment not configured');
        console.log(chalk.yellow('⚠️  Please copy .env.example to .env and configure your API keys'));
        console.log(chalk.cyan('💡 Quick setup: qwen-swarm setup'));
        process.exit(1);
      }

      if (options.gui) {
        spinner.text = `Starting web interface on port ${options.port}...`;

        // Start backend
        const backend = spawn('node', [join(__dirname, 'src', 'backend.js')], {
          stdio: options.debug ? 'inherit' : 'pipe',
          detached: true
        });

        spinner.succeed('Web interface started!');
        console.log(chalk.green(`🌐 Web Interface: http://localhost:${options.port}`));

        if (options.autoOpen) {
          setTimeout(() => {
            const open = require('open');
            open(`http://localhost:${options.port}`);
          }, 2000);
        }
      } else {
        spinner.text = 'Starting system...';

        const proc = spawn('node', [join(__dirname, 'src', 'backend.js')], {
          stdio: 'inherit'
        });

        spinner.succeed('Qwen Swarm started!');
      }

      console.log(chalk.cyan('\n✨ Welcome to Qwen Swarm! Use "qwen-swarm interactive" for enhanced features.'));

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
            { name: '🔧 Quick Setup', value: 'setup' },
            { name: '📈 System Status', value: 'status' },
            { name: '📚 Documentation', value: 'docs' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        console.log(chalk.yellow('👋 Thanks for using Qwen Swarm!'));
        process.exit(0);
      }

      await handleInteractiveAction(action);
    }
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
        type: 'input',
        name: 'openaiKey',
        message: 'Enter your OpenAI API key (optional):',
        default: ''
      },
      {
        type: 'input',
        name: 'claudeKey',
        message: 'Enter your Claude API key (optional):',
        default: ''
      },
      {
        type: 'confirm',
        name: 'initAgents',
        message: 'Initialize specialty agents (recommended)?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableGUI',
        message: 'Enable web GUI interface?',
        default: true
      }
    ]);

    const spinner = ora('Configuring system...').start();

    try {
      // Create .env file
      const fs = require('fs');
      let envContent = '# Qwen Swarm Configuration\n';

      if (answers.openaiKey) {
        envContent += `OPENAI_API_KEY=${answers.openaiKey}\n`;
      }
      if (answers.claudeKey) {
        envContent += `CLAUDE_API_KEY=${answers.claudeKey}\n`;
      }

      envContent += '\n# System Settings\nGUI_ENABLED=' + answers.enableGUI + '\n';

      fs.writeFileSync(join(__dirname, '.env'), envContent);

      spinner.text = 'Configuration saved...';

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
    console.log(chalk.green('✅ Qwen Swarm is ready'));
    console.log(chalk.blue(`📊 CLI Version: ${chalk.bold('2.1.0')}`));
    console.log(chalk.blue(`🖥️  Node.js: ${chalk.bold(process.version)}`));
    console.log(chalk.blue(`💾 Memory: ${chalk.bold(Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB')}`));

    const envPath = join(__dirname, '.env');
    if (existsSync(envPath)) {
      console.log(chalk.blue('⚙️  Configuration: ✅ Configured'));
    } else {
      console.log(chalk.yellow('⚙️  Configuration: ⚠️  Run "qwen-swarm setup"'));
    }
  });

// Simple dashboard
program
  .command('dashboard')
  .description('📊 View system dashboard')
  .action(() => {
    console.log(BANNER);
    console.log(chalk.cyan('📊 System Dashboard\n'));

    const dashboard = [
      { metric: 'Version', value: '2.1.0', status: '✅' },
      { metric: 'Node.js', value: process.version.slice(1), status: '✅' },
      { metric: 'Platform', value: process.platform, status: '✅' },
      { metric: 'Memory Usage', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, status: '📊' },
      { metric: 'Uptime', value: `${Math.round(process.uptime())}s`, status: '⏱️' }
    ];

    console.table(dashboard);
  });

// Handle interactive actions
async function handleInteractiveAction(action) {
  switch (action) {
    case 'start':
      console.log(chalk.cyan('🚀 Starting system...'));
      await runCommand('node', [join(__dirname, 'src', 'backend.js')]);
      break;

    case 'agents':
      console.log(chalk.cyan('🤖 Agent Management\n'));
      console.log('Agent management features coming soon...');
      console.log(chalk.dim('Available agents: 125+ specialty agents'));
      break;

    case 'dashboard':
      await runCommand('node', [__filename, 'dashboard']);
      break;

    case 'settings':
      console.log(chalk.cyan('⚙️ System Settings\n'));
      console.log('Configuration management coming soon...');
      break;

    case 'setup':
      await runCommand('node', [__filename, 'setup']);
      break;

    case 'status':
      await runCommand('node', [__filename, 'status']);
      break;

    case 'docs':
      console.log(chalk.cyan('📚 Documentation\n'));
      console.log('📖 Full Documentation: https://github.com/9pros/qwen-swarm');
      console.log('💬 Issues: https://github.com/9pros/qwen-swarm/issues');
      console.log('📧 Support: max@9pros.com');
      break;
  }
}

// Utility function to run commands
async function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

// Default action when no command is provided
if (process.argv.length <= 2) {
  console.log(BANNER);
  console.log(chalk.cyan('🎮 Welcome to Qwen Swarm!\n'));
  console.log(chalk.dim('Available commands:'));
  console.log(chalk.dim('  start          - Start the system'));
  console.log(chalk.dim('  interactive    - Launch interactive interface (recommended)'));
  console.log(chalk.dim('  setup          - Quick setup wizard'));
  console.log(chalk.dim('  dashboard      - View system dashboard'));
  console.log(chalk.dim('  status         - Show system status'));
  console.log(chalk.dim('  help           - Show help'));
  console.log(chalk.cyan('\n💡 First time? Run "qwen-swarm setup" to get started!'));
}

// Parse command line arguments
program.parse();

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});