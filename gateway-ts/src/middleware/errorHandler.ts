import { Request, Response, NextFunction } from 'express';
import logger from '@core/logger';
import { GatewayError, ValidationError } from '@core/errors';
import { ErrorResponse } from '@models/chaincode';

export const errorHandler =
  () => (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const timestamp = new Date().toISOString();

    if (err instanceof GatewayError) {
      logger.error(`${err.name}: ${err.message}`, {
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
      });

      const response: ErrorResponse = {
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
        timestamp,
      };

      return res.status(err.statusCode).json(response);
    }

    if (err instanceof ValidationError) {
      logger.warn(`Validation Error: ${err.message}`, err.details);

      const response: ErrorResponse = {
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
        timestamp,
      };

      return res.status(err.statusCode).json(response);
    }

    // Unknown error
    logger.error(`Unexpected error: ${err.message}`, { stack: err.stack });

    const response: ErrorResponse = {
      success: false,
      error: 'Internal server error',
      timestamp,
    };

    return res.status(500).json(response);
  };
