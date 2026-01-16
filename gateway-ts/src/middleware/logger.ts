import { Request, Response, NextFunction } from 'express';
import logger from '@core/logger';

export const requestLogger = () => (req: Request, _res: Response, next: NextFunction) => {
  const startTime = Date.now();

  const originalSend = _res.send;

  _res.send = function (data) {
    const duration = Date.now() - startTime;

    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: _res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });

    return originalSend.call(this, data);
  };

  next();
};
