import express from 'express';
import { requestLogger } from '@middleware/logger';
import { errorHandler } from '@middleware/errorHandler';
import chaincodeRoutes from '@routes/chaincode';
import healthRoutes from '@routes/health';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger());

// Health routes (before other routes)
app.use('/api/v1', healthRoutes);

// Chaincode routes
app.use('/api/v1/chaincode', chaincodeRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString(),
  });
});

// Error handler (must be last)
app.use(errorHandler());

export default app;
