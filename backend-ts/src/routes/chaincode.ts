import { Router, Response, Request } from 'express';
import { validateBody } from '@middleware/validation';
import { ChaincodeService } from '@services/blockchain';
import { ChaincodeQuerySchema, ChaincodeInvokeSchema } from '@schemas/chaincode';
import { authMiddleware } from '@middleware/auth';
import { AsyncWrapper } from '@middleware/errorHandler';
import { gatewayClient } from '@services/blockchain';
import { CertificateService } from '@services/blockchain/CertificateService';
import { requirePermission } from '@middleware/rbac';
import logger from '@core/logger';

const router = Router();

// GET /api/v1/chaincode - List chaincodes
router.get(
  '/',
  authMiddleware,
  requirePermission('chaincodes', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response) => {
    const channelId = req.query.channel_id as string;
    if (!channelId) {
      res.status(400).json({ error: { code: 'MISSING_CHANNEL_ID', message: 'channel_id is required' } });
      return;
    }

    const limit = parseInt((req.query.limit as string) || '100');
    const offset = parseInt((req.query.offset as string) || '0');
    const result = await ChaincodeService.getChaincodesByChannel(channelId, limit, offset);
    res.json(result);
  })
);

// GET /api/v1/chaincode/:id - Get chaincode by ID
router.get(
  '/:id',
  authMiddleware,
  requirePermission('chaincodes', 'read'),
  AsyncWrapper.wrap(async (req: Request, res: Response): Promise<void> => {
    const chaincode = await ChaincodeService.getChaincodeById(req.params.id);
    res.json(chaincode);
  })
);

// POST /api/v1/chaincode/query - Query chaincode
router.post(
  '/query',
  authMiddleware,
  requirePermission('chaincodes', 'query'),
  validateBody(ChaincodeQuerySchema),
  AsyncWrapper.wrap(async (req: Request, res: Response): Promise<void> => {
    const { channel, chaincode, function: functionName, params } = req.body;

    // Get certificate from network (public read for queries)
    const credentials = CertificateService.getPublicReadCertificate();
    if (!credentials) {
      logger.error('Failed to load certificate for query');
      res.status(500).json({
        success: false,
        error: 'Failed to load certificate',
        data: null,
        txId: null,
      });
      return;
    }

    logger.info('Querying chaincode', {
      chaincode,
      channel,
      function: functionName,
      user: req.user?.username,
      params: params || [],
    });

    const response = await gatewayClient.query({
      chaincode,
      command: 'query',
      cert: credentials.certificate,
      msp_id: credentials.mspId,
      args: {
        channel,
        function: functionName,
        params: params || [],
      },
    });

    res.json(response);
  })
);

// POST /api/v1/chaincode/invoke - Invoke chaincode
router.post(
  '/invoke',
  authMiddleware,
  requirePermission('chaincodes', 'invoke'),
  validateBody(ChaincodeInvokeSchema),
  AsyncWrapper.wrap(async (req: Request, res: Response): Promise<void> => {
    const { channel, chaincode, function: functionName, params } = req.body;

    // Get Admin credentials from network (for invoke operations)
    const credentials = CertificateService.getAdminCredentials();
    if (!credentials || !credentials.privateKey) {
      logger.error('Failed to load credentials for invoke');
      res.status(500).json({
        success: false,
        error: 'Failed to load credentials for invoke operation',
        data: null,
        txId: null,
      });
      return;
    }

    logger.info('Invoking chaincode', {
      chaincode,
      channel,
      function: functionName,
      user: req.user?.username,
      params: params || [],
    });

    const response = await gatewayClient.invoke({
      chaincode,
      command: 'invoke',
      cert: credentials.certificate,
      private_key: credentials.privateKey,
      msp_id: credentials.mspId,
      args: {
        channel,
        function: functionName,
        params: params || [],
      },
    });

    res.json(response);
  })
);

export default router;
