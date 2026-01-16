import { walletService } from '../wallet/WalletService';
import { fabricCAService } from '../fabric/FabricCAService';
import { gatewayClient, ChaincodeQueryRequest, ChaincodeInvokeRequest } from './GatewayClient';
import { db } from '@config/knex';
import logger from '@core/logger';
import { ChaincodeResponse } from '@core/types';

/**
 * Fabric Gateway Service with Wallet Integration
 * 
 * Handles chaincode operations using user's wallet identity
 * - Loads user identity from wallet
 * - Checks certificate revocation
 * - Signs transactions with user's private key
 * - Provides non-repudiation (each user signs their own transactions)
 */
export class FabricGatewayService {
    /**
     * Query chaincode (read-only)
     * Uses user's certificate for identity
     */
    async query(
        userId: string,
        chaincode: string,
        channel: string,
        functionName: string,
        args: string[]
    ): Promise<ChaincodeResponse> {
        try {
            logger.info('Querying chaincode with user wallet', {
                userId,
                chaincode,
                channel,
                function: functionName
            });

            // Get user from database
            const user = await db('users').where({ id: userId }).first();

            if (!user) {
                throw new Error('User not found');
            }

            if (!user.enrolled) {
                throw new Error('User not enrolled. Please complete enrollment first.');
            }

            // Get user's wallet identity
            const walletLabel = user.wallet_id;
            const identity = await walletService.get(walletLabel);

            if (!identity) {
                throw new Error(`Wallet identity not found: ${walletLabel}`);
            }

            // Check certificate revocation
            if (user.certificate_serial) {
                const isRevoked = await fabricCAService.isCertificateRevoked(user.certificate_serial);

                if (isRevoked) {
                    throw new Error('Certificate has been revoked. Please contact administrator.');
                }
            }

            // Prepare query request
            const request: ChaincodeQueryRequest = {
                chaincode,
                command: 'query',
                cert: identity.certificate,
                msp_id: identity.mspId,
                args: {
                    channel,
                    function: functionName,
                    params: args
                }
            };

            // Execute query
            const result = await gatewayClient.query(request);

            logger.info('Chaincode query successful', {
                userId,
                chaincode,
                function: functionName
            });

            return result;
        } catch (error: any) {
            logger.error('Chaincode query failed', {
                userId,
                chaincode,
                function: functionName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Invoke chaincode (write operation)
     * Signs transaction with user's private key
     */
    async invoke(
        userId: string,
        chaincode: string,
        channel: string,
        functionName: string,
        args: string[]
    ): Promise<ChaincodeResponse> {
        try {
            logger.info('Invoking chaincode with user wallet', {
                userId,
                chaincode,
                channel,
                function: functionName
            });

            // Get user from database
            const user = await db('users').where({ id: userId }).first();

            if (!user) {
                throw new Error('User not found');
            }

            if (!user.enrolled) {
                throw new Error('User not enrolled. Please complete enrollment first.');
            }

            // Get user's wallet identity
            const walletLabel = user.wallet_id;
            const identity = await walletService.get(walletLabel);

            if (!identity) {
                throw new Error(`Wallet identity not found: ${walletLabel}`);
            }

            // Check certificate revocation (critical for write operations)
            if (user.certificate_serial) {
                const isRevoked = await fabricCAService.isCertificateRevoked(user.certificate_serial);

                if (isRevoked) {
                    throw new Error('Certificate has been revoked. Cannot perform write operations.');
                }
            }

            // Prepare invoke request with user's private key
            const request: ChaincodeInvokeRequest = {
                chaincode,
                command: 'invoke',
                cert: identity.certificate,
                private_key: identity.privateKey, // User's private key for signing
                msp_id: identity.mspId,
                args: {
                    channel,
                    function: functionName,
                    params: args
                }
            };

            // Execute transaction
            const result = await gatewayClient.invoke(request);

            // Log transaction for audit
            await this.logTransaction(userId, chaincode, channel, functionName, args, result);

            logger.info('Chaincode invoke successful', {
                userId,
                chaincode,
                function: functionName,
                txId: result.txId
            });

            return result;
        } catch (error: any) {
            logger.error('Chaincode invoke failed', {
                userId,
                chaincode,
                function: functionName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Log transaction to audit log
     */
    private async logTransaction(
        userId: string,
        chaincode: string,
        channel: string,
        functionName: string,
        args: string[],
        result: ChaincodeResponse
    ): Promise<void> {
        try {
            await db('audit_logs').insert({
                user_id: userId,
                action: 'chaincode_invoke',
                resource: `${channel}/${chaincode}/${functionName}`,
                resource_id: result.txId,
                request_method: 'POST',
                request_path: '/api/v1/chaincode/invoke',
                response_status: result.success ? 200 : 500,
                metadata: JSON.stringify({ args }), // Store args for audit trail
                timestamp: new Date()
            });
        } catch (error: any) {
            logger.error('Failed to log transaction', {
                userId,
                error: error.message
            });
            // Don't throw - logging failure shouldn't break transaction
        }
    }

    /**
     * Get user's enrollment status
     */
    async getUserEnrollmentStatus(userId: string): Promise<{
        enrolled: boolean;
        walletId: string | null;
        certificateSerial: string | null;
        certificateRevoked: boolean;
    }> {
        try {
            const user = await db('users').where({ id: userId }).first();

            if (!user) {
                throw new Error('User not found');
            }

            let certificateRevoked = false;

            if (user.certificate_serial) {
                certificateRevoked = await fabricCAService.isCertificateRevoked(user.certificate_serial);
            }

            return {
                enrolled: user.enrolled,
                walletId: user.wallet_id,
                certificateSerial: user.certificate_serial,
                certificateRevoked
            };
        } catch (error: any) {
            logger.error('Failed to get enrollment status', {
                userId,
                error: error.message
            });
            throw error;
        }
    }
}

// Singleton instance
export const fabricGatewayService = new FabricGatewayService();
