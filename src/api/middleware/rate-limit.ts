import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/logger';

const logger = new Logger().withContext({ component: 'RateLimitMiddleware' });

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(config: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let rateLimitData = rateLimitStore.get(key);

    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = {
        count: 0,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(key, rateLimitData);
    }

    rateLimitData.count++;

    if (rateLimitData.count > config.max) {
      logger.warn('Rate limit exceeded', { ip: req.ip, count: rateLimitData.count });
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
        requestId: req.id
      });
    }

    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - rateLimitData.count));
    res.setHeader('X-RateLimit-Reset', rateLimitData.resetTime);

    next();
  };
}