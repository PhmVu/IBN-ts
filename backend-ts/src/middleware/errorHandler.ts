import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '@core/errors';
import logger from '@core/logger';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
}

export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;

    if (error instanceof ValidationError) {
      details = error.details;
    }
  } else if (error instanceof Error) {
    message = error.message;
    logger.error('Unhandled error', { error: error.toString(), stack: error.stack });
  }

  const errorObj: ErrorResponse['error'] = {
    code,
    message,
  };

  if (details) {
    errorObj.details = details;
  }

  const response: ErrorResponse = {
    error: errorObj,
    timestamp: new Date().toISOString(),
    path: _req.path,
  };

  res.status(statusCode).json(response);
};

export class AsyncWrapper {
  static wrap(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
