import { Router } from 'express';
import { z } from 'zod';
import type { SwarmOrchestrator, Task, TaskPriority } from '@/types';

const createTaskSchema = z.object({
  type: z.string(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.NORMAL),
  payload: z.any(),
  dependencies: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({})
});

export function tasksRouter(orchestrator: SwarmOrchestrator): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const state = orchestrator.getSystemState();
      res.json({
        taskQueue: state.metrics.taskQueue,
        activeTasks: state.agents.reduce((sum, agent) => sum + agent.currentTasks.length, 0),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get tasks',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const validatedData = createTaskSchema.parse(req.body);
      const task: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...validatedData,
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0
      };

      const taskId = await orchestrator.submitTask(task);
      res.status(201).json({
        taskId,
        message: 'Task submitted successfully',
        task
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
        error: 'Failed to submit task',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id
      });
    }
  });

  return router;
}