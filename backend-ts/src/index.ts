import 'dotenv/config';
import { config } from '@config/env';
import { createApp } from './app';
import { getPool, closePool } from '@config/database';
import { db } from '@config/knex'; // Import knex instance
import logger from '@core/logger';
import { CertificateService } from '@services/blockchain/CertificateService';

async function startServer() {
  try {
    // Run migrations first
    logger.info('Running database migrations...');
    await db.migrate.latest();
    logger.info('Database migrations completed');

    // Run seeds
    const { default: runSeeds } = await import('@database/knex-seed');
    await runSeeds(true); // true = keep connection open
    logger.info('Database seeding completed');

    // Extract certificate expiry dates (auto-populate on startup)
    const { extractCertificateExpiry } = await import('@services/certificate/extractCertificateExpiry');
    await extractCertificateExpiry();

    // Initialize JWT Service (generate keys if needed)
    const { jwtService } = await import('@services/auth/JwtService');
    await jwtService.initialize();
    logger.info('JWT service initialized');

    // Initialize Vault Service (for secure key management)
    try {
      const { initVaultService, getVaultService } = await import('@services/vault/VaultService');
      initVaultService();
      const vault = getVaultService();

      const healthy = await vault.healthCheck();
      if (healthy) {
        logger.info('✅ VaultService initialized and healthy');
      } else {
        logger.warn('⚠️  VaultService initialized but health check failed - using env fallback');
      }
    } catch (error: any) {
      logger.warn('⚠️  VaultService initialization failed - using env fallback', {
        error: error.message
      });
    }

    // Initialize CertificateService
    CertificateService.initialize();
    logger.info('CertificateService initialized');

    // Test database connection
    logger.info('Testing database connection...');
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection successful', { timestamp: result.rows[0].now });

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, config.host, () => {
      logger.info(`Backend API running on http://${config.host}:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info('API documentation: Swagger coming soon');

      // Start certificate monitoring job (unless disabled)
      if (process.env.ENABLE_CERT_MONITORING !== 'false') {
        try {
          const { startCertificateMonitoringJob } = require('./jobs/certificateMonitorJob');
          startCertificateMonitoringJob();
        } catch (error: any) {
          logger.error('Failed to start certificate monitoring job', {
            error: error.message,
            stack: error.stack
          });
        }
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await closePool();
        logger.info('Database pool closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.toString(), stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason: JSON.stringify(reason) });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
}

startServer();
