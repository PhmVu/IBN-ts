import { Router, Request, Response, NextFunction } from 'express';
import logger from '@core/logger';
import { ChaincodeResponse, ChaincodeForwardRequest, ChaincodeForwardRequestSchema } from '@models/chaincode';
import { FabricGatewayService } from '@services/fabric/FabricGatewayService';
import { validateRequest } from '@middleware/validator';
import { ChaincodeValidator } from '@utils/validators';
import { ResponseBuilder } from '@utils/response';

const router = Router();

/**
 * POST /api/v1/chaincode/forward
 * Main endpoint for forwarding chaincode operations to Fabric network
 */
router.post(
  '/forward',
  validateRequest(ChaincodeForwardRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const request: ChaincodeForwardRequest = req.body;

      logger.debug('Chaincode forward request received', {
        chaincode: request.chaincode,
        command: request.command,
        channel: request.args.channel,
      });

      // Validate request
      ChaincodeValidator.validateForwardRequest(request);

      // Select identity
      const identity = await FabricGatewayService.selectIdentity(
        {
          msp_id: request.msp_id || 'IBNMSP',
          certificate: request.cert,
          private_key: request.private_key,
          public_read: request.public_read,
          org_domain: request.org_domain,
        },
        request.command !== 'query' && request.command !== 'read'
      );

      if (!identity) {
        logger.warn('Failed to select identity');
        res.status(500).json(
          ResponseBuilder.error('Failed to select identity')
        );
        return;
      }

      // Create service instance and connect
      const service = new FabricGatewayService();
      await service.connect();

      // Execute chaincode operation
      let result: ChaincodeResponse;

      if (request.command === 'query' || request.command === 'read') {
        result = await service.queryChaincode(
          request.args.channel,
          request.chaincode,
          request.args.function,
          request.args.params || [],
          identity
        );
      } else {
        result = await service.invokeChaincode(
          request.args.channel,
          request.chaincode,
          request.args.function,
          request.args.params || [],
          identity
        );
      }

      // Close connection
      await service.disconnect();

      logger.info('Chaincode operation completed', {
        chaincode: request.chaincode,
        command: request.command,
        success: result.success,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/chaincode/query
 * Legacy query endpoint (backward compatibility)
 */
router.post(
  '/query',
  validateRequest(ChaincodeForwardRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req.body;

      logger.debug('Legacy chaincode query request received', {
        chaincode: request.chaincode,
        channel: request.args.channel,
      });

      // Force command to 'query'
      request.command = 'query';

      // Delegate to forward endpoint
      const identity = await FabricGatewayService.selectIdentity({
        msp_id: request.msp_id || 'IBNMSP',
        certificate: request.cert,
        private_key: request.private_key,
      });

      if (!identity) {
        return res.status(500).json(ResponseBuilder.error('Failed to select identity'));
      }

      const service = new FabricGatewayService();
      await service.connect();

      const result = await service.queryChaincode(
        request.args.channel,
        request.chaincode,
        request.args.function,
        request.args.params || [],
        identity
      );

      await service.disconnect();

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/chaincode/invoke
 * Legacy invoke endpoint (backward compatibility)
 */
router.post(
  '/invoke',
  validateRequest(ChaincodeForwardRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req.body;

      logger.debug('Legacy chaincode invoke request received', {
        chaincode: request.chaincode,
        channel: request.args.channel,
      });

      // Force command to 'invoke'
      request.command = 'invoke';

      // Delegate to forward endpoint
      const identity = await FabricGatewayService.selectIdentity(
        {
          msp_id: request.msp_id || 'IBNMSP',
          certificate: request.cert,
          private_key: request.private_key,
        },
        true
      );

      if (!identity) {
        return res.status(500).json(ResponseBuilder.error('Failed to select identity'));
      }

      const service = new FabricGatewayService();
      await service.connect();

      const result = await service.invokeChaincode(
        request.args.channel,
        request.chaincode,
        request.args.function,
        request.args.params || [],
        identity
      );

      await service.disconnect();

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/chaincode/list
 * List all available chaincodes
 */
router.get('/list', (_req: Request, res: Response) => {
  logger.debug('List chaincodes request received');

  // TODO: Implement chaincode listing from Fabric network
  res.json({
    success: true,
    data: {
      chaincodes: [],
      message: 'Chaincode listing not yet implemented',
    },
  });
});

export default router;
