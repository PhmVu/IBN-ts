import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@core/errors';

export interface ValidatedRequest extends Request {
  validatedBody?: unknown;
  validatedParams?: unknown;
  validatedQuery?: unknown;
}

export function validateBody(schema: z.ZodSchema) {
  return (req: ValidatedRequest, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(new ValidationError('Request body validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: ValidatedRequest, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.validatedParams = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(new ValidationError('URL parameters validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: ValidatedRequest, _res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );
        next(new ValidationError('Query parameters validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
