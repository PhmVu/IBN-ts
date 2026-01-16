import { Router, Response, Request } from 'express';
import { validateBody } from '@middleware/validation';
import { ChannelService } from '@services/blockchain';
import { ChannelSchema, UpdateChannelSchema } from '@schemas/channel';
import { authMiddleware } from '@middleware/auth';
import { AsyncWrapper } from '@middleware/errorHandler';
import { requirePermission } from '@middleware/rbac';

const router = Router();

// GET /api/v1/channels - List channels
router.get(
  '/',
  authMiddleware,
  requirePermission('channels', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const limit = parseInt((req.query.limit as string) || '100');
    const offset = parseInt((req.query.offset as string) || '0');
    const result = await ChannelService.getAllChannels(limit, offset);
    res.json(result);
  })
);

// GET /api/v1/channels/:id - Get channel by ID
router.get(
  '/:id',
  authMiddleware,
  requirePermission('channels', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const channel = await ChannelService.getChannelById(req.params.id);
    res.json(channel);
  })
);

// POST /api/v1/channels - Create channel
router.post(
  '/',
  authMiddleware,
  requirePermission('channels', 'create'),
  validateBody(ChannelSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const channel = await ChannelService.createChannel(req.body, req.user!.id);
    res.status(201).json(channel);
  })
);

// PUT /api/v1/channels/:id - Update channel
router.put(
  '/:id',
  authMiddleware,
  requirePermission('channels', 'update'),
  validateBody(UpdateChannelSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const channel = await ChannelService.updateChannel(req.params.id, req.body);
    res.json(channel);
  })
);

// DELETE /api/v1/channels/:id - Delete channel
router.delete(
  '/:id',
  authMiddleware,
  requirePermission('channels', 'delete'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    await ChannelService.deleteChannel(req.params.id);
    res.json({ message: 'Channel deleted successfully' });
  })
);

export default router;
