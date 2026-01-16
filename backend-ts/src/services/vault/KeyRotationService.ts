import { getVaultService } from './VaultService';
import { db } from '../../config/knex';
import crypto from 'crypto';
import logger from '../../core/logger';

export interface KeyRotationResult {
    success: boolean;
    walletsProcessed: number;
    oldKeyArchived: boolean;
    newKeyStored: boolean;
    errors: string[];
}

export class KeyRotationService {
    private readonly BATCH_SIZE = 100;
    private readonly ALGORITHM = 'aes-256-gcm' as const;

    /**
     * Rotate encryption key
     * WARNING: This re-encrypts ALL private keys!
     * 
     * Process:
     * 1. Generate new KEK (32 bytes)
     * 2. Get current KEK from Vault
     * 3. Fetch all wallets from DB
     * 4. Re-encrypt each wallet with new KEK (batched)
     * 5. Archive old KEK
     * 6. Store new KEK in Vault
     */
    async rotateEncryptionKey(): Promise<KeyRotationResult> {
        const result: KeyRotationResult = {
            success: false,
            walletsProcessed: 0,
            oldKeyArchived: false,
            newKeyStored: false,
            errors: []
        };

        try {
            logger.info('🔄 Starting encryption key rotation...');

            const vault = getVaultService();

            // 1. Generate new KEK (256-bit)
            const newKEK = crypto.randomBytes(32).toString('hex');
            logger.info('Generated new KEK', { keyLength: 64 });

            // 2. Get current KEK from Vault
            const currentSecret = await vault.read('ibn/encryption-key');
            if (!currentSecret || !currentSecret.key) {
                throw new Error('Current KEK not found in Vault');
            }
            const currentKEK = currentSecret.key;
            logger.info('Retrieved current KEK from Vault');

            // 3. Get all encrypted private keys
            const wallets = await db('wallets').select('id', 'label', 'private_key', 'encryption_iv', 'encryption_tag');
            logger.info(`Found ${wallets.length} wallets to re-encrypt`);

            if (wallets.length === 0) {
                logger.warn('No wallets found - key rotation skipped');
                result.success = true;
                return result;
            }

            // 4. Re-encrypt in batches (performance + memory optimization)
            logger.info(`Re-encrypting in batches of ${this.BATCH_SIZE}...`);

            for (let i = 0; i < wallets.length; i += this.BATCH_SIZE) {
                const batch = wallets.slice(i, i + this.BATCH_SIZE);

                await Promise.all(batch.map(async (wallet) => {
                    try {
                        // Decrypt with old key
                        const decipher = crypto.createDecipheriv(
                            this.ALGORITHM,
                            Buffer.from(currentKEK, 'hex'),
                            Buffer.from(wallet.encryption_iv, 'base64')
                        );
                        decipher.setAuthTag(Buffer.from(wallet.encryption_tag, 'base64'));

                        let decrypted = decipher.update(wallet.private_key, 'base64', 'utf8');
                        decrypted += decipher.final('utf8');

                        // Encrypt with new key
                        const iv = crypto.randomBytes(12); // 96 bits for GCM
                        const cipher = crypto.createCipheriv(
                            this.ALGORITHM,
                            Buffer.from(newKEK, 'hex'),
                            iv
                        );

                        let encrypted = cipher.update(decrypted, 'utf8', 'base64');
                        encrypted += cipher.final('base64');
                        const tag = cipher.getAuthTag();

                        // Update database
                        await db('wallets')
                            .where({ id: wallet.id })
                            .update({
                                private_key: encrypted,
                                encryption_iv: iv.toString('base64'),
                                encryption_tag: tag.toString('base64'),
                                updated_at: new Date()
                            });

                        result.walletsProcessed++;
                    } catch (error: any) {
                        const errorMsg = `Failed to rotate key for wallet ${wallet.label}: ${error.message}`;
                        logger.error(errorMsg);
                        result.errors.push(errorMsg);
                    }
                }));

                const progress = Math.round((result.walletsProcessed / wallets.length) * 100);
                logger.info(`Progress: ${result.walletsProcessed}/${wallets.length} wallets (${progress}%)`);
            }

            // Check if all wallets processed successfully
            if (result.errors.length > 0) {
                throw new Error(`Key rotation incomplete: ${result.errors.length} wallet(s) failed`);
            }

            // 5. Archive old key
            const archivePath = `ibn/encryption-key-archive/${Date.now()}`;
            await vault.write(archivePath, {
                key: currentKEK,
                archived_at: new Date().toISOString(),
                reason: 'key_rotation',
                replaced_by: 'new_kek_generated',
                wallets_count: wallets.length
            });
            result.oldKeyArchived = true;
            logger.info(`Old KEK archived to ${archivePath}`);

            // 6. Store new key in Vault
            await vault.write('ibn/encryption-key', {
                key: newKEK,
                created_at: new Date().toISOString(),
                rotated_at: new Date().toISOString(),
                algorithm: 'AES-256-GCM',
                previous_key_archived: archivePath
            });
            result.newKeyStored = true;
            logger.info('New KEK stored in Vault');

            result.success = true;
            logger.info('✅ Encryption key rotation complete', {
                walletsProcessed: result.walletsProcessed,
                batchSize: this.BATCH_SIZE,
                duration: 'logged_by_caller'
            });

            return result;

        } catch (error: any) {
            logger.error('❌ Key rotation FAILED', {
                error: error.message,
                stack: error.stack,
                walletsProcessed: result.walletsProcessed
            });
            throw error;
        }
    }

    /**
     * Get rotation history from Vault
     */
    async getRotationHistory(): Promise<string[]> {
        try {
            const vault = getVaultService();
            const keys = await vault.list('ibn/encryption-key-archive');
            return keys.sort().reverse(); // Latest first
        } catch (error: any) {
            logger.error('Failed to get rotation history', { error: error.message });
            return [];
        }
    }

    /**
     * Dry run - validate all wallets can be decrypted with current KEK
     */
    async validateCurrentKeys(): Promise<{ valid: number; invalid: number; errors: string[] }> {
        const result = { valid: 0, invalid: 0, errors: [] as string[] };

        try {
            const vault = getVaultService();
            const secret = await vault.read('ibn/encryption-key');
            if (!secret || !secret.key) {
                throw new Error('Current KEK not found');
            }
            const currentKEK = secret.key;

            const wallets = await db('wallets').select('id', 'label', 'private_key', 'encryption_iv', 'encryption_tag');

            for (const wallet of wallets) {
                try {
                    const decipher = crypto.createDecipheriv(
                        this.ALGORITHM,
                        Buffer.from(currentKEK, 'hex'),
                        Buffer.from(wallet.encryption_iv, 'base64')
                    );
                    decipher.setAuthTag(Buffer.from(wallet.encryption_tag, 'base64'));

                    decipher.update(wallet.private_key, 'base64', 'utf8');
                    decipher.final('utf8');

                    result.valid++;
                } catch (error: any) {
                    result.invalid++;
                    result.errors.push(`Wallet ${wallet.label}: ${error.message}`);
                }
            }

            logger.info('Validation complete', result);
            return result;

        } catch (error: any) {
            logger.error('Validation failed', { error: error.message });
            throw error;
        }
    }
}

// Export singleton instance
export const keyRotationService = new KeyRotationService();
