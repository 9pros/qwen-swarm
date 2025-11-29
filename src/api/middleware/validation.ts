import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Logger } from '@/utils/logger';

const logger = new Logger().withContext({ component: 'ValidationMiddleware' });

export function validationMiddleware(req: Request, res: Response, next: NextFunction) {
  const genericRequestSchema = z.object({
    body: z.any().optional(),
    query: z.record(z.any()).optional(),
    params: z.record(z.any()).optional()
  });

  try {
    genericRequestSchema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (req.body && typeof req.body === 'object') {
      const maxSize = 10 * 1024 * 1024;
      const size = Buffer.byteLength(JSON.stringify(req.body), 'utf8');

      if (size > maxSize) {
        return res.status(413).json({
          error: 'Payload Too Large',
          message: 'Request body exceeds maximum size limit',
          requestId: req.id
        });
      }
    }

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors,
        requestId: req.id
      });
    }

    logger.error('Validation middleware error', error instanceof Error ? error : new Error(String(error)));
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid request format',
      requestId: req.id
    });
  }
}