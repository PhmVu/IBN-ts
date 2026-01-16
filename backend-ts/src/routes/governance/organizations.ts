/**
 * Organization Governance Routes
 * Handles NetworkCore organization management via blockchain
 */

import { Router } from 'express';
import { OrganizationService } from '../../services/governance/OrganizationService';
import { authMiddleware } from '../../middleware/auth';
import { requireAnyRole } from '../../middleware/rbac';
import { AsyncWrapper } from '../../middleware/errorHandler';
import {
    RegisterOrganizationDTO,
    ApproveOrganizationDTO,
    SuspendOrganizationDTO,
    RevokeOrganizationDTO,
    QueryOrganizationsDTO
} from '../../models/governance/OrganizationDTO';

const router = Router();

/**
 * GET /api/v1/governance/organizations
 * Query organizations from NetworkCore chaincode
 * Permission: Authenticated users
 */
router.get(
    '/',
    authMiddleware,
    AsyncWrapper.wrap(async (req, res) => {
        const networkCore = req.app.locals.networkCore;
        if (!networkCore) {
            res.status(503).json({
                success: false,
                error: 'NetworkCore chaincode not initialized'
            });
            return;
        }

        const service = new OrganizationService(networkCore);

        // Type guard for status
        const validStatuses = ['PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED'] as const;
        const status = typeof req.query.status === 'string' && validStatuses.includes(req.query.status as any)
            ? req.query.status as 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REVOKED'
            : undefined;

        const queryDto: QueryOrganizationsDTO = {
            status,
            mspId: typeof req.query.mspId === 'string' ? req.query.mspId : undefined,
            name: typeof req.query.name === 'string' ? req.query.name : undefined,
            limit: typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined,
            offset: typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : undefined
        };

        const organizations = await service.queryOrganizations(queryDto);
        res.json({
            success: true,
            data: organizations
        });
    })
);

/**
 * GET /api/v1/governance/organizations/:orgId
 * Get organization by ID
 * Permission: Authenticated users
 */
router.get(
    '/:orgId',
    authMiddleware,
    AsyncWrapper.wrap(async (req, res) => {
        const networkCore = req.app.locals.networkCore;
        if (!networkCore) {
            res.status(503).json({
                success: false,
                error: 'NetworkCore chaincode not initialized'
            });
            return;
        }

        const service = new OrganizationService(networkCore);
        const organization = await service.getOrganizationById(req.params.orgId);

        if (!organization) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'ORGANIZATION_NOT_FOUND',
                    message: `Organization with ID '${req.params.orgId}' not found`
                }
            });
            return;
        }

        res.json({
            success: true,
            data: organization
        });
    })
);

/**
 * POST /api/v1/governance/organizations
 * Register new organization on blockchain
 * Permission: Any authenticated user can register (will be PENDING until approved)
 */
router.post(
    '/',
    authMiddleware,
    AsyncWrapper.wrap(async (req, res) => {
        const networkCore = req.app.locals.networkCore;
        if (!networkCore) {
            res.status(503).json({
                success: false,
                error: 'NetworkCore chaincode not initialized'
            });
            return;
        }

        const service = new OrganizationService(networkCore);
        const dto: RegisterOrganizationDTO = req.body;

        const organization = await service.registerOrganization(dto);
        res.status(201).json({
            success: true,
            data: organization
        });
    })
);

/**
 * POST /api/v1/governance/organizations/:orgId/approve
 * Approve pending organization
 * Permission: SuperAdmin only
 */
router.post(
    '/:orgId/approve',
    authMiddleware,
    requireAnyRole(['SuperAdmin']),
    AsyncWrapper.wrap(async (req, res) => {
        const networkCore = req.app.locals.networkCore;
        if (!networkCore) {
            res.status(503).json({
                success: false,
                error: 'NetworkCore chaincode not initialized'
            });
            return;
        }

        const service = new OrganizationService(networkCore);
        const dto: ApproveOrganizationDTO = {
            orgId: req.params.orgId,
            comments: req.body.comments
        };

        const organization = await service.approveOrganization(dto);
        res.json({
            success: true,
            data: organization
        });
    })
);

/**
 * POST /api/v1/governance/organizations/:orgId/suspend
 * Suspend organization
 * Permission: SuperAdmin only
 */
router.post(
    '/:orgId/suspend',
    authMiddleware,
    requireAnyRole(['SuperAdmin']),
    AsyncWrapper.wrap(async (req, res) => {
        const networkCore = req.app.locals.networkCore;
        if (!networkCore) {
            res.status(503).json({
                success: false,
                error: 'NetworkCore chaincode not initialized'
            });
            return;
        }

        const service = new OrganizationService(networkCore);
        const dto: SuspendOrganizationDTO = {
            orgId: req.params.orgId,
            reason: req.body.reason
        };

        const organization = await service.suspendOrganization(dto);
        res.json({
            success: true,
            data: organization
        });
    })
);

/**
 * POST /api/v1/governance/organizations/:orgId/revoke
 * Permanently revoke organization
 * Permission: SuperAdmin only
 */
router.post(
    '/:orgId/revoke',
    authMiddleware,
    requireAnyRole(['SuperAdmin']),
    AsyncWrapper.wrap(async (req, res) => {
        const networkCore = req.app.locals.networkCore;
        if (!networkCore) {
            res.status(503).json({
                success: false,
                error: 'NetworkCore chaincode not initialized'
            });
            return;
        }

        const service = new OrganizationService(networkCore);
        const dto: RevokeOrganizationDTO = {
            orgId: req.params.orgId,
            reason: req.body.reason
        };

        const organization = await service.revokeOrganization(dto);
        res.json({
            success: true,
            data: organization
        });
    })
);

export default router;
