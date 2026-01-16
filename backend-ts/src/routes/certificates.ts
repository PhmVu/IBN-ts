import { Router, Request, Response } from 'express';
import { authMiddleware } from '@middleware/auth';
import { requirePermission } from '@middleware/rbac';
import { AsyncWrapper } from '@middleware/errorHandler';
import CertificateManager from '@services/certificateManager';
import ContextBuilder from '@services/contextBuilder';
import logger from '@core/logger';
import path from 'path';

const router = Router();

// Initialize CertificateManager with crypto-config path
const cryptoConfigPath = process.env.CRYPTO_CONFIG_PATH || path.join(process.cwd(), '..', 'network', 'crypto-config');
const certificateManager = new CertificateManager(cryptoConfigPath);

/**
 * GET /api/v1/certificates
 * List all available MSPs and their certificates
 * Permission: certificates:read
 */
router.get(
  '/',
  authMiddleware,
  requirePermission('certificates', 'read'),
  AsyncWrapper.wrap(async (_req: Request, res: Response) => {
    const certificates = await certificateManager.scanCryptoConfig();

    const result = Array.from(certificates.entries()).map(([mspId, data]) => ({
      msp_id: mspId,
      domain: data.domain,
      user_count: Object.keys(data.users).length,
      users: Object.keys(data.users),
    }));

    res.json({
      total: result.length,
      msps: result,
    });
  })
);

/**
 * GET /api/v1/certificates/msps
 * List all available MSP IDs
 * Permission: certificates:read
 */
router.get(
  '/msps',
  authMiddleware,
  requirePermission('certificates', 'read'),
  AsyncWrapper.wrap(async (_req: Request, res: Response) => {
    const msps = await certificateManager.listMSPs();

    res.json({
      total: msps.length,
      msps,
    });
  })
);

/**
 * GET /api/v1/certificates/:mspId
 * Get certificates for specific MSP
 * Permission: certificates:read
 */
router.get(
  '/:mspId',
  authMiddleware,
  requirePermission('certificates', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { mspId } = req.params;

    const certificates = await certificateManager.getCertificatesByMSP(mspId);

    if (!certificates) {
      res.status(404).json({
        error: {
          code: 'MSP_NOT_FOUND',
          message: `MSP not found: ${mspId}`,
        },
      });
      return;
    }

    const result = {
      msp_id: certificates.msp_id,
      domain: certificates.domain,
      users: Object.entries(certificates.users).map(([username, certs]) => ({
        username,
        has_certificate: !!certs.signcert,
        has_private_key: !!certs.keystore && certs.keystore.length > 0,
        certificate_path: certs.signcert,
        keystore_paths: certs.keystore,
      })),
    };

    res.json(result);
  })
);

/**
 * GET /api/v1/certificates/:mspId/users/:username
 * Get certificate info for specific user
 * Permission: certificates:read
 */
router.get(
  '/:mspId/users/:username',
  authMiddleware,
  requirePermission('certificates', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { mspId, username } = req.params;

    const certificates = await certificateManager.getCertificatesByMSP(mspId);

    if (!certificates) {
      res.status(404).json({
        error: {
          code: 'MSP_NOT_FOUND',
          message: `MSP not found: ${mspId}`,
        },
      });
      return;
    }

    const userCerts = certificates.users[username];

    if (!userCerts) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: `User not found: ${username}@${mspId}`,
        },
      });
      return;
    }

    // Get certificate info if available
    let certificateInfo = null;
    if (userCerts.signcert) {
      certificateInfo = await certificateManager.getCertificateInfo(userCerts.signcert);
    }

    res.json({
      msp_id: mspId,
      username,
      certificate_path: userCerts.signcert,
      keystore_paths: userCerts.keystore,
      certificate_info: certificateInfo,
    });
  })
);

/**
 * POST /api/v1/certificates/validate
 * Validate a certificate
 * Permission: certificates:read
 */
router.post(
  '/validate',
  authMiddleware,
  requirePermission('certificates', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { cert_path } = req.body;

    if (!cert_path) {
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'cert_path is required',
        },
      });
      return;
    }

    const isValid = await certificateManager.validateCertificate(cert_path);
    const info = await certificateManager.getCertificateInfo(cert_path);

    res.json({
      valid: isValid,
      certificate_info: info,
    });
  })
);

/**
 * GET /api/v1/certificates/me
 * Get current user's certificate info
 * Permission: Authenticated user
 */
router.get(
  '/me/info',
  authMiddleware,
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user || !user.id) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    // Build context to get MSP ID
    const context = await ContextBuilder.buildContext(user.id);

    if (!context.msp_id) {
      res.status(404).json({
        error: {
          code: 'NO_ORGANIZATION',
          message: 'User has no organization assigned',
        },
      });
      return;
    }

    // Get certificate info for user
    const certificates = await certificateManager.getCertificatesByMSP(context.msp_id);

    if (!certificates) {
      res.status(404).json({
        error: {
          code: 'MSP_NOT_FOUND',
          message: `MSP not found: ${context.msp_id}`,
        },
      });
      return;
    }

    // Try to find user's certificate (by username or Admin)
    const username = user.username;
    const userCerts = certificates.users[username] || certificates.users['Admin'];

    if (!userCerts) {
      res.status(404).json({
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: `Certificate not found for user: ${username}@${context.msp_id}`,
        },
      });
      return;
    }

    // Get certificate info
    let certificateInfo = null;
    if (userCerts.signcert) {
      certificateInfo = await certificateManager.getCertificateInfo(userCerts.signcert);
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
      },
      organization: context.organization,
      msp_id: context.msp_id,
      certificate: {
        path: userCerts.signcert,
        info: certificateInfo,
        has_private_key: !!userCerts.keystore && userCerts.keystore.length > 0,
      },
    });
  })
);

/**
 * POST /api/v1/certificates/cache/clear
 * Clear certificate cache (force rescan)
 * Permission: SuperAdmin only
 */
router.post(
  '/cache/clear',
  authMiddleware,
  requirePermission('certificates', 'manage'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    certificateManager.clearCache();

    logger.info('Certificate cache cleared by admin', {
      user_id: (req as any).user?.id,
    });

    res.json({
      message: 'Certificate cache cleared successfully',
    });
  })
);

export default router;
