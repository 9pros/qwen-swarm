import { Router } from 'express';
import type { SwarmOrchestrator } from '@/types';

export function systemRouter(orchestrator: SwarmOrchestrator): Router {
  const router = Router();

  router.get('/state', async (req, res) => {
    try {
      const state = orchestrator.getSystemState();
      res.json({
        state,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get system state',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.get('/health', async (req, res) => {
    try {
      const health = await orchestrator.getSystemHealth();
      res.json({
        health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get system health',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.get('/metrics', async (req, res) => {
    try {
      const providerMetrics = orchestrator.getProviderMetrics();
      const communicationMetrics = orchestrator.getCommunicationMetrics();
      const consensusMetrics = orchestrator.getConsensusMetrics();

      const metrics = {
        providers: Object.fromEntries(providerMetrics),
        communication: communicationMetrics,
        consensus: consensusMetrics,
        process: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        },
        timestamp: new Date().toISOString()
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get system metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  return router;
}