import { Router, Request, Response } from 'express';
import { validateBody } from '@middleware/validation';
import { authLimiter } from '@middleware/rateLimiter';
import { AuthService } from '@services/auth';
import { LoginSchema, ChangePasswordSchema } from '@schemas/auth';
import { authMiddleware } from '@middleware/auth';
import { AsyncWrapper } from '@middleware/errorHandler';
import ContextBuilder from '@services/contextBuilder';

const router = Router();

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter, // Rate limit: 5 attempts per minute
  validateBody(LoginSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    const result = await AuthService.login(username, password, ipAddress);
    res.json({
      user: {
        id: result.userId,
        username: result.username,
        email: result.email,
        role: result.role,
        enrolled: result.enrolled,
        walletId: result.walletId,
        certificateSerial: result.certificateSerial,
      },
      token: result.token,
      refreshToken: result.refreshToken,
    });
  })
);

// POST /api/v1/auth/register
router.post(
  '/register',
  authLimiter, // Rate limit: 5 attempts per minute
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
      return;
    }

    const result = await AuthService.register(username, email, password);
    res.status(201).json({
      success: true,
      user: {
        id: result.userId,
        username: result.username,
        email: result.email,
        enrolled: result.enrolled,
        wallet_id: result.walletId,
      },
      message: 'User registered and enrolled successfully'
    });
  })
);

// POST /api/v1/auth/change-password
router.post(
  '/change-password',
  authMiddleware,
  validateBody(ChangePasswordSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const userId = (req as any).user.sub;
    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(userId, oldPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  })
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authMiddleware,
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const user = (req as any).user;

    // Build context (user + organization + msp_id)
    let context = null;
    try {
      context = await ContextBuilder.buildContext(user.id);
    } catch {
      // If context fails, still return token info
      context = null;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_superuser: user.is_superuser,
        roles: user.roles || [],
        organization_id: user.organization_id || context?.organization?.id || null,
      },
      organization: context?.organization || null,
      msp_id: context?.msp_id || null,
    });
  })
);

export default router;
