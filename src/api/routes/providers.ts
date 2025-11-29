import { Router } from 'express';
import type { SwarmOrchestrator } from '@/types';

export function providersRouter(orchestrator: SwarmOrchestrator): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const metrics = orchestrator.getProviderMetrics();
      res.json({
        providers: Object.fromEntries(metrics),
        total: metrics.size,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get providers',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.get('/:providerId', async (req, res) => {
    try {
      const { providerId } = req.params;
      const metrics = orchestrator.getProviderMetrics();
      const providerMetrics = metrics.get(providerId);

      if (!providerMetrics) {
        return res.status(404).json({
          error: 'Provider not found',
          providerId,
          requestId: req.id
        });
      }

      res.json(providerMetrics);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get provider',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  return router;
}