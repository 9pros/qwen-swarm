import { SwarmOrchestrator } from '@/core/orchestrator';
import { APIServer } from '@/api/server';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const logger = new Logger().withContext({ component: 'Main' });

async function main(): Promise<void> {
  try {
    logger.info('Starting Qwen Swarm Orchestration System');

    const configManager = new ConfigManager();
    const config = configManager.getSystemConfig();

    logger.info('Configuration loaded', {
      name: config.system.name,
      version: config.system.version,
      environment: config.system.environment
    });

    const orchestrator = new SwarmOrchestrator(config);
    await orchestrator.initialize();

    const apiServer = new APIServer(orchestrator, config);
    await apiServer.start();

    orchestrator.on('system:error', (error) => {
      logger.critical('System error', error);
    });

    orchestrator.on('health:changed', (health) => {
      logger.info('System health changed', {
        overall: health.overall,
        components: health.components.length
      });
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await shutdown(orchestrator, apiServer);
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await shutdown(orchestrator, apiServer);
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      logger.critical('Uncaught exception', error);
      shutdown(orchestrator, apiServer).then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.critical('Unhandled rejection', new Error(String(reason)), { promise });
    });

    logger.info('Qwen Swarm Orchestration System started successfully', {
      apiPort: config.api.port,
      wsPort: config.websocket.port,
      environment: config.system.environment
    });

  } catch (error) {
    logger.critical('Failed to start system', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

async function shutdown(orchestrator: SwarmOrchestrator, apiServer: APIServer): Promise<void> {
  try {
    logger.info('Initiating graceful shutdown');

    await apiServer.stop();
    await orchestrator.shutdown();

    logger.info('Graceful shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.critical('Fatal error', error);
    process.exit(1);
  });
}

export { SwarmOrchestrator, APIServer, ConfigManager };