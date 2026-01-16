/**
 * Phase 2 Verification Test
 * Tests WalletService encryption/decryption functionality
 */

import { walletService } from './services/wallet/WalletService';
import { db } from './config/knex';

async function testPhase2() {
    console.log('🧪 Phase 2 Verification Test');
    console.log('='.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Service Initialization
        console.log('Test 1: WalletService initialization...');
        if (walletService) {
            console.log('✅ WalletService initialized');
            passed++;
        } else {
            console.log('❌ WalletService not initialized');
            failed++;
        }

        // Test 2: Store encrypted identity
        console.log('\nTest 2: Store encrypted identity...');
        const testIdentity = {
            certificate: '-----BEGIN CERTIFICATE-----\nTEST_CERT\n-----END CERTIFICATE-----',
            privateKey: '-----BEGIN PRIVATE KEY-----\nTEST_SECRET_KEY_12345\n-----END PRIVATE KEY-----',
            mspId: 'Org1MSP',
            type: 'X.509' as const
        };

        await walletService.put('test-phase2@org1', testIdentity);
        console.log('✅ Identity stored');
        passed++;

        // Test 3: Verify encryption in database
        console.log('\nTest 3: Verify encryption in database...');
        const row = await db('wallets').where({ label: 'test-phase2@org1' }).first();

        if (!row) {
            console.log('❌ Wallet not found in database');
            failed++;
        } else {
            // Check private key is encrypted (not plain text)
            if (row.private_key !== testIdentity.privateKey) {
                console.log('✅ Private key is encrypted (not plain text)');
                passed++;
            } else {
                console.log('❌ Private key is NOT encrypted!');
                failed++;
            }

            // Check encryption metadata exists
            if (row.encryption_iv && row.encryption_tag) {
                console.log('✅ Encryption IV and tag present');
                passed++;
            } else {
                console.log('❌ Missing encryption metadata');
                failed++;
            }
        }

        // Test 4: Retrieve and decrypt identity
        console.log('\nTest 4: Retrieve and decrypt identity...');
        const retrieved = await walletService.get('test-phase2@org1');

        if (!retrieved) {
            console.log('❌ Failed to retrieve identity');
            failed++;
        } else {
            if (retrieved.privateKey === testIdentity.privateKey) {
                console.log('✅ Private key decrypted correctly');
                passed++;
            } else {
                console.log('❌ Decryption failed - keys do not match');
                console.log('Expected:', testIdentity.privateKey);
                console.log('Got:', retrieved.privateKey);
                failed++;
            }

            if (retrieved.certificate === testIdentity.certificate) {
                console.log('✅ Certificate retrieved correctly');
                passed++;
            } else {
                console.log('❌ Certificate mismatch');
                failed++;
            }
        }

        // Test 5: List wallets
        console.log('\nTest 5: List wallets...');
        const labels = await walletService.list();
        if (labels.includes('test-phase2@org1')) {
            console.log('✅ Wallet appears in list');
            passed++;
        } else {
            console.log('❌ Wallet not in list');
            failed++;
        }

        // Test 6: Check wallet existence
        console.log('\nTest 6: Check wallet existence...');
        const exists = await walletService.exists('test-phase2@org1');
        if (exists) {
            console.log('✅ Wallet existence check works');
            passed++;
        } else {
            console.log('❌ Wallet existence check failed');
            failed++;
        }

        // Test 7: Remove wallet
        console.log('\nTest 7: Remove wallet...');
        await walletService.remove('test-phase2@org1');
        const stillExists = await walletService.exists('test-phase2@org1');
        if (!stillExists) {
            console.log('✅ Wallet removed successfully');
            passed++;
        } else {
            console.log('❌ Wallet still exists after removal');
            failed++;
        }

        // Test 8: Tamper detection
        console.log('\nTest 8: Tamper detection...');
        await walletService.put('test-tamper@org1', testIdentity);

        // Tamper with encrypted data
        await db('wallets')
            .where({ label: 'test-tamper@org1' })
            .update({ private_key: 'TAMPERED_DATA' });

        try {
            await walletService.get('test-tamper@org1');
            console.log('❌ Tamper detection failed - should have thrown error');
            failed++;
        } catch (error: any) {
            if (error.message.includes('Decryption failed')) {
                console.log('✅ Tamper detection works');
                passed++;
            } else {
                console.log('❌ Wrong error:', error.message);
                failed++;
            }
        }

        // Cleanup
        await db('wallets').where({ label: 'test-tamper@org1' }).delete();

        // Summary
        console.log('');
        console.log('='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
        console.log('');

        if (failed === 0) {
            console.log('🎉 Phase 2 COMPLETE - All tests passed!');
            console.log('✅ Ready to proceed to Phase 3');
            process.exit(0);
        } else {
            console.log('⚠️  Phase 2 INCOMPLETE - Some tests failed');
            console.log('❌ Fix issues before proceeding to Phase 3');
            process.exit(1);
        }

    } catch (error: any) {
        console.log('');
        console.log('❌ Test suite failed with error:');
        console.log(error.message);
        console.log(error.stack);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Run tests
testPhase2();
