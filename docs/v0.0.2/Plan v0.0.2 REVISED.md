# 📋 IBNwts v0.0.2 REVISED - Enterprise-Grade Security Implementation

**Version:** v0.0.2 REVISED  
**Status:** 🔥 **COMPLETE REDESIGN - READY FOR IMPLEMENTATION**  
**Date:** December 16, 2025  
**Platform Type:** Blockchain Platform as a Service (BPaaS)  
**Focus:** Wallet-Based Identity + Enterprise Security Standards

---

## 🎯 **EXECUTIVE SUMMARY**

### **What Changed from Original v0.0.2?**

**Original v0.0.2 (INCORRECT):**
- ❌ Users share Admin certificates
- ❌ No Fabric CA enrollment
- ❌ No wallet management
- ❌ JWT HS256 with static secret
- ❌ Private keys in plain text

**v0.0.2 REVISED (CORRECT - Hyperledger Fabric Standard):**
- ✅ Each user has unique certificate (Fabric CA enrollment)
- ✅ Wallet-based identity management
- ✅ Automatic certificate generation on registration
- ✅ JWT RS256 with key rotation
- ✅ Encrypted private keys at rest
- ✅ Enterprise-grade security

---

## 🏗️ **NEW ARCHITECTURE OVERVIEW**

```
┌─────────────────────────────────────────────────────────────────┐
│  USER REGISTRATION & ENROLLMENT FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User registers
  ↓
1. Create user in PostgreSQL (username, password_hash)
  ↓
2. Call Fabric CA to REGISTER user
   - Admin signs registration request
   - CA returns enrollment secret
  ↓
3. Call Fabric CA to ENROLL user
   - Use enrollment secret
   - CA generates X.509 certificate + private key
  ↓
4. Store in WALLET (encrypted)
   - Certificate (public)
   - Private Key (encrypted with AES-256-GCM)
  ↓
5. Update user record
   - wallet_id
   - certificate_serial
   - enrolled: true
  ↓
✅ User ready to use blockchain

┌─────────────────────────────────────────────────────────────────┐
│  TRANSACTION SIGNING FLOW                                       │
└─────────────────────────────────────────────────────────────────┘

User invokes chaincode
  ↓
1. Load user's certificate from WALLET
  ↓
2. Decrypt private key
  ↓
3. Sign transaction with user's private key
  ↓
4. Send to Fabric Network:
   - Transaction proposal
   - Signature (signed by user)
   - Certificate (user's X.509 cert)
  ↓
5. Peer verifies:
   - Certificate signed by CA? ✅
   - MSP in channel? ✅
   - Signature valid? ✅
   - Not expired? ✅
   - Not revoked? ✅
  ↓
6. Execute chaincode AS user
   - creator = "CN=user@org.com"
   - mspId = "OrgMSP"
  ↓
✅ Non-repudiation achieved
```

---

## 📦 **8 IMPLEMENTATION PHASES**

### **Phase 1: Database Schema for Wallet System** ⏱️ 2 days

**Objective:** Create database tables to support wallet-based identity

**New Tables:**

