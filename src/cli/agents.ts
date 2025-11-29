#!/usr/bin/env node

/**
 * Qwen Swarm Agent CLI
 *
 * Command-line interface for managing specialty agents
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { agentRegistry } from '../agents/registry/AgentRegistry.js';
import { agentLoader } from '../agents/registry/AgentLoader.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const program = new Command();

program
  .name('qwen-agents')
  .description('Qwen Swarm Agent Management CLI')
  .version('1.0.0');

/**
 * Initialize agent registry
 */
program
  .command('init')
  .description('Initialize the agent registry')
  .option('-f, --force', 'Force reinitialization')
  .action(async (options) => {
    const spinner = ora('Initializing agent registry...').start();

    try {
      await agentRegistry.initialize();
      spinner.succeed('Agent registry initialized successfully');

      const stats = agentRegistry.getStats();
      console.log(chalk.green('\n📊 Registry Statistics:'));
      console.log(`   Total agents: ${stats.totalAgents}`);
      console.log(`   Categories: ${Object.keys(stats.categories).length}`);
      console.log(`   Enabled sources: ${stats.enabledSources}`);

      console.log(chalk.blue('\n📂 Categories:'));
      Object.entries(stats.categories).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} agents`);
      });
    } catch (error) {
      spinner.fail('Failed to initialize agent registry');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * List all available agents
 */
program
  .command('list')
  .description('List available agents')
  .option('-c, --category <category>', 'Filter by category')
  .option('-s, --search <query>', 'Search agents')
  .option('--format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      let agents;

      if (options.search) {
        agents = agentRegistry.searchAgents(options.search);
      } else if (options.category) {
        agents = agentRegistry.getAgentsByCategory(options.category);
      } else {
        agents = agentRegistry.getAllAgents();
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(agents, null, 2));
        return;
      }

      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found'));
        return;
      }

      console.log(chalk.blue(`\n📋 Found ${agents.length} agents:\n`));

      agents.forEach((agent, index) => {
        console.log(chalk.green(`${index + 1}. ${agent.name}`));
        console.log(`   ${chalk.gray(agent.description)}`);
        console.log(`   Category: ${chalk.cyan(agent.category)}`);
        console.log(`   Tools: ${agent.tools.join(', ')}`);
        if (agent.source) {
          console.log(`   Source: ${chalk.magenta(agent.source.repository)}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Get detailed information about an agent
 */
program
  .command('info <name>')
  .description('Get detailed information about an agent')
  .action(async (name) => {
    try {
      const agent = agentRegistry.getAgent(name);

      if (!agent) {
        console.log(chalk.red(`Agent "${name}" not found`));
        return;
      }

      console.log(chalk.blue(`\n🤖 Agent Information: ${agent.name}\n`));
      console.log(chalk.green('Description:'));
      console.log(`   ${agent.description}\n`);

      console.log(chalk.green('Properties:'));
      console.log(`   Name: ${agent.name}`);
      console.log(`   Category: ${chalk.cyan(agent.category)}`);
      console.log(`   Tools: ${agent.tools.join(', ')}\n`);

      if (agent.source) {
        console.log(chalk.green('Source:'));
        console.log(`   Repository: ${chalk.magenta(agent.source.repository)}`);
        console.log(`   Version: ${agent.source.version || 'latest'}\n`);
      }

      if (agent.metadata) {
        console.log(chalk.green('Metadata:'));
        if (agent.metadata.author) {
          console.log(`   Author: ${agent.metadata.author}`);
        }
        if (agent.metadata.license) {
          console.log(`   License: ${agent.metadata.license}`);
        }
        if (agent.metadata.tags && agent.metadata.tags.length > 0) {
          console.log(`   Tags: ${agent.metadata.tags.join(', ')}`);
        }
        if (agent.metadata.lastUpdated) {
          console.log(`   Last Updated: ${agent.metadata.lastUpdated}`);
        }
        console.log();
      }

      if (agent.content) {
        console.log(chalk.green('Content Preview:'));
        const preview = agent.content.substring(0, 500) + (agent.content.length > 500 ? '...' : '');
        console.log(chalk.gray(preview));
        console.log();
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Install an agent from a source
 */
program
  .command('install <url>')
  .description('Install an agent from a URL or local path')
  .option('-c, --category <category>', 'Assign to category')
  .action(async (url, options) => {
    const spinner = ora('Installing agent...').start();

    try {
      await agentRegistry.installAgent(url, options.category);
      spinner.succeed(`Agent installed successfully from ${url}`);
    } catch (error) {
      spinner.fail('Failed to install agent');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Uninstall an agent
 */
program
  .command('uninstall <name>')
  .description('Uninstall an agent')
  .option('-f, --force', 'Force uninstall without confirmation')
  .action(async (name, options) => {
    try {
      if (!options.force) {
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to uninstall agent "${name}"?`,
            default: false
          }
        ]);

        if (!confirmed) {
          console.log(chalk.yellow('Uninstall cancelled'));
          return;
        }
      }

      const spinner = ora(`Uninstalling agent "${name}"...`).start();
      await agentRegistry.uninstallAgent(name);
      spinner.succeed(`Agent "${name}" uninstalled successfully`);
    } catch (error) {
      spinner.fail('Failed to uninstall agent');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Update agent registry
 */
program
  .command('update')
  .description('Update agent registry from remote sources')
  .option('--source <source>', 'Update specific source only')
  .action(async (options) => {
    const spinner = ora('Updating agent registry...').start();

    try {
      if (options.source) {
        // Update specific source
        console.log(`Updating source: ${options.source}`);
      } else {
        // Update all sources
        await agentRegistry.updateFromSources();
      }

      spinner.succeed('Agent registry updated successfully');

      const stats = agentRegistry.getStats();
      console.log(chalk.green('\n📊 Updated Statistics:'));
      console.log(`   Total agents: ${stats.totalAgents}`);
      console.log(`   Categories: ${Object.keys(stats.categories).length}`);
    } catch (error) {
      spinner.fail('Failed to update agent registry');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Search for agents
 */
program
  .command('search <query>')
  .description('Search for agents by name, description, or tags')
  .option('--limit <number>', 'Limit results', '10')
  .action(async (query, options) => {
    try {
      const agents = agentRegistry.searchAgents(query);
      const limitedAgents = agents.slice(0, parseInt(options.limit));

      if (limitedAgents.length === 0) {
        console.log(chalk.yellow(`No agents found for query: "${query}"`));
        return;
      }

      console.log(chalk.blue(`\n🔍 Found ${limitedAgents.length} agents for "${query}":\n`));

      limitedAgents.forEach((agent, index) => {
        console.log(chalk.green(`${index + 1}. ${agent.name}`));
        console.log(`   ${chalk.gray(agent.description)}`);
        console.log(`   Category: ${chalk.cyan(agent.category)}`);
        console.log();
      });

      if (agents.length > limitedAgents.length) {
        console.log(chalk.gray(`... and ${agents.length - limitedAgents.length} more results`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Show registry statistics
 */
program
  .command('stats')
  .description('Show registry statistics')
  .action(async () => {
    try {
      const stats = agentRegistry.getStats();
      const loaderStats = agentLoader.getMetrics();

      console.log(chalk.blue('\n📊 Agent Registry Statistics\n'));

      console.log(chalk.green('Registry:'));
      console.log(`   Total agents: ${stats.totalAgents}`);
      console.log(`   Categories: ${Object.keys(stats.categories).length}`);
      console.log(`   Enabled sources: ${stats.enabledSources}`);
      console.log(`   Last updated: ${new Date(stats.lastUpdated).toLocaleString()}\n`);

      console.log(chalk.green('Categories:'));
      Object.entries(stats.categories)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${chalk.cyan(category)}: ${count} agents`);
        });

      const loadedAgents = agentLoader.getLoadedAgents();
      console.log(chalk.green('\nActive Agents:'));
      console.log(`   Currently loaded: ${loadedAgents.length}`);
      console.log(`   Max concurrent: 10`);

      if (loadedAgents.length > 0) {
        console.log(chalk.green('\nLoaded Agents:'));
        loadedAgents.forEach(agent => {
          console.log(`   ${agent.name} (${agent.id.substring(0, 8)}...) - ${agent.usageCount} uses`);
        });
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Cleanup inactive agents
 */
program
  .command('cleanup')
  .description('Cleanup inactive agents')
  .option('--max-idle <minutes>', 'Maximum idle time in minutes', '10')
  .action(async (options) => {
    const maxIdleTime = parseInt(options.maxIdle) * 60 * 1000;
    const spinner = ora('Cleaning up inactive agents...').start();

    try {
      await agentLoader.cleanupExpiredAgents(maxIdleTime);
      spinner.succeed('Agent cleanup completed');
    } catch (error) {
      spinner.fail('Failed to cleanup agents');
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

/**
 * Registry management commands
 */
const registryCmd = program.command('registry').description('Manage agent registries');

registryCmd
  .command('list')
  .description('List configured registries')
  .action(async () => {
    try {
      const configPath = join(process.cwd(), 'config/agents/default-registries.json');
      const config = JSON.parse(await readFile(configPath, 'utf-8'));

      console.log(chalk.blue('\n📚 Configured Registries:\n'));

      config.registries.forEach((registry: any, index: number) => {
        console.log(chalk.green(`${index + 1}. ${registry.name}`));
        console.log(`   URL: ${registry.url}`);
        console.log(`   Type: ${registry.type}`);
        console.log(`   Status: ${registry.enabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
        if (registry.description) {
          console.log(`   Description: ${registry.description}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

registryCmd
  .command('add <name> <url>')
  .description('Add a new registry')
  .option('-t, --type <type>', 'Registry type (github|local|remote)', 'github')
  .action(async (name, url, options) => {
    try {
      const configPath = join(process.cwd(), 'config/agents/default-registries.json');
      const config = JSON.parse(await readFile(configPath, 'utf-8'));

      config.registries.push({
        name,
        url,
        type: options.type,
        enabled: true,
        description: `Custom registry: ${name}`
      });

      await writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`Registry "${name}" added successfully`));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Handle invalid commands
program.on('command:*', () => {
  console.error(chalk.red('Invalid command:'), program.args.join(' '));
  console.log('See --help for a list of available commands.');
  process.exit(1);
});