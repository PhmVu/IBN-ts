import { Router, Request, Response } from 'express';
import logger from '@core/logger';
import { HealthStatus } from '@models/chaincode';

const router = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  logger.debug('Health check request received');

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gateway: true,
      logger: true,
    },
  };

  res.json(health);
});

export default router;
