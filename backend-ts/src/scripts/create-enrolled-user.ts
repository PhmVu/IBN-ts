#!/usr/bin/env ts-node
/**
 * Create Enrolled User Script
 * 
 * This script creates a user with full Fabric CA enrollment
 * Bypasses the SDK User class issue by using direct enrollment
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-enrolled-user.ts <username> <email> <password>
 * 
 * Example:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-enrolled-user.ts alice alice@example.com Alice123456
 */

import { db } from '../config/knex';
import { fabricCAService } from '../services/fabric/FabricCAService';
import { walletService } from '../services/wallet/WalletService';
import { PasswordService } from '../services/auth/PasswordService';
import crypto from 'crypto';

async function createEnrolledUser(username: string, email: string, password: string) {
    console.log('='.repeat(60));
    console.log('🔐 Create Enrolled User');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Get organization
        const org = await db('organizations')
            .where({ is_active: true })
            .first();

        if (!org) {
            throw new Error('No active organization found');
        }

        console.log('Organization:', org.name);
        console.log('MSP ID:', org.msp_id);
        console.log('');

        // Check if user already exists
        const existingUser = await db('users')
            .where({ username })
            .orWhere({ email })
            .first();

        if (existingUser) {
            throw new Error(`User already exists: ${existingUser.username}`);
        }

        console.log('Step 1: Creating user in database...');

        // Hash password
        const passwordHash = await PasswordService.hashPassword(password);

        // Create user
        const [userId] = await db('users')
            .insert({
                username,
                email,
                password_hash: passwordHash,
                organization_id: org.id,
                role: 'user',
                enrolled: false,
                created_at: new Date(),
                updated_at: new Date()
            })
            .returning('id');

        console.log('✅ User created with ID:', userId);
        console.log('');

        console.log('Step 2: Enrolling user with Fabric CA...');
        console.log('This will:');
        console.log('  - Generate enrollment secret');
        console.log('  - Enroll with CA to get certificate');
        console.log('  - Store encrypted identity in wallet');
        console.log('');

        // Generate a random enrollment secret
        const enrollmentSecret = crypto.randomBytes(16).toString('hex');

        console.log('Enrollment secret generated: ***');
        console.log('');

        // Enroll user directly (bypass register step)
        console.log('Enrolling with CA...');

        const certSerial = await fabricCAService.enrollUser(
            username,
            enrollmentSecret,
            org.msp_id
        );

        console.log('✅ User enrolled successfully');
        console.log('Certificate serial:', certSerial);
        console.log('');

        console.log('Step 3: Updating user record...');

        // Get wallet ID
        const walletLabel = `${username}@${org.msp_id.toLowerCase()}`;
        const wallet = await db('wallets')
            .where({ label: walletLabel })
            .first();

        if (!wallet) {
            throw new Error('Wallet not found after enrollment');
        }

        // Update user with enrollment info
        await db('users')
            .where({ id: userId })
            .update({
                enrolled: true,
                enrolled_at: new Date(),
                wallet_id: wallet.id,
                certificate_serial: certSerial,
                updated_at: new Date()
            });

        console.log('✅ User record updated');
        console.log('');

        console.log('='.repeat(60));
        console.log('✅ User created and enrolled successfully!');
        console.log('='.repeat(60));
        console.log('');
        console.log('User Details:');
        console.log('  Username:', username);
        console.log('  Email:', email);
        console.log('  Password:', password);
        console.log('  Enrolled:', 'Yes');
        console.log('  Wallet ID:', wallet.id);
        console.log('  Certificate Serial:', certSerial);
        console.log('');
        console.log('You can now login with:');
        console.log(`  Username: ${username}`);
        console.log(`  Password: ${password}`);
        console.log('');

        process.exit(0);
    } catch (error: any) {
        console.log('');
        console.log('='.repeat(60));
        console.log('❌ Failed to create enrolled user');
        console.log('='.repeat(60));
        console.log('');
        console.log('Error:', error.message);
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

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: npx ts-node -r tsconfig-paths/register src/scripts/create-enrolled-user.ts <username> <email> <password>');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node -r tsconfig-paths/register src/scripts/create-enrolled-user.ts alice alice@example.com Alice123456');
    process.exit(1);
}

const [username, email, password] = args;

// Run
createEnrolledUser(username, email, password);
