import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '@core/errors';
import logger from '@core/logger';

export const validateRequest =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      logger.warn('Validation error', { error: error.message });
      const validationError = new ValidationError('Request validation failed', error.errors);
      next(validationError);
    }
  };

export const validateParams =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error: any) {
      logger.warn('Param validation error', { error: error.message });
      const validationError = new ValidationError('Parameter validation failed', error.errors);
      next(validationError);
    }
  };
