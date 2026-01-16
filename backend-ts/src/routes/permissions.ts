import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { db } from '../config/knex';
import RBACService from '../services/rbacService';
import logger from '../core/logger';

/**
 * Permission Management Routes
 * All routes require SuperAdmin role
 */
const router = Router();

/**
 * GET /api/v1/permissions
 * List all permissions
 * Authorization: SuperAdmin only
 */
router.get(
  '/',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const permissions = await RBACService.getAllPermissions();

      logger.info('Permissions fetched', {
        permissionCount: permissions.length,
      });

      res.json({
        success: true,
        data: permissions,
        count: permissions.length,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to fetch permissions', {
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch permissions',
      });
    }
  }
);

/**
 * GET /api/v1/permissions/roles/:roleId
 * Get permissions assigned to a specific role
 * Authorization: SuperAdmin only
 */
router.get(
  '/roles/:roleId',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;

      // Check role exists
      const role = await RBACService.getRoleById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      const permissions = await RBACService.getRolePermissions(roleId);

      logger.info('Role permissions fetched', {
        roleId,
        roleName: role.name,
        permissionCount: permissions.length,
      });

      res.json({
        success: true,
        data: {
          role,
          permissions,
        },
        count: permissions.length,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to fetch role permissions', {
          roleId: req.params.roleId,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch role permissions',
      });
    }
  }
);

/**
 * POST /api/v1/permissions/roles/:roleId/grant
 * Grant permission to role
 * Authorization: SuperAdmin only
 * Body: { permission_id: string }
 */
router.post(
  '/roles/:roleId/grant',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;
      const { permission_id } = req.body;

      if (!permission_id) {
        res.status(400).json({
          success: false,
          error: 'permission_id is required',
        });
        return;
      }

      // Check role exists
      const role = await RBACService.getRoleById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      // Check permission exists
      const permission = await db('permissions').where({ id: permission_id }).first();
      if (!permission) {
        res.status(404).json({
          success: false,
          error: 'Permission not found',
        });
        return;
      }

      // Check if already assigned
      const existing = await db('role_permissions')
        .where({ role_id: roleId, permission_id })
        .first();
      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Permission already assigned to this role',
        });
        return;
      }

      // Grant permission
      await db('role_permissions').insert({
        role_id: roleId,
        permission_id,
      });

      logger.info('Permission granted to role', {
        roleId,
        permissionId: permission_id,
        permissionName: `${permission.resource}:${permission.action}`,
      });

      res.status(201).json({
        success: true,
        message: 'Permission granted to role',
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to grant permission to role', {
          roleId: req.params.roleId,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to grant permission',
      });
    }
  }
);

/**
 * DELETE /api/v1/permissions/roles/:roleId/revoke/:permissionId
 * Revoke permission from role
 * Authorization: SuperAdmin only
 */
router.delete(
  '/roles/:roleId/revoke/:permissionId',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId, permissionId } = req.params;

      // Check role exists
      const role = await RBACService.getRoleById(roleId);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      // Check permission exists
      const permission = await db('permissions').where({ id: permissionId }).first();
      if (!permission) {
        res.status(404).json({
          success: false,
          error: 'Permission not found',
        });
        return;
      }

      // Revoke permission
      const deleted = await db('role_permissions')
        .where({ role_id: roleId, permission_id: permissionId })
        .del();

      if (deleted === 0) {
        res.status(404).json({
          success: false,
          error: 'Permission not assigned to this role',
        });
        return;
      }

      logger.info('Permission revoked from role', {
        roleId,
        permissionId,
        permissionName: `${permission.resource}:${permission.action}`,
      });

      res.json({
        success: true,
        message: 'Permission revoked from role',
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to revoke permission from role', {
          roleId: req.params.roleId,
          permissionId: req.params.permissionId,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to revoke permission',
      });
    }
  }
);

export default router;
