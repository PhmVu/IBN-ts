# 🔐 Phase 2: Wallet Service Implementation

**Version:** v0.0.2 REVISED  
**Timeline:** 3 days  
**Difficulty:** ⭐⭐⭐ Advanced  
**Prerequisites:** Phase 1 completed, Node.js crypto module knowledge

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll implement the WalletService to securely manage blockchain identities:

- ✅ AES-256-GCM encryption for private keys
- ✅ Store/retrieve identities from database
- ✅ CRUD operations (put, get, list, remove)
- ✅ Export/import for backup
- ✅ Automatic encryption/decryption

**Starting Point:** Database schema from Phase 1  
**Ending Point:** Working WalletService with encrypted storage

---

## 📋 **PREREQUISITES**

### **1. Phase 1 Must Be Complete**

```bash
cd backend-ts

# Verify wallets table exists
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "\d wallets"

# Should show wallets table structure
```

### **2. Check Environment Variables**

```bash
# Verify WALLET_ENCRYPTION_KEY is set
cat .env | grep WALLET_ENCRYPTION_KEY

# Should show 64-character hex string
# If not set, generate:
openssl rand -hex 32
```

### **3. Install Dependencies**

```bash
cd backend-ts

# Check if crypto module is available (built-in Node.js)
node -e "console.log(require('crypto').getCiphers().includes('aes-256-gcm'))"

# Should output: true
```

---

## 🔍 **CURRENT STATE CHECK**

```bash
# Check project structure
ls -la src/services/

# You should see existing services:
# - auth/
# - blockchain/
# - certificateManager.ts
# - rbacService.ts

# We'll create new folder:
# - wallet/
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Create Wallet Service Directory**

```bash
cd backend-ts/src/services

# Create wallet service folder
mkdir -p wallet

# Create test folder
mkdir -p wallet/__tests__
```

---

### **Step 2: Create WalletService Class**

**File:** `backend-ts/src/services/wallet/WalletService.ts`

```typescript
import crypto from 'crypto';
import { db } from '../../config/knex';
import logger from '../../core/logger';

/**
 * Wallet Identity Interface
 * Represents a decrypted blockchain identity
 */
export interface WalletIdentity {
  certificate: string;      // X.509 certificate (PEM format)
  privateKey: string;       // Private key (PEM format) - DECRYPTED
  mspId: string;           // Organization MSP ID
  type: 'X.509';           // Identity type
}

/**
 * Encrypted Wallet Interface
 * Represents an encrypted wallet for export/import
 */
export interface EncryptedWallet {
  label: string;
  certificate: string;
  privateKey: string;       // ENCRYPTED
  encryptionIv: string;
  encryptionTag: string;
  mspId: string;
}

/**
 * Wallet Service
 * Manages encrypted storage of blockchain identities
 * 
 * Security:
 * - Uses AES-256-GCM for authenticated encryption
 * - Private keys never stored in plain text
 * - Each encryption uses unique IV (Initialization Vector)
 * - Authentication tag prevents tampering
 */
export class WalletService {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';
  private ivLength = 12;  // 96 bits for GCM (recommended)
  private tagLength = 16; // 128 bits for GCM
  
