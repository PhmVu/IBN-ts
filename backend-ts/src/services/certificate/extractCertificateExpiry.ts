import { db } from '@config/knex';
import { X509Certificate } from 'crypto';
import logger from '@core/logger';

/**
 * Extract and populate certificate expiry dates for wallets
 * This runs automatically on backend startup
 */
export async function extractCertificateExpiry(): Promise<void> {
    try {
        logger.info('Checking for certificates without expiry dates...');

        // Get wallets without expiry dates
        const wallets = await db('wallets')
            .select('id', 'label', 'certificate')
            .whereNotNull('certificate')
            .whereNull('certificate_expires_at');

        if (wallets.length === 0) {
            logger.info('All certificates already have expiry dates');
            return;
        }

        logger.info(`Found ${wallets.length} certificates to process`);

        let updated = 0;
        let errors = 0;

        for (const wallet of wallets) {
            try {
                // Parse X.509 certificate
                const cert = new X509Certificate(wallet.certificate);

                // Extract expiry date
                const expiryDate = new Date(cert.validTo);

                // Update database
                await db('wallets')
                    .where({ id: wallet.id })
                    .update({
                        certificate_expires_at: expiryDate,
                        updated_at: new Date()
                    });

                updated++;

                const daysUntilExpiry = Math.floor(
                    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                logger.info(`Updated ${wallet.label}: expires in ${daysUntilExpiry} days`);

            } catch (error: any) {
                errors++;
                logger.error(`Failed to process ${wallet.label}:`, error.message);
            }
        }

        logger.info('Certificate expiry extraction complete', {
            total: wallets.length,
            updated,
            errors
        });

    } catch (error: any) {
        logger.error('Certificate expiry extraction failed:', error.message);
        // Don't throw - allow backend to continue starting
    }
}
