import { Request, Response, NextFunction } from 'express';
import logger from '@core/logger';

export interface RequestLog {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log: RequestLog = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    };

    if (res.statusCode < 400) {
      logger.info(`${req.method} ${req.path}`, log);
    } else if (res.statusCode < 500) {
      logger.warn(`${req.method} ${req.path}`, log);
    } else {
      logger.error(`${req.method} ${req.path}`, log);
    }
  });

  next();
};
