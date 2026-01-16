import cron from 'node-cron';
import { certificateMonitor } from '@services/certificate/CertificateMonitorService';
import { certificateRenewal } from '@services/certificate/CertificateRenewalService';
import logger from '@core/logger';

/**
 * Daily Certificate Monitoring Job
 * 
 * Schedule: Every day at 00:00 UTC
 * 
 * Actions:
 * 1. Check for expiring certificates (30 days, 7 days)
 * 2. Check for expired certificates
 * 3. Auto-renew certificates expiring within 30 days
 * 4. Log alerts for critical situations
 */
export function startCertificateMonitoringJob() {
    // Schedule: Every day at midnight UTC
    // Cron syntax: minute hour day month weekday
    cron.schedule('0 0 * * *', async () => {
        try {
            logger.info('🔍 Running scheduled certificate monitoring...');

            // 1. Run daily expiry check
            const checkResult = await certificateMonitor.runDailyCheck();

            // 2. Auto-renew certificates expiring within 30 days
            if (checkResult.expiring30Days > 0) {
                logger.info(`Starting auto-renewal for ${checkResult.expiring30Days} certificates...`);

                const renewalResult = await certificateRenewal.autoRenewExpiringCertificates(30);

                // Log renewal failures
                if (renewalResult.failed > 0) {
                    logger.error(`⚠️  ${renewalResult.failed} certificate renewals failed!`, {
                        failures: renewalResult.results
                            .filter(r => !r.success)
                            .map(r => ({
                                label: r.label,
                                error: r.error
                            }))
                    });
                }

                // Log renewal successes
                if (renewalResult.renewed > 0) {
                    logger.info(`✅ Successfully renewed ${renewalResult.renewed} certificates`);
                }
            }

            logger.info('Certificate monitoring job complete', {
                expiring30Days: checkResult.expiring30Days,
                expiring7Days: checkResult.expiring7Days,
                expired: checkResult.expired
            });

        } catch (error: any) {
            logger.error('Certificate monitoring job failed', {
                error: error.message,
                stack: error.stack
            });
        }
    });

    logger.info('✅ Certificate monitoring cron job started (daily at 00:00 UTC)');
}
