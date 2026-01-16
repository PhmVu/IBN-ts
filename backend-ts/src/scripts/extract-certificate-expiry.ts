import { db } from '../config/knex';
import { X509Certificate } from 'crypto';
// Use console instead of logger for standalone script
const logger = {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args)
};

/**
 * Extract certificate expiry dates from existing wallets
 * Run once after migration to populate certificate_expires_at
 */
async function extractCertificateExpiry() {
    try {
        logger.info('Starting certificate expiry extraction...');

        // Get all wallets with certificates
        const wallets = await db('wallets')
            .select('id', 'label', 'certificate')
            .whereNotNull('certificate');

        logger.info(`Found ${wallets.length} certificates to process`);

        let updated = 0;
        let errors = 0;

        for (const wallet of wallets) {
            try {
                // Parse X.509 certificate
                const cert = new X509Certificate(wallet.certificate);

                // Extract expiry date (validTo is a string like "Dec 31 23:59:59 2025 GMT")
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

        process.exit(0);
    } catch (error: any) {
        logger.error('Extraction failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    extractCertificateExpiry();
}

export { extractCertificateExpiry };