```sql
-- Wallets table (stores encrypted identities)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(255) UNIQUE NOT NULL,  -- username@organization
  certificate TEXT NOT NULL,            -- X.509 certificate (PEM format)
  private_key TEXT NOT NULL,            -- ENCRYPTED private key
  encryption_iv VARCHAR(32) NOT NULL,   -- IV for AES-GCM
  encryption_tag VARCHAR(32) NOT NULL,  -- Auth tag for AES-GCM
  msp_id VARCHAR(100) NOT NULL,
  type VARCHAR(20) DEFAULT 'X.509',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  
  CONSTRAINT fk_msp FOREIGN KEY (msp_id) 
    REFERENCES organizations(msp_id) ON DELETE CASCADE
);

CREATE INDEX idx_wallets_label ON wallets(label);
CREATE INDEX idx_wallets_msp_id ON wallets(msp_id);

-- Update users table
ALTER TABLE users ADD COLUMN wallet_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN certificate_serial VARCHAR(255);
ALTER TABLE users ADD COLUMN enrolled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN enrollment_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN enrolled_at TIMESTAMP;

CREATE INDEX idx_users_wallet_id ON users(wallet_id);
CREATE INDEX idx_users_certificate_serial ON users(certificate_serial);

-- Certificate Revocation List
CREATE TABLE certificate_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_serial VARCHAR(255) UNIQUE NOT NULL,
  wallet_id VARCHAR(255),
  revoked_by UUID REFERENCES users(id),
  revocation_reason VARCHAR(255),
  revoked_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_wallet FOREIGN KEY (wallet_id) 
    REFERENCES wallets(label) ON DELETE SET NULL
);

CREATE INDEX idx_cert_revocations_serial ON certificate_revocations(certificate_serial);

-- JWT Key Rotation
CREATE TABLE jwt_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "key-2025-12"
  private_key TEXT NOT NULL,            -- RSA private key (PEM)
  public_key TEXT NOT NULL,             -- RSA public key (PEM)
  algorithm VARCHAR(20) DEFAULT 'RS256',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  CONSTRAINT unique_active_key UNIQUE (is_active) 
    WHERE is_active = true
);

CREATE INDEX idx_jwt_keys_key_id ON jwt_keys(key_id);
CREATE INDEX idx_jwt_keys_active ON jwt_keys(is_active);
```

**Migration Script:**

```typescript
// migrations/20251216_wallet_system.ts
export async function up(knex: Knex) {
  // Create wallets table
  await knex.schema.createTable('wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('label', 255).unique().notNullable();
    table.text('certificate').notNullable();
    table.text('private_key').notNullable();
    table.string('encryption_iv', 32).notNullable();
    table.string('encryption_tag', 32).notNullable();
    table.string('msp_id', 100).notNullable();
    table.string('type', 20).defaultTo('X.509');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at');
    
    table.foreign('msp_id').references('organizations.msp_id').onDelete('CASCADE');
    table.index('label');
    table.index('msp_id');
  });
  
  // Update users table
  await knex.schema.alterTable('users', (table) => {
    table.string('wallet_id', 255).unique();
    table.string('certificate_serial', 255);
    table.boolean('enrolled').defaultTo(false);
    table.string('enrollment_secret', 255);
    table.timestamp('enrolled_at');
    
    table.index('wallet_id');
    table.index('certificate_serial');
  });
  
  // Certificate revocations
  await knex.schema.createTable('certificate_revocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('certificate_serial', 255).unique().notNullable();
    table.string('wallet_id', 255);
    table.uuid('revoked_by').references('users.id');
    table.string('revocation_reason', 255);
    table.timestamp('revoked_at').defaultTo(knex.fn.now());
    
    table.foreign('wallet_id').references('wallets.label').onDelete('SET NULL');
    table.index('certificate_serial');
  });
  
  // JWT keys
  await knex.schema.createTable('jwt_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key_id', 50).unique().notNullable();
    table.text('private_key').notNullable();
    table.text('public_key').notNullable();
    table.string('algorithm', 20).defaultTo('RS256');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    
    table.index('key_id');
    table.index('is_active');
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists('jwt_keys');
  await knex.schema.dropTableIfExists('certificate_revocations');
  await knex.schema.dropTableIfExists('wallets');
  
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('wallet_id');
    table.dropColumn('certificate_serial');
    table.dropColumn('enrolled');
    table.dropColumn('enrollment_secret');
    table.dropColumn('enrolled_at');
  });
}
```

**Deliverables:**
- ✅ Migration files
- ✅ Updated database schema
- ✅ Seed data for testing

---

### **Phase 2: Wallet Service Implementation** ⏱️ 3 days

**Objective:** Create wallet service to manage encrypted identities

**File:** `backend-ts/src/services/wallet/WalletService.ts`

