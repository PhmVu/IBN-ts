import logger from '@core/logger';
import { ChaincodeResponse, OrgContext } from '@core/types';
import { FabricError, CertificateError } from '@core/errors';
import { CertificateManager } from '@services/certificate/CertificateManager';
import { FabricIdentity } from './FabricIdentity';
import { GrpcGatewayClient } from './GrpcGatewayClient';
import { DockerExecutor } from './DockerExecutor';
import { config } from '@config/env';

/**
 * Main Fabric Gateway Service
 * Orchestrates chaincode queries and invocations
 */
export class FabricGatewayService {
  private grpcClient: GrpcGatewayClient;
  private dockerExecutor: DockerExecutor;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    maxRetries: number = config.maxRetries,
    retryDelay: number = config.retryDelay
  ) {
    this.grpcClient = new GrpcGatewayClient({
      endpoint: config.gatewayPeerEndpoint,
      timeout: config.grpcTimeout,
    });

    this.dockerExecutor = new DockerExecutor(config.dockerNetwork, config.peerContainer);
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;

    logger.debug('FabricGatewayService initialized', {
      peerEndpoint: config.gatewayPeerEndpoint,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    });
  }

  /**
   * Select identity from org context
   * Decodes certificate and optionally private key from Base64
   */
  static async selectIdentity(
    orgContext: OrgContext,
    requirePrivateKey: boolean = false
  ): Promise<FabricIdentity | null> {
    try {
      const mspId = orgContext.msp_id;
      if (!mspId) {
        throw new CertificateError('MSP ID is required');
      }

      // Decode certificate from Base64
      const certBuffer = CertificateManager.decodeBase64Certificate(orgContext.certificate);

      // Validate certificate
      if (!CertificateManager.validateCertificateFormat(certBuffer)) {
        throw new CertificateError('Invalid certificate format');
      }

      // Check if certificate is valid (not expired)
      if (!CertificateManager.isCertificateValid(certBuffer)) {
        logger.warn('Certificate is expired or not yet valid', {
          subject: CertificateManager.extractCertificateSubject(certBuffer),
        });
      }

      // Decode private key if provided
      let privateKeyBuffer: Buffer | undefined;
      if (orgContext.private_key) {
        privateKeyBuffer = CertificateManager.decodeBase64PrivateKey(orgContext.private_key);
      }

      // Check if private key is required
      if (requirePrivateKey && !privateKeyBuffer) {
        throw new CertificateError('Private key is required for invoke operations');
      }

      const identity = new FabricIdentity(mspId, certBuffer, privateKeyBuffer);

      logger.debug('Identity selected successfully', {
        mspId: identity.mspId,
        hasPrivateKey: identity.hasPrivateKey(),
      });

      return identity;
    } catch (error: any) {
      logger.error('Failed to select identity', {
        error: error.message,
        code: error.code,
      });
      return null;
    }
  }

  /**
   * Connect to Fabric network
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Fabric network...');
      await this.grpcClient.connect();
      logger.info('Connected to Fabric network');
    } catch (error: any) {
      logger.error('Failed to connect to Fabric network', { error: error.message });
      throw error;
    }
  }

  /**
   * Disconnect from Fabric network
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from Fabric network...');
      await this.grpcClient.disconnect();
      logger.info('Disconnected from Fabric network');
    } catch (error: any) {
      logger.warn('Error during disconnect', { error: error.message });
    }
  }

  /**
   * Query chaincode (read-only operation)
   * Tries gRPC first, falls back to Docker executor
   */
  async queryChaincode(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<ChaincodeResponse> {
    try {
      logger.debug('Querying chaincode', {
        channel,
        chaincode,
        function: functionName,
        argsLength: args.length,
        mspId: identity.mspId,
      });

      // Try gRPC first
      try {
        const result = await this.queryWithRetry(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );

        logger.info('Chaincode query succeeded', {
          channel,
          chaincode,
          function: functionName,
          source: 'gRPC',
        });

        // Parse JSON response if it's a string
        let parsedData = result;
        if (typeof result === 'string') {
          try {
            parsedData = JSON.parse(result);
          } catch {
            // If parsing fails, keep original string
            parsedData = result;
          }
        }

        return {
          success: true,
          data: parsedData,
          txId: null,
          error: null,
        };
      } catch (grpcError: any) {
        logger.warn('gRPC query failed, trying Docker executor', {
          error: grpcError.message,
          channel,
          chaincode,
        });

        // Fallback to Docker executor
        const result = await this.dockerExecutor.executePeerChaincodeQuery(
          channel,
          chaincode,
          functionName,
          args
        );

        logger.info('Chaincode query succeeded', {
          channel,
          chaincode,
          function: functionName,
          source: 'Docker',
        });

        // Parse JSON response if it's a string
        let parsedData = result;
        if (typeof result === 'string') {
          try {
            parsedData = JSON.parse(result);
          } catch {
            // If parsing fails, keep original string
            parsedData = result;
          }
        }

        return {
          success: true,
          data: parsedData,
          txId: null,
          error: null,
        };
      }
    } catch (error: any) {
      logger.error('Chaincode query failed completely', {
        channel,
        chaincode,
        function: functionName,
        error: error.message,
      });

      return {
        success: false,
        data: null,
        txId: null,
        error: error.message || 'Query failed',
      };
    }
  }

  /**
   * Invoke chaincode (read-write operation)
   * Tries gRPC first, falls back to Docker executor
   */
  async invokeChaincode(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<ChaincodeResponse> {
    try {
      if (!identity.hasPrivateKey()) {
        throw new FabricError('Private key is required for chaincode invocation');
      }

      logger.debug('Invoking chaincode', {
        channel,
        chaincode,
        function: functionName,
        argsLength: args.length,
        mspId: identity.mspId,
      });

      // Try gRPC first
      try {
        const txId = await this.invokeWithRetry(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );

        logger.info('Chaincode invoke succeeded', {
          channel,
          chaincode,
          function: functionName,
          txId,
          source: 'gRPC',
        });

        // For invoke, chaincode may return data
        // Try to get result if available
        const invokeData = null;
        try {
          // Some chaincodes return data after invoke
          // This would need to be implemented in GrpcGatewayClient
          // For now, data is null for invoke operations
        } catch {
          // Ignore errors
        }

        return {
          success: true,
          data: invokeData,
          txId,
          error: null,
        };
      } catch (grpcError: any) {
        logger.warn('gRPC invoke failed, trying Docker executor', {
          error: grpcError.message,
          channel,
          chaincode,
        });

        // Fallback to Docker executor
        const txId = await this.dockerExecutor.executePeerChaincodeInvoke(
          channel,
          chaincode,
          functionName,
          args
        );

        logger.info('Chaincode invoke succeeded', {
          channel,
          chaincode,
          function: functionName,
          txId,
          source: 'Docker',
        });

        // For invoke, chaincode may return data
        // Try to get result if available
        const invokeData = null;
        try {
          // Some chaincodes return data after invoke
          // This would need to be implemented in GrpcGatewayClient
          // For now, data is null for invoke operations
        } catch {
          // Ignore errors
        }

        return {
          success: true,
          data: invokeData,
          txId,
          error: null,
        };
      }
    } catch (error: any) {
      logger.error('Chaincode invoke failed completely', {
        channel,
        chaincode,
        function: functionName,
        error: error.message,
      });

      return {
        success: false,
        data: null,
        txId: null,
        error: error.message || 'Invoke failed',
      };
    }
  }

  // =====================
  // PRIVATE METHODS
  // =====================

  /**
   * Query with retry logic
   */
  private async queryWithRetry(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          logger.debug(`Query attempt ${attempt}/${this.maxRetries}`, {
            channel,
            chaincode,
          });
          await this.delay(this.retryDelay * attempt);
        }

        return await this.grpcClient.queryChaincode(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );
      } catch (error: any) {
        lastError = error;

        if (attempt === this.maxRetries) {
          throw error;
        }

        logger.warn(`Query attempt ${attempt} failed, retrying...`, {
          error: error.message,
          nextAttempt: attempt + 1,
        });
      }
    }

    throw lastError;
  }

  /**
   * Invoke with retry logic
   */
  private async invokeWithRetry(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<string> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          logger.debug(`Invoke attempt ${attempt}/${this.maxRetries}`, {
            channel,
            chaincode,
          });
          await this.delay(this.retryDelay * attempt);
        }

        return await this.grpcClient.invokeChaincode(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );
      } catch (error: any) {
        lastError = error;

        if (attempt === this.maxRetries) {
          throw error;
        }

        logger.warn(`Invoke attempt ${attempt} failed, retrying...`, {
          error: error.message,
          nextAttempt: attempt + 1,
        });
      }
    }

    throw lastError;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
