import { db } from '@config/knex';
import { X509Certificate } from 'crypto';
import logger from '@core/logger';

export interface ExpiringCertificate {
    id: string;
    label: string;
    userId: string | null;
    expiresAt: Date;
    daysRemaining: number;
    type: string;
}

/**
 * Certificate Monitor Service
 * Monitors certificate expiry dates and alerts for expiring/expired certificates
 */
export class CertificateMonitorService {
    /**
     * Extract expiry date from X.509 certificate PEM string
     */
    extractCertificateExpiry(certificatePem: string): Date {
        try {
            const cert = new X509Certificate(certificatePem);
            return new Date(cert.validTo);
        } catch (error: any) {
            logger.error('Failed to parse certificate', { error: error.message });
            throw new Error(`Invalid certificate: ${error.message}`);
        }
    }

    /**
     * Get certificates expiring within threshold days
     * @param daysThreshold - Number of days to look ahead (default: 30)
     * @returns Array of expiring certificates
     */
    async getExpiringCertificates(daysThreshold: number = 30): Promise<ExpiringCertificate[]> {
        try {
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

            const expiring = await db('wallets')
                .select(
                    'wallets.id',
                    'wallets.label',
                    'wallets.certificate_expires_at as expiresAt',
                    'wallets.type',
                    'users.id as userId'
                )
                .leftJoin('users', 'users.fabric_identity_id', 'wallets.label')
                .whereNotNull('wallets.certificate_expires_at')
                .where('wallets.revoked', false)
                .where('wallets.certificate_expires_at', '<=', thresholdDate)
                .where('wallets.certificate_expires_at', '>', new Date())
                .orderBy('wallets.certificate_expires_at', 'asc');

            return expiring.map(row => {
                const daysRemaining = Math.floor(
                    (new Date(row.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return {
                    id: row.id,
                    label: row.label,
                    userId: row.userId,
                    expiresAt: new Date(row.expiresAt),
                    daysRemaining,
                    type: row.type
                };
            });
        } catch (error: any) {
            logger.error('Failed to get expiring certificates', { error: error.message });
            throw error;
        }
    }

    /**
     * Get certificates that have already expired
     * @returns Array of expired certificates
     */
    async getExpiredCertificates(): Promise<ExpiringCertificate[]> {
        try {
            const expired = await db('wallets')
                .select(
                    'wallets.id',
                    'wallets.label',
                    'wallets.certificate_expires_at as expiresAt',
                    'wallets.type',
                    'users.id as userId'
                )
                .leftJoin('users', 'users.fabric_identity_id', 'wallets.label')
                .whereNotNull('wallets.certificate_expires_at')
                .where('wallets.revoked', false)
                .where('wallets.certificate_expires_at', '<', new Date())
                .orderBy('wallets.certificate_expires_at', 'asc');

            return expired.map(row => ({
                id: row.id,
                label: row.label,
                userId: row.userId,
                expiresAt: new Date(row.expiresAt),
                daysRemaining: Math.floor(
                    (new Date(row.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                ),
                type: row.type
            }));
        } catch (error: any) {
            logger.error('Failed to get expired certificates', { error: error.message });
            throw error;
        }
    }

    /**
     * Run daily certificate expiry check
     * Checks multiple thresholds and logs alerts
     * @returns Summary of check results
     */
    async runDailyCheck(): Promise<{
        expiring30Days: number;
        expiring7Days: number;
        expired: number;
    }> {
        try {
            logger.info('Running daily certificate expiry check...');

            // Check different thresholds
            const expiring30 = await this.getExpiringCertificates(30);
            const expiring7 = await this.getExpiringCertificates(7);
            const expired = await this.getExpiredCertificates();

            logger.info('Certificate expiry check complete', {
                expiring30Days: expiring30.length,
                expiring7Days: expiring7.length,
                expired: expired.length
            });

            // Alert for critical expirations (< 7 days)
            if (expiring7.length > 0) {
                logger.warn(`⚠️  ${expiring7.length} certificates expiring within 7 days!`, {
                    certificates: expiring7.map(c => ({
                        label: c.label,
                        daysRemaining: c.daysRemaining
                    }))
                });
            }

            // Alert for expired certificates
            if (expired.length > 0) {
                logger.error(`🔴 ${expired.length} certificates have EXPIRED!`, {
                    certificates: expired.map(c => c.label)
                });
            }

            return {
                expiring30Days: expiring30.length,
                expiring7Days: expiring7.length,
                expired: expired.length
            };
        } catch (error: any) {
            logger.error('Daily certificate check failed', { error: error.message });
            throw error;
        }
    }
}

// Singleton instance
export const certificateMonitor = new CertificateMonitorService();
