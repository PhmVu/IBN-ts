import { keyRotationService } from '../services/vault/KeyRotationService';
import logger from '../core/logger';

/**
 * Test script for key rotation functionality
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/test-key-rotation.ts          # Dry run (validate only)
 *   npx ts-node -r tsconfig-paths/register src/scripts/test-key-rotation.ts rotate   # Execute rotation
 */
async function testKeyRotation() {
    const command = process.argv[2] || 'validate';

    try {
        // Initialize VaultService first
        const { initVaultService } = require('../services/vault/VaultService');
        initVaultService();
        logger.info('VaultService initialized\n');

        logger.info('='.repeat(60));
        logger.info('🔐 Key Rotation Test Script');
        logger.info('='.repeat(60));
        logger.info('');

        if (command === 'validate') {
            // Dry run - validate all keys can be decrypted
            logger.info('📋 Running validation (dry run)...\n');

            const validation = await keyRotationService.validateCurrentKeys();

            logger.info('Validation Results:');
            logger.info(`  ✅ Valid wallets: ${validation.valid}`);
            logger.info(`  ❌ Invalid wallets: ${validation.invalid}`);

            if (validation.errors.length > 0) {
                logger.error('\nErrors found:');
                validation.errors.forEach((err, i) => {
                    logger.error(`  ${i + 1}. ${err}`);
                });
                process.exit(1);
            }

            logger.info('\n✅ All wallets valid - ready for rotation!\n');
            logger.info('To execute rotation, run:');
            logger.info('  docker-compose exec backend-api npx ts-node -r tsconfig-paths/register src/scripts/test-key-rotation.ts rotate\n');

        } else if (command === 'rotate') {
            // Execute actual key rotation
            logger.warn('⚠️  EXECUTING KEY ROTATION - This will re-encrypt ALL wallets!');
            logger.warn('   Make sure you have a database backup!\n');

            // Wait 3 seconds for user to cancel if needed
            logger.info('Starting in 3 seconds... (Ctrl+C to cancel)');
            await new Promise(resolve => setTimeout(resolve, 3000));

            const startTime = Date.now();
            const result = await keyRotationService.rotateEncryptionKey();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            logger.info('');
            logger.info('='.repeat(60));
            logger.info('📊 Rotation Results:');
            logger.info('='.repeat(60));
            logger.info(`  Success: ${result.success ? '✅' : '❌'}`);
            logger.info(`  Wallets processed: ${result.walletsProcessed}`);
            logger.info(`  Old key archived: ${result.oldKeyArchived ? '✅' : '❌'}`);
            logger.info(`  New key stored: ${result.newKeyStored ? '✅' : '❌'}`);
            logger.info(`  Errors: ${result.errors.length}`);
            logger.info(`  Duration: ${duration}s`);
            logger.info('');

            if (result.errors.length > 0) {
                logger.error('Errors encountered:');
                result.errors.forEach((err, i) => {
                    logger.error(`  ${i + 1}. ${err}`);
                });
                process.exit(1);
            }

            if (result.success) {
                logger.info('✅ Key rotation completed successfully!\n');
                logger.info('Next steps:');
                logger.info('  1. Test user enrollment with new key');
                logger.info('  2. Verify existing users can still access wallets');
                logger.info('  3. Check rotation history in Vault\n');
            }

        } else if (command === 'history') {
            // Show rotation history
            logger.info('📜 Rotation History:\n');

            const history = await keyRotationService.getRotationHistory();

            if (history.length === 0) {
                logger.info('  No rotation history found\n');
            } else {
                history.forEach((key, i) => {
                    const timestamp = key.split('/').pop();
                    const date = timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Unknown';
                    logger.info(`  ${i + 1}. ${date} - ${key}`);
                });
                logger.info('');
            }

        } else {
            logger.error(`Unknown command: ${command}`);
            logger.info('\nUsage:');
            logger.info('  npx ts-node -r tsconfig-paths/register src/scripts/test-key-rotation.ts [command]');
            logger.info('');
            logger.info('Commands:');
            logger.info('  validate  - Validate all wallets can be decrypted (default)');
            logger.info('  rotate    - Execute key rotation');
            logger.info('  history   - Show rotation history');
            logger.info('');
            process.exit(1);
        }

        process.exit(0);

    } catch (error: any) {
        logger.error('❌ Test failed:', error.message);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Run test
testKeyRotation();
