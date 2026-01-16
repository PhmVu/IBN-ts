import 'module-alias/register';
import app from './app';
import logger from '@core/logger';
import { config } from '@config/env';

const PORT = config.port;
const HOST = config.host;

const server = app.listen(PORT, HOST, () => {
  logger.info(`Gateway API started successfully`, {
    host: HOST,
    port: PORT,
    environment: config.nodeEnv,
  });

  logger.info(`API Documentation`, {
    health: `http://${HOST}:${PORT}/api/v1/health`,
    chaincode: `http://${HOST}:${PORT}/api/v1/chaincode/forward`,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: String(reason),
    promise: String(promise),
  });
  process.exit(1);
});

export default server;
