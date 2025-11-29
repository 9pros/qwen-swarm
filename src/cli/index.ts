#!/usr/bin/env node

import { CLICommands } from '../integration/cli-commands';
import { CLIGUIBridge } from '../integration/cli-gui-bridge';
import { ConfigSync } from '../integration/config-sync';
import { IPCBridge } from '../integration/ipc-bridge';
import { Logger } from '../utils/logger';

const logger = new Logger().withContext({ component: 'CLI' });

async function main(): Promise<void> {
  try {
    // Initialize all integration components
    const bridge = new CLIGUIBridge();
    const configSync = new ConfigSync();
    const ipcBridge = new IPCBridge();

    // Initialize all components
    await Promise.all([
      bridge.initialize(),
      configSync.initialize(),
      ipcBridge.initialize()
    ]);

    // Create and setup CLI commands
    const cliCommands = new CLICommands(bridge);
    const program = cliCommands.createProgram();

    // Setup integration between components
    setupComponentIntegration(bridge, configSync, ipcBridge);

    // Parse and execute CLI command
    await program.parseAsync(process.argv);

    // If no command was provided, show help
    if (!process.argv.slice(2).length) {
      program.outputHelp();
    }

  } catch (error) {
    logger.error('CLI execution failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

/**
 * Setup integration between all components
 */
function setupComponentIntegration(
  bridge: CLIGUIBridge,
  configSync: ConfigSync,
  ipcBridge: IPCBridge
): void {
  // Bridge to IPC integration
  bridge.on('process:started', (status) => {
    ipcBridge.broadcast({
      type: 'process:started',
      payload: status
    });
  });

  bridge.on('process:stopped', (status) => {
    ipcBridge.broadcast({
      type: 'process:stopped',
      payload: status
    });
  });

  bridge.on('process:error', (status) => {
    ipcBridge.broadcast({
      type: 'process:error',
      payload: status
    });
  });

  // Config sync to IPC integration
  configSync.on('config:changed', (items) => {
    ipcBridge.broadcast({
      type: 'config:changed',
      payload: { items }
    });
  });

  // IPC to bridge integration (handle remote commands)
  ipcBridge.on('message:received', async (message) => {
    if (message.type === 'process:command') {
      const { action, processId } = message.payload;

      try {
        switch (action) {
          case 'start':
            await bridge.startProcess(processId);
            break;
          case 'stop':
            await bridge.stopProcess(processId);
            break;
          case 'restart':
            await bridge.restartProcess(processId);
            break;
        }

        // Send response back
        if (message.expectsResponse && message.source) {
          await ipcBridge.sendToClient(message.source, {
            type: 'process:command:response',
            target: message.source,
            payload: { success: true, action, processId },
            responseTo: message.id
          });
        }
      } catch (error) {
        // Send error response back
        if (message.expectsResponse && message.source) {
          await ipcBridge.sendToClient(message.source, {
            type: 'process:command:response',
            target: message.source,
            payload: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              action,
              processId
            },
            responseTo: message.id
          });
        }
      }
    }

    if (message.type === 'config:command') {
      const { action, key, value } = message.payload;

      try {
        switch (action) {
          case 'get':
            const configValue = configSync.get(key);
            if (message.expectsResponse && message.source) {
              await ipcBridge.sendToClient(message.source, {
                type: 'config:command:response',
                target: message.source,
                payload: { key, value: configValue },
                responseTo: message.id
              });
            }
            break;
          case 'set':
            await configSync.set(key, value, 'gui');
            break;
        }
      } catch (error) {
        if (message.expectsResponse && message.source) {
          await ipcBridge.sendToClient(message.source, {
            type: 'config:command:response',
            target: message.source,
            payload: {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            },
            responseTo: message.id
          });
        }
      }
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down CLI integration components');
    await Promise.all([
      bridge.shutdown ? bridge.shutdown() : Promise.resolve(),
      configSync.cleanup(),
      ipcBridge.shutdown()
    ]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.critical('Unhandled rejection', new Error(String(reason)), { promise });
});

if (require.main === module) {
  main().catch((error) => {
    logger.critical('Fatal error', error);
    process.exit(1);
  });
}

export { CLICommands, CLIGUIBridge, ConfigSync, IPCBridge };