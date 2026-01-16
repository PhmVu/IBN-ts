/**
 * Governance Routes Index
 * Combines all governance API routes
 */

import { Router } from 'express';
import organizationsRouter from './organizations';
import chaincodesRouter from './chaincodes';
import { ChannelManagementService, PolicyService, AuditService } from '../../services/governance';
import { authMiddleware } from '../../middleware/auth';
import { requireAnyRole } from '../../middleware/rbac';

const router = Router();

// Mount sub-routers
router.use('/organizations', organizationsRouter);
router.use('/chaincodes', chaincodesRouter);

// Channel Management Routes
router.post('/channels', authMiddleware, requireAnyRole(['SuperAdmin']), async (req, res) => {
    try {
        const service = new ChannelManagementService(req.app.locals.networkCore);
        const result = await service.createChannel(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/channels/:channelId/organizations/:orgId', authMiddleware, requireAnyRole(['SuperAdmin']), async (req, res) => {
    try {
        const service = new ChannelManagementService(req.app.locals.networkCore);
        const result = await service.addOrganization(req.params.channelId, req.params.orgId);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.delete('/channels/:channelId/organizations/:orgId', authMiddleware, requireAnyRole(['SuperAdmin']), async (req, res) => {
    try {
        const service = new ChannelManagementService(req.app.locals.networkCore);
        const result = await service.removeOrganization(req.params.channelId, req.params.orgId, req.body.reason);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/channels', authMiddleware, async (req, res) => {
    try {
        const service = new ChannelManagementService(req.app.locals.networkCore);
        const result = await service.queryChannels(req.query);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Policy Routes
router.post('/policies', authMiddleware, requireAnyRole(['SuperAdmin']), async (req, res) => {
    try {
        const service = new PolicyService(req.app.locals.networkCore);
        const result = await service.createPolicy(req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.put('/policies/:policyId', authMiddleware, requireAnyRole(['SuperAdmin']), async (req, res) => {
    try {
        const service = new PolicyService(req.app.locals.networkCore);
        const result = await service.updatePolicy(req.params.policyId, req.body);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/policies', authMiddleware, async (req, res) => {
    try {
        const service = new PolicyService(req.app.locals.networkCore);
        const result = await service.queryPolicies(req.query);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Audit Routes
router.get('/audit', authMiddleware, async (req, res) => {
    try {
        const service = new AuditService(req.app.locals.networkCore);
        const result = await service.queryAuditTrail(req.query);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/compliance/report', authMiddleware, requireAnyRole(['SuperAdmin']), async (req, res) => {
    try {
        const service = new AuditService(req.app.locals.networkCore);
        const result = await service.generateComplianceReport(
            req.query.startDate as string,
            req.query.endDate as string,
            req.query.reportType as string
        );
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/statistics', authMiddleware, async (req, res) => {
    try {
        const service = new AuditService(req.app.locals.networkCore);
        const result = await service.getPlatformStatistics();
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

export default router;
