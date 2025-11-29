import { Router } from 'express';
import { z } from 'zod';
import type { SwarmOrchestrator, AgentConfig } from '@/types';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['queen', 'worker', 'specialist']),
  role: z.object({
    type: z.enum(['strategic', 'tactical', 'operational', 'analytical', 'creative']),
    permissions: z.array(z.string()).default([]),
    expertise: z.array(z.string()).default([]),
    priority: z.number().min(1).max(10)
  }),
  provider: z.object({
    type: z.enum(['qwen', 'openai', 'claude', 'local', 'custom']),
    model: z.string(),
    maxTokens: z.number().min(1).max(100000),
    temperature: z.number().min(0).max(2),
    timeout: z.number().min(1000)
  }),
  capabilities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    enabled: z.boolean(),
    configuration: z.record(z.unknown())
  })).default([]),
  maxConcurrency: z.number().min(1).max(100).default(5),
  memorySize: z.number().min(1000).default(10000),
  autoScale: z.boolean().default(true)
});

export function agentsRouter(orchestrator: SwarmOrchestrator): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const agents = orchestrator.getAgentStates();
      res.json({
        agents,
        total: agents.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get agents',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.get('/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const agents = orchestrator.getAgentStates();
      const agent = agents.find(a => a.id === agentId);

      if (!agent) {
        return res.status(404).json({
          error: 'Agent not found',
          agentId,
          requestId: req.id
        });
      }

      res.json(agent);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get agent',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validatedData = createAgentSchema.parse(req.body);
      const agentConfig: AgentConfig = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...validatedData,
        healthCheckInterval: 30000,
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          initialDelay: 1000,
          maxDelay: 10000,
          retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', 'RATE_LIMIT']
        },
        securityContext: {
          encryptionEnabled: false,
          authenticationRequired: true,
          allowedOrigins: ['*'],
          permissions: [],
          auditEnabled: true
        }
      };

      const agentId = await orchestrator.registerAgent(agentConfig);
      res.status(201).json({
        agentId,
        message: 'Agent created successfully',
        config: agentConfig
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
          requestId: req.id
        });
      }

      res.status(500).json({
        error: 'Failed to create agent',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.delete('/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { reason } = req.body;

      await orchestrator.unregisterAgent(agentId, reason);
      res.json({
        message: 'Agent unregistered successfully',
        agentId,
        reason
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to unregister agent',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.post('/scale', async (req, res) => {
    try {
      const { type, targetCount } = req.body;

      if (!['queen', 'worker', 'specialist'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid agent type',
          validTypes: ['queen', 'worker', 'specialist'],
          requestId: req.id
        });
      }

      if (typeof targetCount !== 'number' || targetCount < 0) {
        return res.status(400).json({
          error: 'Invalid target count',
          requestId: req.id
        });
      }

      await orchestrator.scaleAgents(type, targetCount);
      res.json({
        message: 'Agent scaling initiated',
        type,
        targetCount
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to scale agents',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  return router;
}