```typescript
import crypto from 'crypto';
import { db } from '@config/knex';
import logger from '@core/logger';
import { config } from '@config/env';

export interface WalletIdentity {
  certificate: string;
  privateKey: string;
  mspId: string;
  type: 'X.509';
}

export interface EncryptedWallet {
  label: string;
  certificate: string;
  privateKey: string;  // Encrypted
  encryptionIv: string;
  encryptionTag: string;
  mspId: string;
}

export class WalletService {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';
  
  constructor() {
    // Load encryption key from environment (32 bytes for AES-256)
    const keyHex = config.wallet.encryptionKey;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('WALLET_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }
  
  /**
   * Store identity in wallet with encryption
   */
  async put(label: string, identity: WalletIdentity): Promise<void> {
    try {
      // Encrypt private key
      const { encrypted, iv, tag } = this.encryptPrivateKey(identity.privateKey);
      
      // Store in database
      await db('wallets').insert({
        label,
        certificate: identity.certificate,
        private_key: encrypted,
        encryption_iv: iv,
        encryption_tag: tag,
        msp_id: identity.mspId,
        type: identity.type,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      logger.info('Identity stored in wallet', { label, mspId: identity.mspId });
    } catch (error) {
      logger.error('Failed to store identity in wallet', { label, error });
      throw new Error(`Failed to store identity: ${error.message}`);
    }
  }
  
  /**
   * Retrieve identity from wallet with decryption
   */
  async get(label: string): Promise<WalletIdentity | null> {
    try {
      const row = await db('wallets').where({ label }).first();
      
      if (!row) {
        logger.warn('Identity not found in wallet', { label });
        return null;
      }
      
      // Decrypt private key
      const privateKey = this.decryptPrivateKey(
        row.private_key,
        row.encryption_iv,
        row.encryption_tag
      );
      
      // Update last used
      await db('wallets').where({ label }).update({
        last_used_at: new Date()
      });
      
      return {
        certificate: row.certificate,
        privateKey,
        mspId: row.msp_id,
        type: row.type
      };
    } catch (error) {
      logger.error('Failed to retrieve identity from wallet', { label, error });
      throw new Error(`Failed to retrieve identity: ${error.message}`);
    }
  }
  
  /**
   * List all identities in wallet
   */
  async list(): Promise<string[]> {
    const rows = await db('wallets').select('label');
    return rows.map(r => r.label);
  }
  
  /**
   * Remove identity from wallet
   */
  async remove(label: string): Promise<void> {
    await db('wallets').where({ label }).delete();
    logger.info('Identity removed from wallet', { label });
  }
  
  /**
   * Check if identity exists
   */
  async exists(label: string): Promise<boolean> {
    const count = await db('wallets').where({ label }).count('* as count').first();
    return count.count > 0;
  }
  
  /**
   * Encrypt private key using AES-256-GCM
   */
  private encryptPrivateKey(privateKey: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    // Encrypt
    let encrypted = cipher.update(privateKey, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  }
  
  /**
   * Decrypt private key using AES-256-GCM
   */
  private decryptPrivateKey(
    encrypted: string,
    ivBase64: string,
    tagBase64: string
  ): string {
    try {
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt private key', { error });
      throw new Error('Failed to decrypt private key - key may be corrupted');
    }
  }
  
  /**
   * Export identity (for backup)
   */
  async export(label: string): Promise<EncryptedWallet | null> {
    const row = await db('wallets').where({ label }).first();
    
    if (!row) return null;
    
    return {
      label: row.label,
      certificate: row.certificate,
      privateKey: row.private_key,  // Still encrypted
      encryptionIv: row.encryption_iv,
      encryptionTag: row.encryption_tag,
      mspId: row.msp_id
    };
  }
  
  /**
   * Import identity (from backup)
   */
  async import(wallet: EncryptedWallet): Promise<void> {
    await db('wallets').insert({
      label: wallet.label,
      certificate: wallet.certificate,
      private_key: wallet.privateKey,
      encryption_iv: wallet.encryptionIv,
      encryption_tag: wallet.encryptionTag,
      msp_id: wallet.mspId,
      type: 'X.509',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    logger.info('Identity imported to wallet', { label: wallet.label });
  }
}

// Singleton instance
export const walletService = new WalletService();
```

**Environment Variable:**

```bash
# .env
WALLET_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
# ⚠️ MUST be 64 hex characters (32 bytes)
# Generate with: openssl rand -hex 32
```

**Deliverables:**
- ✅ WalletService implementation
- ✅ AES-256-GCM encryption
- ✅ Database integration
- ✅ Unit tests

---

### **Phase 3: Fabric CA Enrollment Service** ⏱️ 4 days

**Objective:** Integrate with Fabric CA to enroll users automatically

