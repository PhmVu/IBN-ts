import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { db } from '../config/knex';
import RBACService from '../services/rbacService';
import logger from '../core/logger';

/**
 * Role Management Routes
 * All routes require SuperAdmin role
 */
const router = Router();

/**
 * GET /api/v1/roles
 * List all roles
 * Authorization: SuperAdmin only
 */
router.get(
  '/',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (_req: Request & { user?: any }, res: Response): Promise<void> => {
    try {
      const roles = await RBACService.getAllRoles();

      logger.info('Roles fetched', {
        roleCount: roles.length,
      });

      res.json({
        success: true,
        data: roles,
        count: roles.length,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to fetch roles', {
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles',
      });
    }
  }
);

/**
 * GET /api/v1/roles/:id
 * Get role by ID with its permissions
 * Authorization: SuperAdmin only
 */
router.get(
  '/:id',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const role = await RBACService.getRoleById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      const permissions = await RBACService.getRolePermissions(id);

      logger.info('Role fetched by ID', {
        roleId: id,
        permissionCount: permissions.length,
      });

      res.json({
        success: true,
        data: {
          ...role,
          permissions,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to fetch role by ID', {
          roleId: req.params.id,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch role',
      });
    }
  }
);

/**
 * POST /api/v1/roles
 * Create new role
 * Authorization: SuperAdmin only
 * Body: { name: string, description?: string }
 */
router.post(
  '/',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Role name is required and must be a string',
        });
        return;
      }

      // Check if role already exists
      const existing = await RBACService.getRoleByName(name);
      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Role already exists',
        });
        return;
      }

      // Create role in database
      const [newRole] = await db('roles')
        .insert({
          name: name.trim(),
          description: description || null,
          is_system: false,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      logger.info('Role created', {
        roleName: name,
        roleId: newRole.id,
      });

      res.status(201).json({
        success: true,
        data: newRole,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to create role', {
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create role',
      });
    }
  }
);

/**
 * PUT /api/v1/roles/:id
 * Update role
 * Authorization: SuperAdmin only
 * Body: { name?: string, description?: string }
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check role exists
      const role = await RBACService.getRoleById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      // System roles cannot be updated
      if (role.is_system) {
        res.status(403).json({
          success: false,
          error: 'System roles cannot be modified',
        });
        return;
      }

      // Build update object
      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: 'Role name must be a non-empty string',
          });
          return;
        }
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = description;
      }

      // Update role
      const [updatedRole] = await db('roles')
        .where({ id })
        .update(updateData)
        .returning('*');

      logger.info('Role updated', {
        roleId: id,
      });

      res.json({
        success: true,
        data: updatedRole,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to update role', {
          roleId: req.params.id,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update role',
      });
    }
  }
);

/**
 * DELETE /api/v1/roles/:id
 * Delete role
 * Authorization: SuperAdmin only
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole('SuperAdmin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check role exists
      const role = await RBACService.getRoleById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role not found',
        });
        return;
      }

      // System roles cannot be deleted
      if (role.is_system) {
        res.status(403).json({
          success: false,
          error: 'System roles cannot be deleted',
        });
        return;
      }

      // Check for users with this role
      const userCount = await db('user_roles')
        .where({ role_id: id })
        .count('* as count')
        .first() as { count: number };

      if (userCount && userCount.count > 0) {
        res.status(409).json({
          success: false,
          error: `Cannot delete role: ${userCount.count} user(s) have this role`,
        });
        return;
      }

      // Delete role_permissions first
      await db('role_permissions').where({ role_id: id }).del();

      // Delete role
      await db('roles').where({ id }).del();

      logger.info('Role deleted', {
        roleId: id,
        roleName: role.name,
      });

      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to delete role', {
          roleId: req.params.id,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete role',
      });
    }
  }
);

export default router;
