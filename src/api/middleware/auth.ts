import { Request, Response, NextFunction } from 'express';
import type { SecurityContext } from '@/types';
import { Logger } from '@/utils/logger';

const logger = new Logger().withContext({ component: 'AuthMiddleware' });

export function authMiddleware(securityConfig: SecurityContext, orchestrator: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!securityConfig.authenticationRequired) {
      req.user = {
        id: 'anonymous',
        sessionId: 'anonymous',
        permissions: ['*']
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    const agentHeader = req.headers['x-agent-id'];
    const sessionHeader = req.headers['x-session-id'];

    if (agentHeader && sessionHeader) {
      req.user = {
        id: agentHeader as string,
        sessionId: sessionHeader as string,
        permissions: ['agent:*']
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        requestId: req.id
      });
    }

    const token = authHeader.substring(7);

    try {
      const securityManager = (orchestrator as any).securityManager;
      const tokenData = securityManager.validateToken(token);

      if (!tokenData) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          requestId: req.id
        });
      }

      req.user = {
        id: tokenData.userId,
        sessionId: tokenData.sessionId,
        permissions: ['user:*']
      };

      next();
    } catch (error) {
      logger.error('Authentication error', error instanceof Error ? error : new Error(String(error)));
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication failed',
        requestId: req.id
      });
    }
  };
}