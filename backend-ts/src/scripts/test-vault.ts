import { initVaultService } from '@services/vault/VaultService';
import logger from '@core/logger';

/**
 * Test Vault service functionality
 * Run: npx ts-node src/scripts/test-vault.ts
 */
async function testVault() {
    try {
        logger.info('🧪 Testing Vault Service...\n');

        // Initialize
        const vault = initVaultService();

        // Test 1: Health check
        logger.info('Test 1: Health Check');
        const healthy = await vault.healthCheck();
        logger.info(`✅ Vault healthy: ${healthy}\n`);

        // Test 2: Get status
        logger.info('Test 2: Get Status');
        const status = await vault.getStatus();
        logger.info('Status:', status);
        logger.info('');

        // Test 3: Write secret
        logger.info('Test 3: Write Secret');
        await vault.write('ibn/test', {
            message: 'Hello from VaultService',
            timestamp: new Date().toISOString()
        });
        logger.info('✅ Secret written\n');

        // Test 4: Read secret
        logger.info('Test 4: Read Secret');
        const data = await vault.read('ibn/test');
        logger.info('Read data:', data);
        logger.info('');

        // Test 5: List secrets
        logger.info('Test 5: List Secrets');
        const keys = await vault.list('ibn');
        logger.info('Keys found:', keys);
        logger.info('');

        // Test 6: Delete secret
        logger.info('Test 6: Delete Secret');
        await vault.delete('ibn/test');
        logger.info('✅ Secret deleted\n');

        // Test 7: Verify deletion
        logger.info('Test 7: Verify Deletion');
        const deletedData = await vault.read('ibn/test');
        logger.info(`✅ Data after delete: ${deletedData === null ? 'null (correct!)' : 'still exists (error!)'}\n`);

        logger.info('🎉 All Vault tests PASSED!\n');
        process.exit(0);
    } catch (error: any) {
        logger.error('❌ Vault test FAILED:', error.message);
        logger.error(error.stack);
        process.exit(1);
    }
}

testVault();
