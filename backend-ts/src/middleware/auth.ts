import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '@core/errors';
import RBACService from '@services/rbacService';
import logger from '@core/logger';
import { jwtService } from '@services/auth/JwtService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    sub: string;
    username: string;
    email: string;
    role: string;
    is_superuser: boolean;
    organization_id?: string;
    roles?: Array<{
      id: string;
      name: string;
    }>;
    iat: number;
    exp: number;
  };
}

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Use JwtService for RS256 verification
    const decoded = await jwtService.verifyToken(token);

    // Ensure id is set
    if (!decoded.id) {
      decoded.id = decoded.sub;
    }

    // Load user roles from database using RBACService
    try {
      const roles = await RBACService.getUserRoles(decoded.id);
      decoded.roles = roles.map((r) => ({
        id: r.id,
        name: r.name,
      }));

      logger.debug('Roles loaded from database', {
        userId: decoded.id,
        roles: decoded.roles.map((r) => r.name),
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('Failed to load roles from database', {
          userId: decoded.id,
          error: error.message,
        });
      }
      // Continue without roles if database lookup fails
      decoded.roles = [];
    }

    req.user = decoded as unknown as {
      id: string;
      sub: string;
      username: string;
      email: string;
      role: string;
      is_superuser: boolean;
      organization_id?: string;
      roles?: Array<{
        id: string;
        name: string;
      }>;
      iat: number;
      exp: number;
    };
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else if (error instanceof Error && (error.message === 'Token verification failed' || error.message === 'Signing key not found')) {
      next(new AuthenticationError('Invalid token'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Use JwtService for RS256 verification
      const decoded = await jwtService.verifyToken(token);

      // Ensure id is set
      if (!decoded.id) {
        decoded.id = decoded.sub;
      }

      // Load user roles from database using RBACService
      try {
        const roles = await RBACService.getUserRoles(decoded.id);
        decoded.roles = roles.map((r) => ({
          id: r.id,
          name: r.name,
        }));

        logger.debug('Roles loaded from database (optional)', {
          userId: decoded.id,
          roles: decoded.roles.map((r) => r.name),
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.warn('Failed to load roles from database (optional)', {
            userId: decoded.id,
            error: error.message,
          });
        }
        decoded.roles = [];
      }

      req.user = decoded as unknown as {
        id: string;
        sub: string;
        username: string;
        email: string;
        role: string;
        is_superuser: boolean;
        organization_id?: string;
        roles?: Array<{
          id: string;
          name: string;
        }>;
        iat: number;
        exp: number;
      };
    }

    next();
  } catch {
    // Optional auth, so we don't throw error here
    next();
  }
};
