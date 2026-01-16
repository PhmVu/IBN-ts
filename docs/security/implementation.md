Phase 2A: Certificate Lifecycle Management - Implementation Plan
Version: 1.0
Date: 2026-01-10
Status: Planning → Ready for Implementation
Estimated Duration: 2 working days (16 hours)

🎯 Objectives
Primary Goal
Implement automated certificate lifecycle management to prevent service outages due to certificate expiration.

Success Criteria
 All certificates tracked with expiry dates in database
 Automated monitoring detects expiring certificates
 Automated renewal workflow tested and verified
 Email/log alerts configured
 Zero downtime during certificate renewal
 Compliance: 70% → 85% (Hyperledger + NIST standards)
📋 Pre-Implementation Checklist
Environment Verification
 Backend service running and healthy
 Database accessible (PostgreSQL)
 Fabric CA accessible and responding
 Current certificates inventoried
 Backup of wallets table created
Risk Assessment
Risk	Likelihood	Impact	Mitigation
Certificate renewal fails	Medium	High	Rollback plan + manual renewal procedure
Production downtime	Low	Critical	Test in staging first, gradual rollout
Data corruption	Low	Critical	Database backups before each step
CA service unavailable	Low	High	Retry logic + alerts
📦 Part 1: Database Schema Enhancement
Step 1.1: Create Migration File
Duration: 15 minutes

File: backend-ts/src/database/knex-migrations/20260110100000_add_certificate_lifecycle.ts

import { Knex } from 'knex';
export async function up(knex: Knex): Promise<void> {
  // Check if columns already exist (idempotent)
  const hasExpiryColumn = await knex.schema.hasColumn('wallets', 'certificate_expires_at');
  const hasNotifiedColumn = await knex.schema.hasColumn('wallets', 'certificate_notified_at');
  const hasRevokedColumn = await knex.schema.hasColumn('wallets', 'revoked');
  
  await knex.schema.alterTable('wallets', (table) => {
    // Certificate expiry tracking
    if (!hasExpiryColumn) {
      table.timestamp('certificate_expires_at').nullable();
    }
    
    // Expiry notification tracking (prevent spam)
    if (!hasNotifiedColumn) {
      table.timestamp('certificate_notified_at').nullable();
    }
    
    // Revocation tracking (enhanced)
    if (!hasRevokedColumn) {
      table.boolean('revoked').defaultTo(false);
      table.timestamp('revoked_at').nullable();
      table.string('revocation_reason', 100).nullable();
    }
  });
  
  // Create indexes for efficient queries
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_wallets_expiry 
    ON wallets(certificate_expires_at) 
    WHERE certificate_expires_at IS NOT NULL;
  `);
  
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_wallets_revoked 
    ON wallets(revoked) 
    WHERE revoked = true;
  `);
  
  console.log('✅ Certificate lifecycle columns added to wallets table');
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_wallets_expiry');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_wallets_revoked');
  
  await knex.schema.alterTable('wallets', (table) => {
    table.dropColumn('certificate_expires_at');
    table.dropColumn('certificate_notified_at');
    table.dropColumn('revoked');
    table.dropColumn('revoked_at');
    table.dropColumn('revocation_reason');
  });
  
  console.log('✅ Certificate lifecycle columns removed');
}
Verification:

# Test migration locally
docker-compose exec backend-api npx knex migrate:latest
# Verify columns added
docker-compose exec postgres psql -U ibn_user -d ibn_db -c "\d wallets"
# Should see:
# - certificate_expires_at
# - certificate_notified_at  
# - revoked
# - revoked_at
# - revocation_reason
Rollback:

docker-compose exec backend-api npx knex migrate:rollback
Step 1.2: Extract Expiry from Existing Certificates
Duration: 30 minutes

File: backend-ts/src/scripts/extract-certificate-expiry.ts