  constructor() {
    // Load encryption key from environment
    const keyHex = process.env.WALLET_ENCRYPTION_KEY;
    
    if (!keyHex) {
      throw new Error('WALLET_ENCRYPTION_KEY not configured in environment');
    }
    
    if (keyHex.length !== 64) {
      throw new Error('WALLET_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    
    logger.info('WalletService initialized', {
      algorithm: this.algorithm,
      keyLength: this.encryptionKey.length * 8 // bits
    });
  }
  
  /**
   * Store identity in wallet with encryption
   * 
   * @param label - Wallet label (e.g., "john@org1")
   * @param identity - Identity to store
   * 
   * @example
   * await walletService.put('john@org1', {
   *   certificate: '-----BEGIN CERTIFICATE-----...',
   *   privateKey: '-----BEGIN PRIVATE KEY-----...',
   *   mspId: 'Org1MSP',
   *   type: 'X.509'
   * });
   */
  async put(label: string, identity: WalletIdentity): Promise<void> {
    try {
      logger.debug('Storing identity in wallet', { label, mspId: identity.mspId });
      
      // Encrypt private key
      const { encrypted, iv, tag } = this.encryptPrivateKey(identity.privateKey);
      
      // Check if wallet already exists
      const existing = await db('wallets').where({ label }).first();
      
      if (existing) {
        // Update existing wallet
        await db('wallets')
          .where({ label })
          .update({
            certificate: identity.certificate,
            private_key: encrypted,
            encryption_iv: iv,
            encryption_tag: tag,
            msp_id: identity.mspId,
            type: identity.type,
            updated_at: new Date()
          });
        
        logger.info('Wallet updated', { label });
      } else {
        // Insert new wallet
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
        
        logger.info('Wallet created', { label });
      }
    } catch (error: any) {
      logger.error('Failed to store identity in wallet', {
        label,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to store identity: ${error.message}`);
    }
  }
  
  /**
   * Retrieve identity from wallet with decryption
   * 
   * @param label - Wallet label
   * @returns Decrypted identity or null if not found
   * 
   * @example
   * const identity = await walletService.get('john@org1');
   * if (identity) {
   *   console.log('Certificate:', identity.certificate);
   *   console.log('Private Key:', identity.privateKey); // Decrypted
   * }
   */
  async get(label: string): Promise<WalletIdentity | null> {
    try {
      logger.debug('Retrieving identity from wallet', { label });
      
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
      
      // Update last used timestamp
      await db('wallets')
        .where({ label })
        .update({ last_used_at: new Date() });
      
      logger.debug('Identity retrieved from wallet', { label, mspId: row.msp_id });
      
      return {
        certificate: row.certificate,
        privateKey,
        mspId: row.msp_id,
        type: row.type
      };
    } catch (error: any) {
      logger.error('Failed to retrieve identity from wallet', {
        label,
        error: error.message
      });
      throw new Error(`Failed to retrieve identity: ${error.message}`);
    }
  }
  
  /**
   * List all wallet labels
   * 
   * @returns Array of wallet labels
   * 
   * @example
   * const labels = await walletService.list();
   * // ['john@org1', 'alice@org1', 'bob@org2']
   */
  async list(): Promise<string[]> {
    try {
      const rows = await db('wallets')
        .select('label')
        .orderBy('created_at', 'asc');
      
      return rows.map(r => r.label);
    } catch (error: any) {
      logger.error('Failed to list wallets', { error: error.message });
      throw new Error(`Failed to list wallets: ${error.message}`);
    }
  }
  
  /**
   * Remove identity from wallet
   * 
   * @param label - Wallet label
   * 
   * @example
   * await walletService.remove('john@org1');
   */
  async remove(label: string): Promise<void> {
    try {
      const deleted = await db('wallets').where({ label }).delete();
      
      if (deleted === 0) {
        logger.warn('Wallet not found for removal', { label });
        throw new Error(`Wallet not found: ${label}`);
      }
      
      logger.info('Wallet removed', { label });
    } catch (error: any) {
      logger.error('Failed to remove wallet', { label, error: error.message });
      throw new Error(`Failed to remove wallet: ${error.message}`);
    }
  }
  
  /**
   * Check if wallet exists
   * 
   * @param label - Wallet label
   * @returns True if wallet exists
   * 
   * @example
   * if (await walletService.exists('john@org1')) {
   *   console.log('Wallet exists');
   * }
   */
  async exists(label: string): Promise<boolean> {
    try {
      const result = await db('wallets')
        .where({ label })
        .count('* as count')
        .first();
      
      return parseInt(result?.count as string) > 0;
    } catch (error: any) {
      logger.error('Failed to check wallet existence', { label, error: error.message });
      return false;
    }
  }
  
  /**
   * Get wallets by MSP ID
   * 
   * @param mspId - MSP ID
   * @returns Array of wallet labels
   * 
   * @example
   * const org1Wallets = await walletService.getByMspId('Org1MSP');
   */
  async getByMspId(mspId: string): Promise<string[]> {
    try {
      const rows = await db('wallets')
        .where({ msp_id: mspId })
        .select('label')
        .orderBy('created_at', 'asc');
      
      return rows.map(r => r.label);
    } catch (error: any) {
      logger.error('Failed to get wallets by MSP ID', { mspId, error: error.message });
      throw new Error(`Failed to get wallets: ${error.message}`);
    }
  }
  
  /**
   * Export wallet (for backup)
   * Private key remains encrypted
   * 
   * @param label - Wallet label
   * @returns Encrypted wallet data
   * 
   * @example
   * const backup = await walletService.export('john@org1');
   * fs.writeFileSync('backup.json', JSON.stringify(backup));
   */
  async export(label: string): Promise<EncryptedWallet | null> {
    try {
      const row = await db('wallets').where({ label }).first();
      
      if (!row) {
        return null;
      }
      
      return {
        label: row.label,
        certificate: row.certificate,
        privateKey: row.private_key,  // Still encrypted
        encryptionIv: row.encryption_iv,
        encryptionTag: row.encryption_tag,
        mspId: row.msp_id
      };
    } catch (error: any) {
      logger.error('Failed to export wallet', { label, error: error.message });
      throw new Error(`Failed to export wallet: ${error.message}`);
    }
  }
  
  /**
   * Import wallet (from backup)
   * 
   * @param wallet - Encrypted wallet data
   * 
   * @example
   * const backup = JSON.parse(fs.readFileSync('backup.json'));
   * await walletService.import(backup);
   */
  async import(wallet: EncryptedWallet): Promise<void> {
    try {
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
      
      logger.info('Wallet imported', { label: wallet.label });
    } catch (error: any) {
      logger.error('Failed to import wallet', {
        label: wallet.label,
        error: error.message
      });
      throw new Error(`Failed to import wallet: ${error.message}`);
    }
  }
  
  /**
   * Encrypt private key using AES-256-GCM
   * 
   * @param privateKey - Private key to encrypt
   * @returns Encrypted data, IV, and authentication tag
   * 
   * @private
   */
  private encryptPrivateKey(privateKey: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    try {
      // Generate random IV (12 bytes for GCM)
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );
      
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
    } catch (error: any) {
      logger.error('Failed to encrypt private key', { error: error.message });
      throw new Error('Encryption failed');
    }
  }
  
  /**
   * Decrypt private key using AES-256-GCM
   * 
   * @param encrypted - Encrypted private key
   * @param ivBase64 - Initialization vector (base64)
   * @param tagBase64 - Authentication tag (base64)
   * @returns Decrypted private key
   * 
   * @private
   */
  private decryptPrivateKey(
    encrypted: string,
    ivBase64: string,
    tagBase64: string
  ): string {
    try {
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');
      
      // Validate IV and tag lengths
      if (iv.length !== this.ivLength) {
        throw new Error(`Invalid IV length: expected ${this.ivLength}, got ${iv.length}`);
      }
      
      if (tag.length !== this.tagLength) {
        throw new Error(`Invalid tag length: expected ${this.tagLength}, got ${tag.length}`);
      }
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );
      
      // Set authentication tag
      decipher.setAuthTag(tag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      logger.error('Failed to decrypt private key', {
        error: error.message,
        ivLength: Buffer.from(ivBase64, 'base64').length,
        tagLength: Buffer.from(tagBase64, 'base64').length
      });
      
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Decryption failed - key may be corrupted or tampered');
      }
      
      throw new Error('Decryption failed');
    }
  }
  
  /**
   * Get wallet statistics
   * 
   * @returns Wallet statistics
   */
  async getStatistics(): Promise<{
    totalWallets: number;
    walletsByMsp: Record<string, number>;
    recentlyUsed: Array<{ label: string; lastUsed: Date }>;
  }> {
    try {
      // Total wallets
      const totalResult = await db('wallets').count('* as count').first();
      const totalWallets = parseInt(totalResult?.count as string);
      
      // Wallets by MSP
      const mspResults = await db('wallets')
        .select('msp_id')
        .count('* as count')
        .groupBy('msp_id');
      
      const walletsByMsp: Record<string, number> = {};
      mspResults.forEach(row => {
        walletsByMsp[row.msp_id] = parseInt(row.count as string);
      });
      
      // Recently used
      const recentResults = await db('wallets')
        .select('label', 'last_used_at')
        .whereNotNull('last_used_at')
        .orderBy('last_used_at', 'desc')
        .limit(10);
      
      const recentlyUsed = recentResults.map(row => ({
        label: row.label,
        lastUsed: new Date(row.last_used_at)
      }));
      
      return {
        totalWallets,
        walletsByMsp,
        recentlyUsed
      };
    } catch (error: any) {
      logger.error('Failed to get wallet statistics', { error: error.message });
      throw new Error('Failed to get statistics');
    }
  }
}

// Singleton instance
export const walletService = new WalletService();
```

---

### **Step 3: Create Index File**

**File:** `backend-ts/src/services/wallet/index.ts`

```typescript
export { WalletService, walletService } from './WalletService';
export type { WalletIdentity, EncryptedWallet } from './WalletService';
```

---

### **Step 4: Create Unit Tests**

**File:** `backend-ts/src/services/wallet/__tests__/WalletService.test.ts`

```typescript
import { WalletService } from '../WalletService';
import { db } from '../../../config/knex';

describe('WalletService', () => {
  let walletService: WalletService;
  
  beforeAll(async () => {
    // Set test encryption key
    process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    walletService = new WalletService();
    
    // Run migrations
    await db.migrate.latest();
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  beforeEach(async () => {
    // Clean wallets table
    await db('wallets').del();
  });
  
  describe('put and get', () => {
    it('should store and retrieve identity', async () => {
      const identity = {
        certificate: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----',
        privateKey: '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----',
        mspId: 'Org1MSP',
        type: 'X.509' as const
      };
      
      await walletService.put('test@org1', identity);
      
      const retrieved = await walletService.get('test@org1');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.certificate).toBe(identity.certificate);
      expect(retrieved?.privateKey).toBe(identity.privateKey);
      expect(retrieved?.mspId).toBe(identity.mspId);
    });
    
    it('should encrypt private key in database', async () => {
      const identity = {
        certificate: 'cert',
        privateKey: 'secret_key',
        mspId: 'Org1MSP',
        type: 'X.509' as const
      };
      
      await walletService.put('test@org1', identity);
      
      // Check database directly
      const row = await db('wallets').where({ label: 'test@org1' }).first();
      
      // Private key should be encrypted (not plain text)
      expect(row.private_key).not.toBe('secret_key');
      expect(row.encryption_iv).toBeTruthy();
      expect(row.encryption_tag).toBeTruthy();
    });
  });
  
  describe('list', () => {
    it('should list all wallet labels', async () => {
      await walletService.put('user1@org1', {
        certificate: 'cert1',
        privateKey: 'key1',
        mspId: 'Org1MSP',
        type: 'X.509'
      });
      
      await walletService.put('user2@org1', {
        certificate: 'cert2',
        privateKey: 'key2',
        mspId: 'Org1MSP',
        type: 'X.509'
      });
      
      const labels = await walletService.list();
      
      expect(labels).toHaveLength(2);
      expect(labels).toContain('user1@org1');
      expect(labels).toContain('user2@org1');
    });
  });
  
  describe('remove', () => {
    it('should remove wallet', async () => {
      await walletService.put('test@org1', {
        certificate: 'cert',
        privateKey: 'key',
        mspId: 'Org1MSP',
        type: 'X.509'
      });
      
      await walletService.remove('test@org1');
      
      const retrieved = await walletService.get('test@org1');
      expect(retrieved).toBeNull();
    });
  });
  
  describe('exists', () => {
    it('should check wallet existence', async () => {
      expect(await walletService.exists('test@org1')).toBe(false);
      
      await walletService.put('test@org1', {
        certificate: 'cert',
        privateKey: 'key',
        mspId: 'Org1MSP',
        type: 'X.509'
      });
      
      expect(await walletService.exists('test@org1')).toBe(true);
    });
  });
  
  describe('export and import', () => {
    it('should export and import wallet', async () => {
      const identity = {
        certificate: 'cert',
        privateKey: 'secret',
        mspId: 'Org1MSP',
        type: 'X.509' as const
      };
      
      await walletService.put('test@org1', identity);
      
      const exported = await walletService.export('test@org1');
      expect(exported).not.toBeNull();
      
      await walletService.remove('test@org1');
      
      await walletService.import(exported!);
      
      const retrieved = await walletService.get('test@org1');
      expect(retrieved?.privateKey).toBe(identity.privateKey);
    });
  });
});
```

---

### **Step 5: Run Tests**

```bash
cd backend-ts

# Run wallet service tests
npm test -- WalletService.test.ts

# Expected output:
# PASS  src/services/wallet/__tests__/WalletService.test.ts
#   WalletService
#     put and get
#       ✓ should store and retrieve identity
#       ✓ should encrypt private key in database
#     list
#       ✓ should list all wallet labels
#     remove
#       ✓ should remove wallet
#     exists
#       ✓ should check wallet existence
#     export and import
#       ✓ should export and import wallet
# 
# Test Suites: 1 passed, 1 total
# Tests:       6 passed, 6 total
```

---

## ✅ **VERIFICATION CHECKLIST**

### **1. File Structure**

```bash
ls -la src/services/wallet/

# Should show:
# WalletService.ts
# index.ts
# __tests__/
#   └── WalletService.test.ts
```

### **2. Service Initialization**

```typescript
// Test in Node REPL
import { walletService } from './src/services/wallet';

// Should not throw error
console.log('WalletService initialized');
```

### **3. Encryption Working**

```bash
# Run this test script
node -e "
const crypto = require('crypto');
const key = Buffer.from(process.env.WALLET_ENCRYPTION_KEY, 'hex');
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update('test', 'utf8', 'base64');
encrypted += cipher.final('base64');
console.log('Encryption working:', encrypted !== 'test');
"

# Should output: Encryption working: true
```

---

## 🧪 **MANUAL TESTING**

### **Test 1: Store and Retrieve**

```typescript
// Create test script: test-wallet.ts
import { walletService } from './src/services/wallet';

async function test() {
  // Store identity
  await walletService.put('testuser@org1', {
    certificate: '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----',
    mspId: 'Org1MSP',
    type: 'X.509'
  });
  
  console.log('✅ Identity stored');
  
  // Retrieve identity
  const identity = await walletService.get('testuser@org1');
  console.log('✅ Identity retrieved:', identity?.privateKey);
  
  // Clean up
  await walletService.remove('testuser@org1');
  console.log('✅ Identity removed');
}

test();
```

```bash
npx ts-node test-wallet.ts
```

---

## 🔧 **TROUBLESHOOTING**

### **Issue 1: "WALLET_ENCRYPTION_KEY not configured"**

**Solution:**
```bash
# Check .env file
cat .env | grep WALLET_ENCRYPTION_KEY

# If missing, add it
openssl rand -hex 32
echo "WALLET_ENCRYPTION_KEY=<generated_key>" >> .env
```

### **Issue 2: "Decryption failed - key may be corrupted"**

**Cause:** Encryption key changed or data tampered.

**Solution:**
```bash
# Verify encryption key hasn't changed
# If changed, old wallets cannot be decrypted
# You'll need to re-enroll users
```

### **Issue 3: Tests Failing - "relation wallets does not exist"**

**Solution:**
```bash
# Run migrations in test environment
NODE_ENV=test npm run db:migrate
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

✅ **WalletService class** with 11 methods  
✅ **AES-256-GCM encryption** for private keys  
✅ **CRUD operations** (put, get, list, remove, exists)  
✅ **Export/import** for backup  
✅ **Unit tests** with 6 test cases  
✅ **Type safety** with TypeScript interfaces  

---

## 🚀 **NEXT STEPS**

**Phase 3:** Implement Fabric CA Enrollment Service

**What you'll build:**
- FabricCAService class
- User registration with CA
- Automatic enrollment
- Certificate revocation

**Estimated time:** 4 days

---

**Phase 2 Complete!** ✅

**Next:** [Phase 3 - Fabric CA Enrollment](./3-Certificate.md)
