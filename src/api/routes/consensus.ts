import { Router } from 'express';
import type { SwarmOrchestrator, ConsensusType } from '@/types';

export function consensusRouter(orchestrator: SwarmOrchestrator): Router {
  const router = Router();

  router.get('/metrics', async (req, res) => {
    try {
      const metrics = orchestrator.getConsensusMetrics();
      res.json({
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get consensus metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.post('/proposal', async (req, res) => {
    try {
      const { type, payload, options = {} } = req.body;

      if (!Object.values(ConsensusType).includes(type)) {
        return res.status(400).json({
          error: 'Invalid consensus type',
          validTypes: Object.values(ConsensusType),
          requestId: req.id
        });
      }

      const consensusManager = (orchestrator as any).consensusManager;
      const proposalId = await consensusManager.createProposal(
        req.user!.id,
        type,
        payload,
        options
      );

      res.status(201).json({
        proposalId,
        message: 'Consensus proposal created successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create consensus proposal',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  return router;
}