import { db } from '@config/knex';
import { X509Certificate } from 'crypto';
import logger from '@core/logger';
/**
 * Extract certificate expiry dates from existing wallets
 * Run once after migration
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
Verification:

# Run extraction script
docker-compose exec backend-api npx ts-node src/scripts/extract-certificate-expiry.ts
# Verify expiry dates populated
docker-compose exec postgres psql -U ibn_user -d ibn_db -c "
SELECT 
  label, 
  certificate_expires_at,
  EXTRACT(DAY FROM (certificate_expires_at - NOW())) as days_until_expiry
FROM wallets 
WHERE certificate_expires_at IS NOT NULL
ORDER BY certificate_expires_at;
"
Expected Output:

label      | certificate_expires_at | days_until_expiry 
-----------------+------------------------+-------------------
 admin@ibnmsp    | 2027-01-10 07:05:54   |              365
 testuser@ibnmsp | 2027-01-10 07:05:54   |              365
📦 Part 2: Certificate Monitor Service
Step 2.1: Create CertificateMonitorService
Duration: 1 hour

File: backend-ts/src/services/certificate/CertificateMonitorService.ts

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
export class CertificateMonitorService {
  /**
   * Extract expiry date from X.509 certificate
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
   * Daily monitoring job - check and alert
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
Unit Tests:

File: backend-ts/tests/unit/services/CertificateMonitorService.test.ts

import { certificateMonitor } from '@services/certificate/CertificateMonitorService';
import { db } from '@config/knex';
describe('CertificateMonitorService', () => {
  beforeEach(async () => {
    // Clear test data
    await db('wallets').delete();
  });
  describe('extractCertificateExpiry', () => {
    it('should extract expiry date from valid certificate', () => {
      const validCert = `-----BEGIN CERTIFICATE-----
... (test certificate) ...
-----END CERTIFICATE-----`;
      
      const expiry = certificateMonitor.extractCertificateExpiry(validCert);
      expect(expiry).toBeInstanceOf(Date);
    });
    it('should throw error for invalid certificate', () => {
      expect(() => {
        certificateMonitor.extractCertificateExpiry('invalid');
      }).toThrow('Invalid certificate');
    });
  });
  describe('getExpiringCertificates', () => {
    it('should return certificates expiring within threshold', async () => {
      // Insert test wallet expiring in 15 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);
      await db('wallets').insert({
        label: 'test@msp',
        certificate: 'test-cert',
        certificate_expires_at: expiryDate,
        revoked: false
      });
      const expiring = await certificateMonitor.getExpiringCertificates(30);
      expect(expiring.length).toBe(1);
      expect(expiring[0].daysRemaining).toBeCloseTo(15, 0);
    });
    it('should not return revoked certificates', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);
      await db('wallets').insert({
        label: 'revoked@msp',
        certificate: 'test-cert',
        certificate_expires_at: expiryDate,
        revoked: true
      });
      const expiring = await certificateMonitor.getExpiringCertificates(30);
      expect(expiring.length).toBe(0);
    });
  });
});
Verification:

# Run unit tests
docker-compose exec backend-api npm test -- CertificateMonitorService
# Manual test
docker-compose exec backend-api npx ts-node -e "
const { certificateMonitor } = require('./dist/services/certificate/CertificateMonitorService');
certificateMonitor.runDailyCheck().then(console.log);
"
📦 Part 3: Certificate Renewal Service
Step 3.1: Create CertificateRenewalService
Duration: 2 hours

File: backend-ts/src/services/certificate/CertificateRenewalService.ts

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
export class CertificateRenewalService {
  /**
   * Renew a single certificate
   * 
   * Strategy: Re-enroll with Fabric CA using existing identity
   * Note: This generates a NEW certificate but can reuse private key
   */
  async renewCertificate(
    label: string,
    reusePrivateKey: boolean = true
  ): Promise<RenewalResult> {
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
      // 3. Get enrollment secret (need to register again or use stored secret)
      // Note: In production, we'd store the enrollment secret encrypted
      // For now, we'll re-register the user to get a new secret
      
      logger.info(`Re-registering user for renewal: ${username}`);
      
      // Ensure admin is enrolled
      await fabricCAService.ensureAdminEnrolled(mspIdUpper);
      
      // Re-register (Fabric CA allows this)
      const enrollmentSecret = await fabricCAService.registerUser(
        username,
        mspIdUpper,
        wallet.type === 'admin' ? 'admin' : 'client'
      );
      // 4. Re-enroll to get new certificate
      logger.info(`Re-enrolling user: ${username}`);
      
      const certSerial = await fabricCAService.enrollUser(
        username,
        enrollmentSecret,
        mspIdUpper
      );
      // 5. Get the new certificate from wallet
      const renewedIdentity = await walletService.get(label);
      
      if (!renewedIdentity) {
        throw new Error('Renewed identity not found in wallet');
      }
      // 6. Extract new expiry date
      const newExpiry = certificateMonitor.extractCertificateExpiry(
        renewedIdentity.certificate
      );
      // 7. Update database
      await db('wallets')
        .where({ label })
        .update({
          certificate_expires_at: newExpiry,
          updated_at: new Date()
        });
      logger.info(`Certificate renewed successfully`, {
        label,
        oldExpiry,
        newExpiry,
        extensionDays: Math.floor(
          (newExpiry.getTime() - oldExpiry.getTime()) / (1000 * 60 * 60 * 24)
        )
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
   * Auto-renew certificates expiring within threshold
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
      // Renew each certificate
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
Manual Test Script:

File: backend-ts/src/scripts/test-renewal.ts

import { certificateRenewal } from '@services/certificate/CertificateRenewalService';
import { certificateMonitor } from '@services/certificate/CertificateMonitorService';
import logger from '@core/logger';
async function testRenewal() {
  try {
    // 1. Check current certificates
    logger.info('Current certificate status:');
    const expiring = await certificateMonitor.getExpiringCertificates(365); // All certs
    
    expiring.forEach(cert => {
      logger.info(`${cert.label}: expires in ${cert.daysRemaining} days`);
    });
    // 2. Test renew first certificate
    if (expiring.length > 0) {
      const testCert = expiring[0];
      logger.info(`\nTesting renewal for: ${testCert.label}`);
      
      const result = await certificateRenewal.renewCertificate(testCert.label);
      
      if (result.success) {
        logger.info('✅ Renewal successful!', {
          oldExpiry: result.oldExpiry,
          newExpiry: result.newExpiry
        });
      } else {
        logger.error('❌ Renewal failed:', result.error);
      }
    }
  } catch (error: any) {
    logger.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}
testRenewal();
📦 Part 4: Cron Job Integration
Step 4.1: Setup Certificate Monitoring Cron
Duration: 30 minutes

File: backend-ts/src/jobs/certificateMonitorJob.ts

import cron from 'node-cron';
import { certificateMonitor } from '@services/certificate/CertificateMonitorService';
import { certificateRenewal } from '@services/certificate/CertificateRenewalService';
import logger from '@core/logger';
/**
 * Daily certificate monitoring and auto-renewal job
 * Runs every day at 00:00 UTC
 */
export function startCertificateMonitoringJob() {
  // Schedule: Every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('🔍 Running scheduled certificate monitoring...');
      // 1. Run daily check
      const checkResult = await certificateMonitor.runDailyCheck();
      // 2. Auto-renew certificates expiring within 30 days
      if (checkResult.expiring30Days > 0) {
        logger.info(`Starting auto-renewal for ${checkResult.expiring30Days} certificates...`);
        
        const renewalResult = await certificateRenewal.autoRenewExpiringCertificates(30);
        if (renewalResult.failed > 0) {
          logger.error(`⚠️  ${renewalResult.failed} certificate renewals failed!`, {
            failures: renewalResult.results.filter(r => !r.success)
          });
        }
        if (renewalResult.renewed > 0) {
          logger.info(`✅ Successfully renewed ${renewalResult.renewed} certificates`);
        }
      }
      logger.info('Certificate monitoring job complete');
    } catch (error: any) {
      logger.error('Certificate monitoring job failed', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  logger.info('✅ Certificate monitoring cron job started (daily at 00:00 UTC)');
}
Update: 
backend-ts/src/index.ts

// ... existing imports ...
import { startCertificateMonitoringJob } from './jobs/certificateMonitorJob';
// ... existing code ...
// Start server
app.listen(PORT, () => {
  logger.info(`Backend API running on http://0.0.0.0:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('API documentation: Swagger coming soon');
  // Start certificate monitoring job
  if (process.env.ENABLE_CERT_MONITORING !== 'false') {
    startCertificateMonitoringJob();
  }
});
✅ Testing & Verification Plan
Test Case 1: Migration
# 1. Backup database
docker-compose exec postgres pg_dump -U ibn_user ibn_db > backup.sql
# 2. Run migration
docker-compose exec backend-api npx knex migrate:latest
# 3. Verify schema
docker-compose exec postgres psql -U ibn_user -d ibn_db -c "\d wallets"
# Expected: New columns visible
# 4. Rollback test
docker-compose exec backend-api npx knex migrate:rollback
# 5. Re-apply
docker-compose exec backend-api npx knex migrate:latest
Test Case 2: Expiry Extraction
# Run extraction
docker-compose exec backend-api npx ts-node src/scripts/extract-certificate-expiry.ts
# Verify
docker-compose exec postgres psql -U ibn_user -d ibn_db -c "
SELECT label, certificate_expires_at 
FROM wallets 
WHERE certificate_expires_at IS NOT NULL;
"
# Expected: All certificates have expiry dates
Test Case 3: Monitoring
# Manual check
docker-compose exec backend-api npx ts-node -e "
const { certificateMonitor } = require('./dist/services/certificate/CertificateMonitorService');
certificateMonitor.runDailyCheck().then(console.log);
"
# Expected output:
# {
#   expiring30Days: 0,
#   expiring7Days: 0,
#   expired: 0
# }
Test Case 4: Renewal
# Test renewal script
docker-compose exec backend-api npx ts-node src/scripts/test-renewal.ts
# Verify in logs:
# - Certificate renewed successfully
# - New expiry date > old expiry date
# Verify in DB
docker-compose exec postgres psql -U ibn_user -d ibn_db -c "
SELECT label, certificate_expires_at 
FROM wallets 
ORDER BY updated_at DESC 
LIMIT 5;
"
Test Case 5: Cron Job
# Check cron started
docker logs ibnts-backend-api | grep "Certificate monitoring cron"
# Expected: "✅ Certificate monitoring cron job started"
# Trigger manually (for testing)
docker-compose exec backend-api npx ts-node -e "
const { startCertificateMonitoringJob } = require('./dist/jobs/certificateMonitorJob');
startCertificateMonitoringJob();
"
🚨 Rollback Plan
If Migration Fails
# Rollback migration
docker-compose exec backend-api npx knex migrate:rollback
# Restore database from backup
docker-compose exec -T postgres psql -U ibn_user ibn_db < backup.sql
If Renewal Fails
Certificate renewal is non-destructive (creates new cert, doesn't delete old)
Users can continue using old certificate until it expires
Manual renewal procedure:
# Re-enroll user manually
curl -X POST http://localhost:37080/api/v1/users/:id/enroll
Emergency Procedures
# Stop cron job
# Set environment variable
export ENABLE_CERT_MONITORING=false
# Restart backend
docker-compose restart backend-api
📊 Implementation Timeline
Day 1 (Morning)
✅ Create migration file (15 min)
✅ Test migration locally (15 min)
✅ Create extraction script (30 min)
✅ Run extraction and verify (30 min)
✅ Code review checkpoint
Day 1 (Afternoon)
✅ Create CertificateMonitorService (1 hour)
✅ Write unit tests (30 min)
✅ Manual testing (30 min)
✅ Code review checkpoint
Day 2 (Morning)
✅ Create CertificateRenewalService (2 hours)
✅ Test renewal workflow (1 hour)
✅ Code review checkpoint
Day 2 (Afternoon)
✅ Setup cron job (30 min)
✅ Integration testing (1 hour)
✅ Documentation update (30 min)
✅ Deploy to production (30 min)
📚 Documentation Updates
Files to Update
doc/v0.0.3/enroll.md
 - Mark Phase 2A complete
walkthrough.md
 - Add certificate lifecycle documentation
README.md - Add certificate monitoring section
✅ Definition of Done
 All code written and reviewed
 All unit tests passing
 Manual tests completed successfully
 Migration tested with rollback
 Cron job running and verified
 Documentation updated
 Production deployment successful
 Monitoring alerts configured
 Team training completed
Ready to proceed? Reply "start" to begin implementation! 🚀

