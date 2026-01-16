import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from '@config/env';
import { errorHandler } from '@middleware/errorHandler';
import { requestLogger } from '@middleware/logging';
import { apiLimiter } from '@middleware/rateLimiter';
import logger from '@core/logger';
import authRoutes from '@routes/auth';
import userRoutes from '@routes/users';
import channelRoutes from '@routes/channels';
import chaincodeRoutes from '@routes/chaincode';
import healthRoutes from '@routes/health';
import rolesRoutes from '@routes/roles';
import permissionsRoutes from '@routes/permissions';
import organizationsRoutes from '@routes/organizations';
import certificatesRoutes from '@routes/certificates';
import governanceRoutes from '@routes/governance';

export function createApp(): Express {
  const app = express();

  // Middleware - Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Trust proxy - Enable when behind nginx/load balancer
  app.set('trust proxy', true);

  // Middleware - CORS
  const allowedOrigins = config.cors.origin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Middleware - Logging
  app.use(requestLogger);

  // Middleware - Rate Limiting (apply to all /api/* routes)
  app.use('/api', apiLimiter);

  // Health check endpoint (no rate limit for monitoring)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Register routes
  app.use('/auth', authRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/channels', channelRoutes);
  app.use('/api/v1/chaincode', chaincodeRoutes);
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/roles', rolesRoutes);
  app.use('/api/v1/permissions', permissionsRoutes);
  app.use('/api/v1/roles', rolesRoutes);
  app.use('/api/v1/permissions', permissionsRoutes);
  app.use('/api/v1/organizations', organizationsRoutes);
  app.use('/api/v1/certificates', certificatesRoutes);

  // Governance routes (v0.0.3)
  app.use('/api/v1/governance', governanceRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
      timestamp: new Date().toISOString(),
      path: _req.path,
    });
  });

  // Error handler - must be last
  app.use(errorHandler);

  logger.info('Express app configured successfully');

  return app;
}
