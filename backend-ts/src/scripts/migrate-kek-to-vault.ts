import { initVaultService } from '@services/vault/VaultService';
import logger from '@core/logger';

/**
 * Migrate encryption key from .env to Vault
 * Run once: npx ts-node src/scripts/migrate-kek-to-vault.ts
 */
async function migrateKEK() {
    try {
        logger.info('🔄 Migrating KEK to Vault...');

        const vault = initVaultService();

        // 1. Get current KEK from environment
        const currentKEK = process.env.WALLET_ENCRYPTION_KEY;
        if (!currentKEK) {
            throw new Error('WALLET_ENCRYPTION_KEY not found in environment');
        }

        logger.info('Found KEK in environment', {
            length: currentKEK.length,
            format: 'hex'
        });

        // 2. Check if already migrated
        const existing = await vault.read('ibn/encryption-key');
        if (existing) {
            logger.warn('⚠️  KEK already exists in Vault!');
            logger.info('Existing KEK details:', existing);

            const proceed = true; // Auto-proceed for script
            if (!proceed) {
                logger.info('Migration cancelled');
                process.exit(0);
            }

            logger.info('Overwriting existing KEK...');
        }

        // 3. Store in Vault (KV v2 format)
        await vault.write('ibn/encryption-key', {
            key: currentKEK,
            migrated_at: new Date().toISOString(),
            algorithm: 'AES-256-GCM',
            source: 'env_migration',
            key_length: currentKEK.length,
            purpose: 'Wallet private key encryption'
        });

        logger.info('✅ KEK migrated to Vault successfully');
        logger.info('');
        logger.warn('⚠️  IMPORTANT NEXT STEPS:');
        logger.warn('  1. Verify backend can read from Vault');
        logger.warn('  2. Test enrollment with new user');
        logger.warn('  3. After verification, remove WALLET_ENCRYPTION_KEY from .env');
        logger.info('');

        // 4. Verify by reading back
        const verification = await vault.read('ibn/encryption-key');
        if (verification && verification.key === currentKEK) {
            logger.info('✅ Verification: KEK successfully stored and retrieved');
        } else {
            logger.error('❌ Verification FAILED: KEK mismatch!');
            process.exit(1);
        }

        process.exit(0);
    } catch (error: any) {
        logger.error('❌ KEK migration failed', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

migrateKEK();
