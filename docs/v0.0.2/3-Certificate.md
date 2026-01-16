# 🎫 Phase 3: Fabric CA Enrollment Service

**Version:** v0.0.2 REVISED  
**Timeline:** 4 days  
**Difficulty:** ⭐⭐⭐⭐ Expert  
**Prerequisites:** Phase 1-2 completed, Fabric CA running, Admin enrolled

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll implement automatic user enrollment with Fabric Certificate Authority:

- ✅ Register users with Fabric CA
- ✅ Enroll users to get X.509 certificates
- ✅ Store certificates in encrypted wallet
- ✅ Support certificate renewal (re-enrollment)
- ✅ Support certificate revocation
- ✅ Extract certificate serial numbers

**Starting Point:** WalletService from Phase 2  
**Ending Point:** Automatic enrollment on user registration

---

## 📋 **PREREQUISITES**

### **1. Phases 1-2 Must Be Complete**

```bash
# Verify WalletService exists
ls -la backend-ts/src/services/wallet/WalletService.ts

# Verify wallets table exists
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "\d wallets"
```

### **2. Fabric CA Must Be Running**

```bash
# Check if CA is running
docker ps | grep ca

# Expected output:
# ca.org1.example.com   hyperledger/fabric-ca:latest   Up X minutes
```

### **3. Admin Identity Must Be Enrolled**

```bash
# Check if admin identity exists in crypto-config
ls -la network/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/

# Should show:
# - admincerts/
# - cacerts/
# - keystore/
# - signcerts/
```

### **4. Install Fabric CA Client**

```bash
cd backend-ts

# Install fabric-ca-client
npm install fabric-ca-client

# Install fabric-network (if not already)
npm install fabric-network

# Install crypto for certificate parsing
# (built-in Node.js module, no install needed)
```

---

## 🔍 **CURRENT STATE CHECK**

```bash
# Check organizations table has CA info
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "SELECT name, msp_id FROM organizations;"

# Should show organizations with MSP IDs
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Update Organizations Table**

First, we need to add CA connection info to organizations table.

**Create migration:**

```bash
cd backend-ts
npx knex migrate:make add_ca_info_to_organizations --knexfile knexfile.ts
```

**File:** `backend-ts/src/database/knex-migrations/YYYYMMDD_add_ca_info_to_organizations.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
    table.string('ca_url', 255)
      .comment('Fabric CA URL (e.g., https://localhost:7054)');
    table.string('ca_name', 100)
      .comment('CA name (e.g., ca-org1)');
    table.text('ca_cert')
      .comment('CA TLS certificate (PEM format)');
  });
  
  console.log('✅ Added CA info columns to organizations table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
    table.dropColumn('ca_url');
    table.dropColumn('ca_name');
    table.dropColumn('ca_cert');
  });
}
```

**Run migration:**

```bash
npm run db:migrate
```

**Update organizations with CA info:**

```sql
-- Connect to database
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db

-- Update Org1 with CA info
UPDATE organizations 
SET 
  ca_url = 'https://localhost:7054',
  ca_name = 'ca-org1',
  ca_cert = '-----BEGIN CERTIFICATE-----
... (paste CA cert from network/crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem)
-----END CERTIFICATE-----'
WHERE msp_id = 'Org1MSP';

-- Verify
SELECT name, ca_url, ca_name FROM organizations;
```

---

### **Step 2: Create FabricCAService**

**File:** `backend-ts/src/services/fabric/FabricCAService.ts`

```typescript
import FabricCAServices from 'fabric-ca-client';
import { User } from 'fabric-common';
import { X509Certificate } from 'crypto';
import crypto from 'crypto';
import { db } from '../../config/knex';
import { walletService } from '../wallet/WalletService';
import logger from '../../core/logger';

/**
 * Enrollment Result Interface
 */
export interface EnrollmentResult {
  certificate: string;
  privateKey: string;
  certificateSerial: string;
  walletId: string;
  mspId: string;
}

/**
 * Fabric CA Service
 * Handles user enrollment and certificate management with Fabric CA
 */
export class FabricCAService {
  private caClients: Map<string, FabricCAServices> = new Map();
  
