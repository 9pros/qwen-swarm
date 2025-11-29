import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/logger';

const logger = new Logger().withContext({ component: 'ErrorHandler' });

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', error, {
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Conflict';
  } else if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    message = 'Too Many Requests';
  }

  res.status(statusCode).json({
    error: message,
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
}