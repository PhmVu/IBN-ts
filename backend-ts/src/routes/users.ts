import { Router, Response, Request } from 'express';
import { validateBody } from '@middleware/validation';
import { UserService } from '@services/user';
import { UserSchema, UpdateUserSchema } from '@schemas/user';
import { authMiddleware } from '@middleware/auth';
import { AsyncWrapper } from '@middleware/errorHandler';
import { requirePermission } from '@middleware/rbac';

const router = Router();

// GET /api/v1/users - List users
router.get(
  '/',
  authMiddleware,
  requirePermission('users', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const limit = parseInt((req.query.limit as string) || '100');
    const offset = parseInt((req.query.offset as string) || '0');
    const result = await UserService.getAllUsers(limit, offset);
    res.json(result);
  })
);

// GET /api/v1/users/:id - Get user by ID
router.get(
  '/:id',
  authMiddleware,
  requirePermission('users', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const user = await UserService.getUserById(req.params.id);
    res.json(user);
  })
);

// POST /api/v1/users - Create user
router.post(
  '/',
  authMiddleware,
  requirePermission('users', 'create'),
  validateBody(UserSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const user = await UserService.createUser(req.body);
    res.status(201).json(user);
  })
);

// PUT /api/v1/users/:id - Update user
router.put(
  '/:id',
  authMiddleware,
  requirePermission('users', 'update'),
  validateBody(UpdateUserSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const user = await UserService.updateUser(req.params.id, req.body);
    res.json(user);
  })
);

// DELETE /api/v1/users/:id - Delete user
router.delete(
  '/:id',
  authMiddleware,
  requirePermission('users', 'delete'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    await UserService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  })
);

// POST /api/v1/users/:id/enroll - Enroll user to blockchain
router.post(
  '/:id/enroll',
  authMiddleware,
  requirePermission('users', 'update'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { identityId } = req.body;

    // Get user from database
    const { db } = await import('@config/knex');
    const user = await db('users').where({ id }).first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Check if already enrolled
    if (user.is_enrolled) {
      res.status(400).json({
        success: false,
        error: 'User is already enrolled to blockchain'
      });
      return;
    }

    // Get user's organization
    const org = await db('organizations')
      .where({ id: user.organization_id })
      .first();

    if (!org) {
      res.status(400).json({
        success: false,
        error: 'User organization not found'
      });
      return;
    }

    const mspId = org.msp_id || 'IBNMSP';
    const username = identityId || user.username;

    try {
      // Import Fabric CA service
      const { fabricCAService } = await import('@services/fabric');

      // Step 1: Register user with CA (gets enrollment secret)
      const enrollmentSecret = await fabricCAService.registerUser(
        username,
        mspId,
        'client'
      );

      // Step 2: Enroll user (gets certificate)
      const certSerial = await fabricCAService.enrollUser(
        username,
        enrollmentSecret,
        mspId
      );

      // Step 3: Update database
      await db('users')
        .where({ id })
        .update({
          is_enrolled: true,
          fabric_identity_id: username,
          enrolled_at: new Date()
        });

      res.json({
        success: true,
        message: 'User enrolled to blockchain successfully',
        data: {
          identityId: username,
          mspId,
          certSerial,
          enrolledAt: new Date()
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: `Enrollment failed: ${error.message}`
      });
    }
  })
);

// GET /api/v1/users/:id/certificate - Get user certificate info
router.get(
  '/:id/certificate',
  authMiddleware,
  AsyncWrapper.wrap(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Check if user can access this info (own profile or SuperAdmin)
    if (!req.user || (req.user.id !== id && !req.user.roles?.some((r: any) => r.name === 'SuperAdmin'))) {
      res.status(403).json({
        success: false,
        error: 'Forbidden'
      });
      return;
    }

    // Import services
    const { db } = await import('@config/knex');
    const { walletService } = await import('@services/wallet');
    const { fabricCAService } = await import('@services/fabric');

    const user = await db('users').where({ id }).first();

    if (!user || !user.wallet_id) {
      res.status(404).json({
        success: false,
        error: 'User not enrolled'
      });
      return;
    }

    // Get wallet
    const identity = await walletService.get(user.wallet_id);

    if (!identity) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
      return;
    }

    // Validate certificate
    const validation = fabricCAService.validateCertificate(identity.certificate);

    res.json({
      success: true,
      data: {
        subject: validation.subject,
        issuer: validation.issuer,
        validFrom: validation.validFrom,
        validTo: validation.validTo,
        expired: validation.expired,
        mspId: identity.mspId
      }
    });
  })
);

export default router;
