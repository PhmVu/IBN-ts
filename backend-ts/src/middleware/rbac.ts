import { Request, Response, NextFunction } from 'express';
import RBACService from '../services/rbacService';
import logger from '../core/logger';

/**
 * RBAC Middleware - Permission and Role checking
 * 
 * Provides middleware factories for:
 * - Permission checking (resource:action)
 * - Role checking (specific or any of multiple)
 */

/**
 * Extend Express Request to include user with roles
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role?: string;
        is_superuser: boolean;
        organization_id?: string;
        roles?: Array<{
          id: string;
          name: string;
        }>;
      };
    }
  }
}

/**
 * Middleware factory: Check if user has specific permission
 * 
 * Usage:
 * app.post('/api/users', requirePermission('users', 'create'), handler)
 * 
 * @param resource - Resource name (e.g., 'users', 'channels')
 * @param action - Action name (e.g., 'create', 'read', 'update', 'delete')
 * @returns Express middleware
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verify user is authenticated
      if (!req.user || !req.user.id) {
        logger.warn('Permission check: User not authenticated', {
          path: req.path,
          method: req.method,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      // SuperAdmin bypass based on JWT claims
      if (req.user.is_superuser || req.user.role === 'SuperAdmin') {
        logger.debug('Permission granted via SuperAdmin bypass', {
          userId: req.user.id,
          resource,
          action,
          path: req.path,
        });
        return next();
      }

      const userId = req.user.id;
      const resourceOrgId = req.body?.organization_id || req.query?.organization_id || req.user.organization_id;

      // Check permission using RBACService
      const allowed = await RBACService.checkPermission(
        userId,
        resource,
        action,
        resourceOrgId as string
      );

      if (!allowed) {
        logger.warn('Permission denied', {
          userId,
          resource,
          action,
          path: req.path,
          method: req.method,
          userRoles: req.user.roles?.map((r) => r.name),
        });

        res.status(403).json({
          error: 'Forbidden',
          message: `Permission denied: ${resource}:${action}`,
        });
        return;
      }

      logger.debug('Permission granted', {
        userId,
        resource,
        action,
        path: req.path,
      });

      next();
    } catch (error: any) {
      logger.error('Error in requirePermission middleware', {
        error: error.message,
        resource,
        action,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check permission',
      });
    }
  };
};

/**
 * Middleware factory: Check if user has specific role
 * 
 * Usage:
 * app.delete('/api/users/:id', requireRole('SuperAdmin'), handler)
 * 
 * @param roleName - Role name (e.g., 'SuperAdmin', 'OrgAdmin')
 * @returns Express middleware
 */
export const requireRole = (roleName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verify user is authenticated
      if (!req.user || !req.user.id) {
        logger.warn('Role check: User not authenticated', {
          path: req.path,
          method: req.method,
          requiredRole: roleName,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const userId = req.user.id;

      // Check role using RBACService
      const hasRole = await RBACService.hasRole(userId, roleName);

      if (!hasRole) {
        logger.warn('Role check failed', {
          userId,
          requiredRole: roleName,
          path: req.path,
          method: req.method,
          userRoles: req.user.roles?.map((r) => r.name),
        });

        res.status(403).json({
          error: 'Forbidden',
          message: `Role required: ${roleName}`,
        });
        return;
      }

      logger.debug('Role check passed', {
        userId,
        role: roleName,
        path: req.path,
      });

      next();
    } catch (error: any) {
      logger.error('Error in requireRole middleware', {
        error: error.message,
        roleName,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check role',
      });
    }
  };
};

/**
 * Middleware factory: Check if user has any of specified roles
 * 
 * Usage:
 * app.get('/api/audit', requireAnyRole(['SuperAdmin', 'Auditor']), handler)
 * 
 * @param roleNames - Array of role names
 * @returns Express middleware
 */
export const requireAnyRole = (roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verify user is authenticated
      if (!req.user || !req.user.id) {
        logger.warn('Any role check: User not authenticated', {
          path: req.path,
          method: req.method,
          requiredRoles: roleNames,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
        return;
      }

      const userId = req.user.id;

      // Check if user has any of the required roles
      const hasAnyRole = await RBACService.hasAnyRole(userId, roleNames);

      if (!hasAnyRole) {
        logger.warn('Any role check failed', {
          userId,
          requiredRoles: roleNames,
          path: req.path,
          method: req.method,
          userRoles: req.user.roles?.map((r) => r.name),
        });

        res.status(403).json({
          error: 'Forbidden',
          message: `One of these roles required: ${roleNames.join(', ')}`,
        });
        return;
      }

      logger.debug('Any role check passed', {
        userId,
        roles: roleNames,
        path: req.path,
      });

      next();
    } catch (error: any) {
      logger.error('Error in requireAnyRole middleware', {
        error: error.message,
        roleNames,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check roles',
      });
    }
  };
};

export default {
  requirePermission,
  requireRole,
  requireAnyRole,
};