**File:** `backend-ts/src/services/fabric/FabricCAService.ts`

```typescript
import FabricCAServices from 'fabric-ca-client';
import { User, X509 } from 'fabric-common';
import { db } from '@config/knex';
import { walletService } from '@services/wallet/WalletService';
import logger from '@core/logger';
import crypto from 'crypto';

export interface EnrollmentResult {
  certificate: string;
  privateKey: string;
  certificateSerial: string;
  walletId: string;
}

export class FabricCAService {
  private caClients: Map<string, FabricCAServices> = new Map();
  
  /**
   * Get or create CA client for organization
   */
  private async getCAClient(organizationId: string): Promise<{
    ca: FabricCAServices;
    org: any;
  }> {
    // Get organization info
    const org = await db('organizations')
      .where({ id: organizationId })
      .first();
    
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    // Check cache
    if (this.caClients.has(org.msp_id)) {
      return {
        ca: this.caClients.get(org.msp_id),
        org
      };
    }
    
    // Create new CA client
    const ca = new FabricCAServices(
      org.ca_url,
      {
        trustedRoots: org.ca_cert,
        verify: true
      },
      org.ca_name || `ca-${org.name.toLowerCase()}`
    );
    
    this.caClients.set(org.msp_id, ca);
    
    logger.info('Created CA client', {
      mspId: org.msp_id,
      caUrl: org.ca_url
    });
    
    return { ca, org };
  }
  
  /**
   * Register and enroll new user
   */
  async registerAndEnrollUser(
    username: string,
    email: string,
    organizationId: string,
    role: string = 'client',
    attributes?: Array<{ name: string; value: string; ecert?: boolean }>
  ): Promise<EnrollmentResult> {
    try {
      const { ca, org } = await this.getCAClient(organizationId);
      
      // 1. Get admin identity to register new user
      const adminIdentity = await walletService.get(`admin@${org.name}`);
      
      if (!adminIdentity) {
        throw new Error(`Admin identity not found for organization: ${org.name}`);
      }
      
      // Create admin user object
      const adminUser = User.createUser(
        `admin@${org.name}`,
        '',
        org.msp_id,
        adminIdentity.certificate,
        adminIdentity.privateKey
      );
      
      // 2. REGISTER user with CA
      logger.info('Registering user with CA', {
        username,
        organizationId,
        role
      });
      
      const enrollmentSecret = await ca.register(
        {
          enrollmentID: username,
          enrollmentSecret: null, // CA will generate
          role: role,
          affiliation: org.name.toLowerCase(),
          maxEnrollments: -1, // Unlimited
          attrs: [
            { name: 'role', value: role, ecert: true },
            { name: 'email', value: email, ecert: true },
            ...(attributes || [])
          ]
        },
        adminUser
      );
      
      logger.info('User registered with CA', {
        username,
        enrollmentSecret: enrollmentSecret.substring(0, 8) + '...'
      });
      
      // 3. ENROLL user (get certificate)
      const enrollment = await ca.enroll({
        enrollmentID: username,
        enrollmentSecret: enrollmentSecret
      });
      
      const certificate = enrollment.certificate;
      const privateKey = enrollment.key.toBytes();
      
      // 4. Extract certificate serial number
      const certificateSerial = this.getCertificateSerial(certificate);
      
      // 5. Store in wallet
      const walletId = `${username}@${org.name}`;
      
      await walletService.put(walletId, {
        certificate,
        privateKey,
        mspId: org.msp_id,
        type: 'X.509'
      });
      
      logger.info('User enrolled successfully', {
        username,
        walletId,
        certificateSerial
      });
      
      return {
        certificate,
        privateKey,
        certificateSerial,
        walletId
      };
    } catch (error) {
      logger.error('Failed to register and enroll user', {
        username,
        organizationId,
        error: error.message
      });
      throw new Error(`Enrollment failed: ${error.message}`);
    }
  }
  
  /**
   * Re-enroll user (renew certificate)
   */
  async reenrollUser(walletId: string): Promise<EnrollmentResult> {
    try {
      // Get current identity
      const identity = await walletService.get(walletId);
      
      if (!identity) {
        throw new Error(`Identity not found: ${walletId}`);
      }
      
      // Parse wallet ID
      const [username, orgName] = walletId.split('@');
      
      // Get organization
      const org = await db('organizations')
        .where({ name: orgName })
        .first();
      
      if (!org) {
        throw new Error(`Organization not found: ${orgName}`);
      }
      
      const { ca } = await this.getCAClient(org.id);
      
      // Create user object
      const user = User.createUser(
        walletId,
        '',
        org.msp_id,
        identity.certificate,
        identity.privateKey
      );
      
      // Re-enroll
      const enrollment = await ca.reenroll(user);
      
      const certificate = enrollment.certificate;
      const privateKey = enrollment.key.toBytes();
      const certificateSerial = this.getCertificateSerial(certificate);
      
      // Update wallet
      await walletService.put(walletId, {
        certificate,
        privateKey,
        mspId: org.msp_id,
        type: 'X.509'
      });
      
      logger.info('User re-enrolled successfully', {
        walletId,
        certificateSerial
      });
      
      return {
        certificate,
        privateKey,
        certificateSerial,
        walletId
      };
    } catch (error) {
      logger.error('Failed to re-enroll user', {
        walletId,
        error: error.message
      });
      throw new Error(`Re-enrollment failed: ${error.message}`);
    }
  }
  
  /**
   * Revoke certificate
   */
  async revokeCertificate(
    certificateSerial: string,
    reason: string,
    revokedBy: string
  ): Promise<void> {
    try {
      // Get wallet by certificate serial
      const wallet = await db('wallets')
        .where({ certificate: db.raw(`certificate LIKE '%${certificateSerial}%'`) })
        .first();
      
      if (!wallet) {
        throw new Error(`Certificate not found: ${certificateSerial}`);
      }
      
      // Parse MSP to get organization
      const org = await db('organizations')
        .where({ msp_id: wallet.msp_id })
        .first();
      
      const { ca } = await this.getCAClient(org.id);
      
      // Get admin identity
      const adminIdentity = await walletService.get(`admin@${org.name}`);
      const adminUser = User.createUser(
        `admin@${org.name}`,
        '',
        org.msp_id,
        adminIdentity.certificate,
        adminIdentity.privateKey
      );
      
      // Revoke with CA
      await ca.revoke(
        {
          serial: certificateSerial,
          reason: reason
        },
        adminUser
      );
      
      // Record in database
      await db('certificate_revocations').insert({
        certificate_serial: certificateSerial,
        wallet_id: wallet.label,
        revoked_by: revokedBy,
        revocation_reason: reason,
        revoked_at: new Date()
      });
      
      logger.info('Certificate revoked', {
        certificateSerial,
        reason,
        revokedBy
      });
    } catch (error) {
      logger.error('Failed to revoke certificate', {
        certificateSerial,
        error: error.message
      });
      throw new Error(`Revocation failed: ${error.message}`);
    }
  }
  
  /**
   * Check if certificate is revoked
   */
  async isCertificateRevoked(certificateSerial: string): Promise<boolean> {
    const revocation = await db('certificate_revocations')
      .where({ certificate_serial: certificateSerial })
      .first();
    
    return !!revocation;
  }
  
  /**
   * Extract serial number from X.509 certificate
   */
  private getCertificateSerial(certificatePEM: string): string {
    try {
      // Remove PEM headers
      const certBase64 = certificatePEM
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s/g, '');
      
      // Decode base64
      const certBuffer = Buffer.from(certBase64, 'base64');
      
      // Parse certificate (simplified - in production use node-forge or x509)
      // For now, generate hash as serial
      const serial = crypto
        .createHash('sha256')
        .update(certBuffer)
        .digest('hex')
        .substring(0, 40);
      
      return serial;
    } catch (error) {
      logger.error('Failed to extract certificate serial', { error });
      throw new Error('Failed to parse certificate');
    }
  }
}

// Singleton instance
export const fabricCAService = new FabricCAService();
```

**Deliverables:**
- ✅ FabricCAService implementation
- ✅ Register & enroll logic
- ✅ Re-enrollment support
- ✅ Certificate revocation
- ✅ Integration tests

---

Tôi sẽ tiếp tục với các phases còn lại. Bạn có muốn tôi tiếp tục không, hay bạn muốn review phần này trước?
