import { Router, Response } from 'express';
import { gatewayClient } from '@services/blockchain';
import { getPool } from '@config/database';
import logger from '@core/logger';

const router = Router();

// GET /api/v1/health
router.get('/', async (_req, res: Response) => {
  try {
    // Check database connection
    const pool = getPool();
    const dbResult = await pool.query('SELECT NOW()');
    const dbHealthy = dbResult.rows.length > 0;

    // Check gateway health
    const gatewayHealthy = await gatewayClient.health();

    const health = {
      status: dbHealthy && gatewayHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealthy ? 'ok' : 'down',
        gateway: gatewayHealthy ? 'ok' : 'down',
        api: 'ok',
      },
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

export default router;
