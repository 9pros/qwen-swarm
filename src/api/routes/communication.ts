import { Router } from 'express';
import type { SwarmOrchestrator, MessageType, MessagePriority } from '@/types';

export function communicationRouter(orchestrator: SwarmOrchestrator): Router {
  const router = Router();

  router.get('/metrics', async (req, res) => {
    try {
      const metrics = orchestrator.getCommunicationMetrics();
      res.json({
        metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get communication metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.post('/message', async (req, res) => {
    try {
      const { to, type, payload, priority = MessagePriority.NORMAL, options = {} } = req.body;

      if (!to || !type || payload === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: to, type, payload',
          requestId: req.id
        });
      }

      const communicationManager = (orchestrator as any).communicationManager;
      const messageId = await communicationManager.sendMessage(
        to,
        type,
        payload,
        priority,
        options
      );

      res.status(201).json({
        messageId,
        message: 'Message sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.post('/broadcast', async (req, res) => {
    try {
      const { type, payload, priority = MessagePriority.NORMAL, excludeSelf = true } = req.body;

      if (!type || payload === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: type, payload',
          requestId: req.id
        });
      }

      const communicationManager = (orchestrator as any).communicationManager;
      const recipientIds = await communicationManager.broadcastMessage(
        type,
        payload,
        priority,
        excludeSelf
      );

      res.status(201).json({
        message: 'Broadcast sent successfully',
        recipientCount: recipientIds.length,
        recipientIds
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to send broadcast',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  return router;
}