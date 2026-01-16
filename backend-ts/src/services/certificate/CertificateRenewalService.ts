import { db } from '@config/knex';
import { fabricCAService } from '@services/fabric';
import { walletService } from '@services/wallet/WalletService';
import { certificateMonitor } from './CertificateMonitorService';
import logger from '@core/logger';

export interface RenewalResult {
    success: boolean;
    label: string;
    oldExpiry: Date;
    newExpiry?: Date;
    error?: string;
}

/**
 * Certificate Renewal Service
 * Handles automatic renewal of expiring certificates
 */
export class CertificateRenewalService {
    /**
     * Renew a single certificate by re-enrolling the identity
     * 
     * Strategy: Re-register and re-enroll with Fabric CA
     * This generates a NEW certificate with extended expiry
     * 
     * @param label - Wallet label (e.g., "admin@ibnmsp")
     * @returns Renewal result with success status
     */
    async renewCertificate(label: string): Promise<RenewalResult> {
        try {
            logger.info(`Starting certificate renewal for: ${label}`);

            // 1. Get current wallet
            const wallet = await db('wallets')
                .where({ label })
                .first();

            if (!wallet) {
                throw new Error(`Wallet not found: ${label}`);
            }

            if (wallet.revoked) {
                throw new Error(`Certificate is revoked: ${label}`);
            }

            const oldExpiry = new Date(wallet.certificate_expires_at);

            // 2. Parse label to get username and MSP
            const [username, mspId] = label.split('@');
            const mspIdUpper = mspId.toUpperCase();

            logger.info(`Re-enrolling user: ${username} for MSP: ${mspIdUpper}`);

            // 3. Ensure admin is enrolled (needed for registration)
            await fabricCAService.ensureAdminEnrolled(mspIdUpper);

            // 4. Re-register user with CA to get new enrollment secret
            // Note: Fabric CA allows re-registration of existing users
            const enrollmentSecret = await fabricCAService.registerUser(
                username,
                mspIdUpper,
                wallet.type === 'admin' ? 'admin' : 'client'
            );

            // 5. Re-enroll to get new certificate
            await fabricCAService.enrollUser(
                username,
                enrollmentSecret,
                mspIdUpper
            );

            // 6. Get the renewed certificate from wallet
            const renewedIdentity = await walletService.get(label);

            if (!renewedIdentity) {
                throw new Error('Renewed identity not found in wallet');
            }

            // 7. Extract new expiry date
            const newExpiry = certificateMonitor.extractCertificateExpiry(
                renewedIdentity.certificate
            );

            // 8. Update database with new expiry
            await db('wallets')
                .where({ label })
                .update({
                    certificate_expires_at: newExpiry,
                    updated_at: new Date()
                });

            const extensionDays = Math.floor(
                (newExpiry.getTime() - oldExpiry.getTime()) / (1000 * 60 * 60 * 24)
            );

            logger.info(`Certificate renewed successfully`, {
                label,
                oldExpiry,
                newExpiry,
                extensionDays
            });

            return {
                success: true,
                label,
                oldExpiry,
                newExpiry
            };

        } catch (error: any) {
            logger.error(`Certificate renewal failed for ${label}`, {
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                label,
                oldExpiry: new Date(),
                error: error.message
            };
        }
    }

    /**
     * Auto-renew all certificates expiring within threshold
     * 
     * @param daysThreshold - Renew certificates expiring within N days (default: 30)
     * @returns Summary of renewal results
     */
    async autoRenewExpiringCertificates(daysThreshold: number = 30): Promise<{
        total: number;
        renewed: number;
        failed: number;
        results: RenewalResult[];
    }> {
        try {
            logger.info(`Starting auto-renewal for certificates expiring within ${daysThreshold} days...`);

            // Get expiring certificates
            const expiring = await certificateMonitor.getExpiringCertificates(daysThreshold);

            if (expiring.length === 0) {
                logger.info('No certificates need renewal');
                return {
                    total: 0,
                    renewed: 0,
                    failed: 0,
                    results: []
                };
            }

            logger.info(`Found ${expiring.length} certificates to renew`);

            const results: RenewalResult[] = [];
            let renewed = 0;
            let failed = 0;

            // Renew each certificate sequentially
            for (const cert of expiring) {
                const result = await this.renewCertificate(cert.label);
                results.push(result);

                if (result.success) {
                    renewed++;
                } else {
                    failed++;
                }

                // Small delay to avoid overwhelming CA
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            logger.info('Auto-renewal complete', {
                total: expiring.length,
                renewed,
                failed
            });

            return {
                total: expiring.length,
                renewed,
                failed,
                results
            };

        } catch (error: any) {
            logger.error('Auto-renewal failed', { error: error.message });
            throw error;
        }
    }
}

// Singleton instance
export const certificateRenewal = new CertificateRenewalService();
