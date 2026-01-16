/**
 * Chaincode Governance Routes
 */

import { Router, Request, Response } from 'express';
import { ChaincodeGovernanceService } from '../../services/governance/ChaincodeGovernanceService';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateRequest } from '../../middleware/validation';
import { body, query } from 'express-validator';

const router = Router();

// POST /api/v1/governance/chaincodes/submit
router.post('/submit', authenticate, [
    body('chaincodeName').isString().trim().isLength({ min: 3, max: 50 }),
    body('version').matches(/^\d+\.\d+\.\d+$/),
    body('description').isString().trim().isLength({ min: 10 }),
    body('language').isIn(['go', 'javascript', 'typescript']),
    body('sourceCodeHash').isLength({ min: 64, max: 64 }),
    body('targetChannels').isArray(),
    body('endorsementPolicy').isString(),
    body('securityAudit').isBoolean()
], validateRequest, async (req: Request, res: Response) => {
    try {
        const service = new ChaincodeGovernanceService(req.app.locals.networkCore);
        const result = await service.submitProposal(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// POST /api/v1/governance/chaincodes/:proposalId/approve
router.post('/:proposalId/approve', authenticate, requireRole(['SuperAdmin']), async (req: Request, res: Response) => {
    try {
        const service = new ChaincodeGovernanceService(req.app.locals.networkCore);
        const result = await service.approveProposal({ proposalId: req.params.proposalId, comments: req.body.comments });
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// POST /api/v1/governance/chaincodes/:proposalId/reject
router.post('/:proposalId/reject', authenticate, requireRole(['SuperAdmin']), [
    body('reason').isString().trim().isLength({ min: 10 })
], validateRequest, async (req: Request, res: Response) => {
    try {
        const service = new ChaincodeGovernanceService(req.app.locals.networkCore);
        const result = await service.rejectProposal({ proposalId: req.params.proposalId, reason: req.body.reason });
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// POST /api/v1/governance/chaincodes/:proposalId/deploy
router.post('/:proposalId/deploy', authenticate, requireRole(['SuperAdmin']), [
    body('packageId').isString(),
    body('deployedChannels').isArray()
], validateRequest, async (req: Request, res: Response) => {
    try {
        const service = new ChaincodeGovernanceService(req.app.locals.networkCore);
        const result = await service.recordDeployment({
            proposalId: req.params.proposalId,
            packageId: req.body.packageId,
            deployedChannels: req.body.deployedChannels
        });
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/v1/governance/chaincodes
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const service = new ChaincodeGovernanceService(req.app.locals.networkCore);
        const result = await service.queryProposals(req.query as any);
        res.json({ success: true, data: result, count: result.length });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// GET /api/v1/governance/chaincodes/:chaincodeName/history
router.get('/:chaincodeName/history', authenticate, async (req: Request, res: Response) => {
    try {
        const service = new ChaincodeGovernanceService(req.app.locals.networkCore);
        const result = await service.getChaincodeHistory(req.params.chaincodeName);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

export default router;