  /**
   * Get or create CA client for organization
   * 
   * @param organizationId - Organization UUID
   * @returns CA client and organization info
   */
  private async getCAClient(organizationId: string): Promise<{
    ca: FabricCAServices;
    org: any;
  }> {
    // Get organization info from database
    const org = await db('organizations')
      .where({ id: organizationId })
      .first();
    
    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    if (!org.ca_url) {
      throw new Error(`CA URL not configured for organization: ${org.name}`);
    }
    
    // Check cache
    if (this.caClients.has(org.msp_id)) {
      return {
        ca: this.caClients.get(org.msp_id)!,
        org
      };
    }
    
    // Create new CA client
    const ca = new FabricCAServices(
      org.ca_url,
      {
        trustedRoots: org.ca_cert || '',
        verify: process.env.NODE_ENV === 'production'
      },
      org.ca_name || `ca-${org.name.toLowerCase()}`
    );
    
    this.caClients.set(org.msp_id, ca);
    
    logger.info('Created CA client', {
      mspId: org.msp_id,
      caUrl: org.ca_url,
      caName: org.ca_name
    });
    
    return { ca, org };
  }
  
  /**
   * Register and enroll new user with Fabric CA
   * 
   * This is the MAIN method - called when creating new users
   * 
   * @param username - Username
   * @param email - User email
   * @param organizationId - Organization ID
   * @param role - User role (default: 'client')
   * @param attributes - Additional attributes
   * @returns Enrollment result
   * 
   * @example
   * const result = await fabricCAService.registerAndEnrollUser(
   *   'john',
   *   'john@org1.com',
   *   'org1-uuid',
   *   'client'
   * );
   * // result.walletId = 'john@org1'
   * // result.certificate = '-----BEGIN CERTIFICATE-----...'
   */
  async registerAndEnrollUser(
    username: string,
    email: string,
    organizationId: string,
    role: string = 'client',
    attributes?: Array<{ name: string; value: string; ecert?: boolean }>
  ): Promise<EnrollmentResult> {
    try {
      logger.info('Starting user enrollment', {
        username,
        organizationId,
        role
      });
      
      const { ca, org } = await this.getCAClient(organizationId);
      
      // 1. Get admin identity to register new user
      const adminWalletId = `admin@${org.name}`;
      const adminIdentity = await walletService.get(adminWalletId);
      
      if (!adminIdentity) {
        throw new Error(
          `Admin identity not found: ${adminWalletId}. ` +
          `Please enroll admin first using: npm run enroll-admin`
        );
      }
      
      // Create admin user object for Fabric SDK
      const adminUser = User.createUser(
        adminWalletId,
        '',
        org.msp_id,
        adminIdentity.certificate,
        adminIdentity.privateKey
      );
      
      // 2. REGISTER user with CA
      logger.debug('Registering user with CA', {
        username,
        role,
        affiliation: org.name.toLowerCase()
      });
      
      const enrollmentSecret = await ca.register(
        {
          enrollmentID: username,
          enrollmentSecret: '', // CA will generate
          role: role,
          affiliation: org.name.toLowerCase(),
          maxEnrollments: -1, // Unlimited re-enrollments
          attrs: [
            { name: 'role', value: role, ecert: true },
            { name: 'email', value: email, ecert: true },
            { name: 'organization', value: org.name, ecert: true },
            ...(attributes || [])
          ]
        },
        adminUser
      );
      
      logger.info('User registered with CA', {
        username,
        secretLength: enrollmentSecret.length
      });
      
      // 3. ENROLL user (get certificate and private key)
      logger.debug('Enrolling user with CA', { username });
      
      const enrollment = await ca.enroll({
        enrollmentID: username,
        enrollmentSecret: enrollmentSecret
      });
      
      const certificate = enrollment.certificate;
      const privateKey = enrollment.key.toBytes();
      
      logger.debug('User enrolled successfully', {
        username,
        certificateLength: certificate.length,
        privateKeyLength: privateKey.length
      });
      
      // 4. Extract certificate serial number
      const certificateSerial = this.getCertificateSerial(certificate);
      
      logger.debug('Certificate serial extracted', {
        username,
        certificateSerial
      });
      
      // 5. Store in wallet
      const walletId = `${username}@${org.name}`;
      
      await walletService.put(walletId, {
        certificate,
        privateKey,
        mspId: org.msp_id,
        type: 'X.509'
      });
      
      logger.info('User identity stored in wallet', {
        username,
        walletId,
        mspId: org.msp_id
      });
      
      return {
        certificate,
        privateKey,
        certificateSerial,
        walletId,
        mspId: org.msp_id
      };
    } catch (error: any) {
      logger.error('Failed to register and enroll user', {
        username,
        organizationId,
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`Enrollment failed: ${error.message}`);
    }
  }
  
  /**
   * Re-enroll user (renew certificate)
   * 
   * Used when certificate is about to expire
   * 
   * @param walletId - Wallet ID (e.g., "john@org1")
   * @returns New enrollment result
   */
  async reenrollUser(walletId: string): Promise<EnrollmentResult> {
    try {
      logger.info('Starting user re-enrollment', { walletId });
      
      // Get current identity
      const identity = await walletService.get(walletId);
      
      if (!identity) {
        throw new Error(`Identity not found: ${walletId}`);
      }
      
      // Parse wallet ID
      const [username, orgName] = walletId.split('@');
      
      if (!username || !orgName) {
        throw new Error(`Invalid wallet ID format: ${walletId}`);
      }
      
      // Get organization
      const org = await db('organizations')
        .where({ name: orgName })
        .first();
      
      if (!org) {
        throw new Error(`Organization not found: ${orgName}`);
      }
      
      const { ca } = await this.getCAClient(org.id);
      
      // Create user object with current identity
      const user = User.createUser(
        walletId,
        '',
        org.msp_id,
        identity.certificate,
        identity.privateKey
      );
      
      // Re-enroll
      logger.debug('Re-enrolling user with CA', { walletId });
      
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
        newCertificateSerial: certificateSerial
      });
      
      return {
        certificate,
        privateKey,
        certificateSerial,
        walletId,
        mspId: org.msp_id
      };
    } catch (error: any) {
      logger.error('Failed to re-enroll user', {
        walletId,
        error: error.message
      });
      
      throw new Error(`Re-enrollment failed: ${error.message}`);
    }
  }
  
  /**
   * Revoke certificate
   * 
   * @param certificateSerial - Certificate serial number
   * @param reason - Revocation reason
   * @param revokedBy - User ID who revoked
   */
  async revokeCertificate(
    certificateSerial: string,
    reason: string,
    revokedBy: string
  ): Promise<void> {
    try {
      logger.info('Revoking certificate', {
        certificateSerial,
        reason,
        revokedBy
      });
      
      // Get wallet by certificate serial
      const user = await db('users')
        .where({ certificate_serial: certificateSerial })
        .first();
      
      if (!user || !user.wallet_id) {
        throw new Error(`User not found for certificate: ${certificateSerial}`);
      }
      
      // Parse wallet ID to get organization
      const [, orgName] = user.wallet_id.split('@');
      
      const org = await db('organizations')
        .where({ name: orgName })
        .first();
      
      if (!org) {
        throw new Error(`Organization not found: ${orgName}`);
      }
      
      const { ca } = await this.getCAClient(org.id);
      
      // Get admin identity
      const adminWalletId = `admin@${org.name}`;
      const adminIdentity = await walletService.get(adminWalletId);
      
      if (!adminIdentity) {
        throw new Error(`Admin identity not found: ${adminWalletId}`);
      }
      
      const adminUser = User.createUser(
        adminWalletId,
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
        wallet_id: user.wallet_id,
        revoked_by: revokedBy,
        revocation_reason: reason,
        revoked_at: new Date()
      });
      
      logger.info('Certificate revoked successfully', {
        certificateSerial,
        walletId: user.wallet_id,
        reason
      });
    } catch (error: any) {
      logger.error('Failed to revoke certificate', {
        certificateSerial,
        error: error.message
      });
      
      throw new Error(`Revocation failed: ${error.message}`);
    }
  }
  
  /**
   * Check if certificate is revoked
   * 
   * @param certificateSerial - Certificate serial number
   * @returns True if revoked
   */
  async isCertificateRevoked(certificateSerial: string): Promise<boolean> {
    try {
      const revocation = await db('certificate_revocations')
        .where({ certificate_serial: certificateSerial })
        .first();
      
      return !!revocation;
    } catch (error: any) {
      logger.error('Failed to check certificate revocation', {
        certificateSerial,
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Get revocation details
   * 
   * @param certificateSerial - Certificate serial number
   * @returns Revocation details or null
   */
  async getRevocationDetails(certificateSerial: string): Promise<{
    walletId: string;
    revokedBy: string;
    reason: string;
    revokedAt: Date;
  } | null> {
    try {
      const revocation = await db('certificate_revocations')
        .where({ certificate_serial: certificateSerial })
        .first();
      
      if (!revocation) {
        return null;
      }
      
      return {
        walletId: revocation.wallet_id,
        revokedBy: revocation.revoked_by,
        reason: revocation.revocation_reason,
        revokedAt: new Date(revocation.revoked_at)
      };
    } catch (error: any) {
      logger.error('Failed to get revocation details', {
        certificateSerial,
        error: error.message
      });
      return null;
    }
  }
  
  /**
   * Extract serial number from X.509 certificate
   * 
   * @param certificatePEM - Certificate in PEM format
   * @returns Certificate serial number (formatted with colons)
   */
  private getCertificateSerial(certificatePEM: string): string {
    try {
      // Use Node.js crypto module to parse certificate
      const cert = new X509Certificate(certificatePEM);
      
      // Get serial number (hex string)
      const serial = cert.serialNumber;
      
      // Format: Add colons every 2 characters
      const formatted = serial.match(/.{1,2}/g)?.join(':') || serial;
      
      logger.debug('Certificate serial extracted', {
        serial: formatted,
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.validFrom,
        validTo: cert.validTo
      });
      
      return formatted;
    } catch (error: any) {
      logger.error('Failed to extract certificate serial', {
        error: error.message
      });
      
      // Fallback: Generate hash of certificate
      const hash = crypto
        .createHash('sha256')
        .update(certificatePEM)
        .digest('hex')
        .substring(0, 40);
      
      const formatted = hash.match(/.{1,2}/g)?.join(':') || hash;
      
      logger.warn('Using certificate hash as serial', { serial: formatted });
      
      return formatted;
    }
  }
  
  /**
   * Validate certificate
   * 
   * @param certificatePEM - Certificate in PEM format
   * @returns Validation result
   */
  validateCertificate(certificatePEM: string): {
    valid: boolean;
    subject?: string;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    expired?: boolean;
    error?: string;
  } {
    try {
      const cert = new X509Certificate(certificatePEM);
      
      const now = new Date();
      const validFrom = new Date(cert.validFrom);
      const validTo = new Date(cert.validTo);
      
      const expired = now > validTo;
      const notYetValid = now < validFrom;
      
      return {
        valid: !expired && !notYetValid,
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        expired
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
export const fabricCAService = new FabricCAService();
```

---

### **Step 3: Create Index File**

**File:** `backend-ts/src/services/fabric/index.ts`

```typescript
export { FabricCAService, fabricCAService } from './FabricCAService';
export type { EnrollmentResult } from './FabricCAService';
```

---

### **Step 4: Update User Registration Route**

**File:** `backend-ts/src/routes/users.ts` (UPDATE)

```typescript
import { Router } from 'express';
import { db } from '../config/knex';
import { fabricCAService } from '../services/fabric';
import bcrypt from 'bcryptjs';
import logger from '../core/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Create new user with automatic enrollment
 * 
 * POST /api/v1/users
 */
router.post('/users', authMiddleware, async (req, res) => {
  const { username, email, password, organization_id, role } = req.body;
  
  try {
    // 1. Hash password
    const password_hash = await bcrypt.hash(password, 12);
    
    // 2. Create user in database
    const [user] = await db('users').insert({
      username,
      email,
      password_hash,
      organization_id,
      is_superuser: false,
      is_active: true,
      enrolled: false, // Not yet enrolled
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');
    
    logger.info('User created in database', { userId: user.id, username });
    
    // 3. Enroll user with Fabric CA
    try {
      const enrollment = await fabricCAService.registerAndEnrollUser(
        username,
        email,
        organization_id,
        role || 'client'
      );
      
      // 4. Update user with enrollment info
      await db('users').where({ id: user.id }).update({
        wallet_id: enrollment.walletId,
        certificate_serial: enrollment.certificateSerial,
        enrolled: true,
        enrolled_at: new Date(),
        updated_at: new Date()
      });
      
      logger.info('User enrolled successfully', {
        userId: user.id,
        walletId: enrollment.walletId,
        certificateSerial: enrollment.certificateSerial
      });
      
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          organization_id: user.organization_id,
          enrolled: true,
          wallet_id: enrollment.walletId,
          certificate_serial: enrollment.certificateSerial
        }
      });
    } catch (enrollmentError: any) {
      // Enrollment failed - rollback user creation
      logger.error('Enrollment failed, rolling back user creation', {
        userId: user.id,
        error: enrollmentError.message
      });
      
      await db('users').where({ id: user.id }).delete();
      
      throw new Error(`Enrollment failed: ${enrollmentError.message}`);
    }
  } catch (error: any) {
    logger.error('Failed to create user', {
      username,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

### **Step 5: Create Admin Enrollment Script**

**File:** `backend-ts/src/scripts/enroll-admin.ts`

```typescript
import { walletService } from '../services/wallet';
import { db } from '../config/knex';
import fs from 'fs';
import path from 'path';
import logger from '../core/logger';

/**
 * Enroll admin from crypto-config
 * 
 * This script loads admin certificate and private key from
 * crypto-config folder and stores in wallet
 */
async function enrollAdmin() {
  try {
    // Get organization
    const org = await db('organizations')
      .where({ msp_id: 'Org1MSP' })
      .first();
    
    if (!org) {
      throw new Error('Organization Org1MSP not found');
    }
    
    // Path to admin crypto material
    const cryptoPath = path.resolve(
      __dirname,
      '../../../network/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp'
    );
    
    // Read certificate
    const certPath = path.join(cryptoPath, 'signcerts/Admin@org1.example.com-cert.pem');
    const certificate = fs.readFileSync(certPath, 'utf8');
    
    // Read private key
    const keyPath = path.join(cryptoPath, 'keystore');
    const keyFiles = fs.readdirSync(keyPath);
    const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');
    
    // Store in wallet
    const walletId = `admin@${org.name}`;
    
    await walletService.put(walletId, {
      certificate,
      privateKey,
      mspId: org.msp_id,
      type: 'X.509'
    });
    
    logger.info('Admin enrolled successfully', { walletId });
    console.log(`✅ Admin enrolled: ${walletId}`);
    
    process.exit(0);
  } catch (error: any) {
    logger.error('Failed to enroll admin', { error: error.message });
    console.error('❌ Failed to enroll admin:', error.message);
    process.exit(1);
  }
}

enrollAdmin();
```

**Add to package.json:**

```json
{
  "scripts": {
    "enroll-admin": "ts-node src/scripts/enroll-admin.ts"
  }
}
```

---

## ✅ **VERIFICATION CHECKLIST**

### **1. Enroll Admin**

```bash
cd backend-ts
npm run enroll-admin

# Expected output:
# ✅ Admin enrolled: admin@org1
```

### **2. Verify Admin in Wallet**

```sql
-- Check admin wallet
SELECT label, msp_id, created_at 
FROM wallets 
WHERE label LIKE 'admin@%';

-- Should show admin wallet
```

### **3. Test User Enrollment**

```bash
# Create test user via API
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "username": "testuser",
    "email": "test@org1.com",
    "password": "Test123!",
    "organization_id": "<org_id>"
  }'

# Should return:
# {
#   "success": true,
#   "data": {
#     "enrolled": true,
#     "wallet_id": "testuser@org1",
#     "certificate_serial": "..."
#   }
# }
```

---

## 🧪 **TESTING**

### **Test 1: Enrollment Flow**

```typescript
// test-enrollment.ts
import { fabricCAService } from './src/services/fabric';

async function test() {
  const result = await fabricCAService.registerAndEnrollUser(
    'testuser2',
    'test2@org1.com',
    '<org_id>',
    'client'
  );
  
  console.log('✅ Enrollment successful');
  console.log('Wallet ID:', result.walletId);
  console.log('Certificate Serial:', result.certificateSerial);
}

test();
```

---

## 🔧 **TROUBLESHOOTING**

### **Issue 1: "Admin identity not found"**

**Solution:**
```bash
# Enroll admin first
npm run enroll-admin
```

### **Issue 2: "CA URL not configured"**

**Solution:**
```sql
-- Update organization with CA info
UPDATE organizations 
SET ca_url = 'https://localhost:7054',
    ca_name = 'ca-org1'
WHERE msp_id = 'Org1MSP';
```

### **Issue 3: "Enrollment failed: connect ECONNREFUSED"**

**Cause:** CA not running

**Solution:**
```bash
# Start Fabric network
cd network
./network.sh up
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

✅ **FabricCAService** with enrollment logic  
✅ **Automatic user enrollment** on registration  
✅ **Certificate management** (enroll, re-enroll, revoke)  
✅ **Admin enrollment script**  
✅ **Integration with WalletService**  

---

## 🚀 **NEXT STEPS**

**Phase 4:** Implement JWT RS256 with Key Rotation

**Estimated time:** 2 days

---

**Phase 3 Complete!** ✅

**Next:** [Phase 4 - JWT RS256](./4-JWT.md)
