#!/usr/bin/env ts-node
/**
 * Enroll Admin Script
 * 
 * This script enrolls the admin user with Fabric CA
 * Run this ONCE during initial setup
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/enroll-admin.ts
 */

import { fabricCAService } from '../services/fabric/FabricCAService';
import { db } from '../config/knex';

async function enrollAdmin() {
    console.log('='.repeat(60));
    console.log('🔐 Fabric CA Admin Enrollment');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Get organization from database
        const org = await db('organizations')
            .where({ is_active: true })
            .first();

        if (!org) {
            console.log('❌ No active organization found in database');
            console.log('');
            console.log('Please create an organization first:');
            console.log('  INSERT INTO organizations (name, msp_id, domain, ca_url, ca_name)');
            console.log('  VALUES (\'Org1\', \'Org1MSP\', \'org1.example.com\', \'https://localhost:7054\', \'ca-org1\');');
            process.exit(1);
        }

        console.log('Organization:', org.name);
        console.log('MSP ID:', org.msp_id);
        console.log('CA URL:', org.ca_url);
        console.log('');

        // Admin credentials (default for Fabric CA)
        const enrollmentID = process.env.CA_ADMIN_USER || 'admin';
        const enrollmentSecret = process.env.CA_ADMIN_PASSWORD || 'adminpw';

        console.log('Enrollment ID:', enrollmentID);
        console.log('Enrollment Secret: ***');
        console.log('');

        console.log('Enrolling admin with CA...');

        await fabricCAService.enrollAdmin(
            org.msp_id,
            enrollmentID,
            enrollmentSecret
        );

        console.log('');
        console.log('='.repeat(60));
        console.log('✅ Admin enrolled successfully!');
        console.log('='.repeat(60));
        console.log('');
        console.log('Wallet label:', `${enrollmentID}@${org.msp_id.toLowerCase()}`);
        console.log('');

        // Update admin user record
        const walletId = `${enrollmentID}@${org.msp_id.toLowerCase()}`;
        const user = await db('users').where({ username: enrollmentID }).first();

        if (user) {
            await db('users')
                .where({ id: user.id })
                .update({
                    wallet_id: walletId,
                    enrolled: true,
                    enrolled_at: db.fn.now(),
                    updated_at: db.fn.now()
                });
            console.log('✅ Linked wallet to admin user record');
        } else {
            console.log('⚠️ Admin user record not found in database - please create user manually');
        }

        console.log('');
        console.log('Next steps:');
        console.log('1. Create users in the system');
        console.log('2. Users will be automatically enrolled on registration');
        console.log('');

        process.exit(0);
    } catch (error: any) {
        console.log('');
        console.log('='.repeat(60));
        console.log('❌ Admin enrollment failed');
        console.log('='.repeat(60));
        console.log('');
        console.log('Error:', error.message);
        console.log('');
        console.log('Common issues:');
        console.log('1. CA is not running - Start Fabric CA first');
        console.log('2. Wrong CA URL - Check organizations.ca_url in database');
        console.log('3. Wrong credentials - Default is admin/adminpw');
        console.log('4. Network issues - Check firewall/connectivity');
        console.log('');

        if (error.stack) {
            console.log('Stack trace:');
            console.log(error.stack);
        }

        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Run enrollment
enrollAdmin();
