#!/usr/bin/env ts-node
/**
 * Create Enrolled User Script (Using Fabric CA CLI)
 * 
 * This script creates a fully enrolled user by:
 * 1. Using fabric-ca-client CLI to register & enroll
 * 2. Storing certificate in backend database and wallet
 * 
 * Usage (inside backend container):
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-user-cli.ts <username> <email> <password>
 * 
 * Example:
 *   docker exec -it ibnts-backend npx ts-node -r tsconfig-paths/register src/scripts/create-user-cli.ts alice alice@example.com Alice123456
 */

import { db } from '../config/knex';
import { walletService } from '../services/wallet/WalletService';
import { PasswordService } from '../services/auth/PasswordService';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

async function createEnrolledUser(username: string, email: string, password: string) {
    console.log('='.repeat(60));
    console.log('🔐 Creating Enrolled User with Fabric CA CLI');
    console.log('='.repeat(60));
    console.log('');

    const tempDir = `/tmp/${username}-enrollment`;

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
        console.log('CA URL:', org.ca_url);
        console.log('CA Name:', org.ca_name);
        console.log('');

        // Check if user already exists
        const existingUser = await db('users')
            .where({ username })
            .orWhere({ email })
            .first();

        if (existingUser) {
            throw new Error(`User already exists: ${existingUser.username}`);
        }

        // Create temp directory
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        console.log('Step 1: Enrolling admin with CA CLI...');
        console.log('');

        // Enroll admin first
        const adminMspDir = path.join(tempDir, 'admin-msp');
        const adminEnrollCmd = `fabric-ca-client enroll ` +
            `-u ${org.ca_url.replace('http://', 'http://admin:adminpw@')} ` +
            `--caname ${org.ca_name} ` +
            `--mspdir ${adminMspDir}`;

        try {
            execSync(adminEnrollCmd, { stdio: 'pipe' });
            console.log('✅ Admin enrolled');
        } catch (error: any) {
            throw new Error(`Admin enrollment failed: ${error.message}`);
        }

        console.log('');
        console.log('Step 2: Registering user with CA CLI...');
        console.log('');

        // Register user
        const registerCmd = `fabric-ca-client register ` +
            `--id.name ${username} ` +
            `--id.type client ` +
            `--id.affiliation "" ` +
            `--id.maxenrollments -1 ` +
            `--url ${org.ca_url} ` +
            `--caname ${org.ca_name} ` +
            `--mspdir ${adminMspDir}`;

        let enrollSecret: string;
        try {
            const output = execSync(registerCmd, { encoding: 'utf-8' });
            const match = output.match(/Password: (\S+)/);
            if (!match) {
                throw new Error('Could not extract enrollment secret from output');
            }
            enrollSecret = match[1];
            console.log('✅ User registered');
            console.log('Enrollment secret:', enrollSecret);
        } catch (error: any) {
            throw new Error(`User registration failed: ${error.message}`);
        }

        console.log('');
        console.log('Step 3: Enrolling user with CA CLI...');
        console.log('');

        // Enroll user
        const userMspDir = path.join(tempDir, 'user-msp');
        const userEnrollCmd = `fabric-ca-client enroll ` +
            `-u ${org.ca_url.replace('http://', `http://${username}:${enrollSecret}@`)} ` +
            `--caname ${org.ca_name} ` +
            `--mspdir ${userMspDir}`;

        try {
            execSync(userEnrollCmd, { stdio: 'pipe' });
            console.log('✅ User enrolled');
        } catch (error: any) {
            throw new Error(`User enrollment failed: ${error.message}`);
        }

        console.log('');
        console.log('Step 4: Extracting certificate and private key...');
        console.log('');

        // Read certificate
        const certPath = path.join(userMspDir, 'signcerts', 'cert.pem');
        if (!fs.existsSync(certPath)) {
            throw new Error('Certificate file not found');
        }
        const certificate = fs.readFileSync(certPath, 'utf-8');

        // Read private key
        const keystorePath = path.join(userMspDir, 'keystore');
        const keyFiles = fs.readdirSync(keystorePath);
        const keyFile = keyFiles.find(f => f.endsWith('_sk'));
        if (!keyFile) {
            throw new Error('Private key file not found');
        }
        const privateKey = fs.readFileSync(path.join(keystorePath, keyFile), 'utf-8');

        console.log('✅ Certificate and private key extracted');
        console.log('');

        console.log('Step 5: Creating user in database...');
        console.log('');

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

        console.log('Step 6: Storing identity in wallet...');
        console.log('');

        // Store in wallet
        const walletLabel = `${username}@${org.msp_id.toLowerCase()}`;
        await walletService.put(walletLabel, {
            certificate,
            privateKey,
            mspId: org.msp_id,
            type: 'X.509'
        });

        console.log('✅ Wallet stored:', walletLabel);
        console.log('');

        console.log('Step 7: Updating user record...');
        console.log('');

        // Get wallet ID
        const wallet = await db('wallets')
            .where({ label: walletLabel })
            .first();

        if (!wallet) {
            throw new Error('Wallet not found after storage');
        }

        // Extract cert serial
        const certSerial = crypto.createHash('sha256')
            .update(certificate)
            .digest('hex')
            .substring(0, 40);

        // Update user
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
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        await db.destroy();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.log('Usage: npx ts-node -r tsconfig-paths/register src/scripts/create-user-cli.ts <username> <email> <password>');
    console.log('');
    console.log('Example:');
    console.log('  docker exec -it ibnts-backend npx ts-node -r tsconfig-paths/register src/scripts/create-user-cli.ts alice alice@example.com Alice123456');
    process.exit(1);
}

const [username, email, password] = args;

// Run
createEnrolledUser(username, email, password);
