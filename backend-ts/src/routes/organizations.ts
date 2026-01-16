import { Router, Request, Response } from 'express';
import { db } from '@config/knex';
import { authMiddleware } from '@middleware/auth';
import { requirePermission, requireRole } from '@middleware/rbac';
import { AsyncWrapper } from '@middleware/errorHandler';
import { Organization, CreateOrganizationInput, UpdateOrganizationInput } from '@models/Organization';
import logger from '@core/logger';

const router = Router();

/**
 * GET /api/v1/organizations
 * List all organizations
 * Permission: organizations:read
 */
router.get(
  '/',
  authMiddleware,
  requirePermission('organizations', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;

    const [organizations, countResult] = await Promise.all([
      db<Organization>('organizations')
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('organizations').count('* as count').first(),
    ]);

    const total = parseInt((countResult as any).count);

    res.json({
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * GET /api/v1/organizations/:id
 * Get organization by ID
 * Permission: organizations:read
 */
router.get(
  '/:id',
  authMiddleware,
  requirePermission('organizations', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { id } = req.params;

    const organization = await db<Organization>('organizations')
      .select('*')
      .where('id', id)
      .first();

    if (!organization) {
      res.status(404).json({
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    // Get user count for this organization
    const userCount = await db('users')
      .where('organization_id', id)
      .count('* as count')
      .first();

    res.json({
      ...organization,
      user_count: parseInt((userCount as any).count),
    });
  })
);

/**
 * POST /api/v1/organizations
 * Create new organization
 * Permission: SuperAdmin only
 */
router.post(
  '/',
  authMiddleware,
  requireRole('SuperAdmin'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const input: CreateOrganizationInput = req.body;

    // Validate required fields
    if (!input.name || !input.msp_id) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Name and msp_id are required',
        },
      });
      return;
    }

    // Check if MSP ID already exists
    const existingOrg = await db<Organization>('organizations')
      .where('msp_id', input.msp_id)
      .first();

    if (existingOrg) {
      res.status(409).json({
        error: {
          code: 'MSP_ID_EXISTS',
          message: `Organization with MSP ID '${input.msp_id}' already exists`,
        },
      });
      return;
    }

    // Create organization
    const [organization] = await db<Organization>('organizations')
      .insert({
        name: input.name,
        msp_id: input.msp_id,
        domain: input.domain,
        ca_url: input.ca_url,
        description: input.description,
        is_active: input.is_active !== undefined ? input.is_active : true,
      })
      .returning('*');

    logger.info('Organization created', {
      org_id: organization.id,
      name: organization.name,
      msp_id: organization.msp_id,
    });

    res.status(201).json(organization);
  })
);

/**
 * PUT /api/v1/organizations/:id
 * Update organization
 * Permission: SuperAdmin only
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole('SuperAdmin'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { id } = req.params;
    const input: UpdateOrganizationInput = req.body;

    // Check if organization exists
    const existing = await db<Organization>('organizations')
      .where('id', id)
      .first();

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    // Update organization
    const [updated] = await db<Organization>('organizations')
      .where('id', id)
      .update({
        name: input.name || existing.name,
        domain: input.domain !== undefined ? input.domain : existing.domain,
        ca_url: input.ca_url !== undefined ? input.ca_url : existing.ca_url,
        description: input.description !== undefined ? input.description : existing.description,
        is_active: input.is_active !== undefined ? input.is_active : existing.is_active,
        updated_at: new Date(),
      })
      .returning('*');

    logger.info('Organization updated', {
      org_id: id,
      changes: input,
    });

    res.json(updated);
  })
);

/**
 * DELETE /api/v1/organizations/:id
 * Delete organization
 * Permission: SuperAdmin only
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole('SuperAdmin'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if organization exists
    const existing = await db<Organization>('organizations')
      .where('id', id)
      .first();

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    // Check if organization has users
    const userCount = await db('users')
      .where('organization_id', id)
      .count('* as count')
      .first();

    if (parseInt((userCount as any).count) > 0) {
      res.status(409).json({
        error: {
          code: 'ORGANIZATION_HAS_USERS',
          message: 'Cannot delete organization with assigned users',
        },
      });
      return;
    }

    // Delete organization
    await db<Organization>('organizations')
      .where('id', id)
      .delete();

    logger.info('Organization deleted', {
      org_id: id,
      name: existing.name,
    });

    res.json({
      message: 'Organization deleted successfully',
    });
  })
);

/**
 * GET /api/v1/organizations/:id/users
 * List users in organization
 * Permission: organizations:read
 */
router.get(
  '/:id/users',
  authMiddleware,
  requirePermission('organizations', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if organization exists
    const organization = await db<Organization>('organizations')
      .where('id', id)
      .first();

    if (!organization) {
      res.status(404).json({
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
        },
      });
      return;
    }

    // Get users
    const users = await db('users')
      .select('id', 'username', 'email', 'created_at')
      .where('organization_id', id)
      .orderBy('created_at', 'desc');

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        msp_id: organization.msp_id,
      },
      users,
    });
  })
);

export default router;
