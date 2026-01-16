# 🔐 Phase 8: MFA & Secrets Management - v0.0.2 REVISED

**Version:** v0.0.2 REVISED  
**Timeline:** 3 days  
**Status:** 📝 Optional - Enterprise Features  
**Priority:** 🟢 MEDIUM  
**Focus:** Two-Factor Authentication & Secure Secrets Management

---

## 🎯 **OBJECTIVE**

Add enterprise-grade security features:

✅ TOTP-based 2FA (Time-based One-Time Password)  
✅ QR code enrollment  
✅ Backup codes  
✅ Secrets management (AWS Secrets Manager / HashiCorp Vault)  
✅ Environment-based configuration  

---

## 🔑 **TWO-FACTOR AUTHENTICATION (2FA)**

### **1. Install Dependencies**

```bash
cd backend-ts
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

### **2. Database Schema**

```sql
-- Add MFA columns to users table
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);  -- Encrypted
ALTER TABLE users ADD COLUMN mfa_backup_codes TEXT;    -- Encrypted JSON array

CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled);
```

### **3. MFA Service**

**File:** `backend-ts/src/services/security/MFAService.ts`

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '@config/knex';
import logger from '@core/logger';

export class MFAService {
  private encryptionKey: Buffer;
  
  constructor() {
    const keyHex = process.env.MFA_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('MFA_ENCRYPTION_KEY must be 64 hex characters');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }
  
  /**
   * Enable MFA for user
   * Returns secret and QR code
   */
  async enableMFA(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    try {
      const user = await db('users').where({ id: userId }).first();
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `IBNwts (${user.username})`,
        issuer: 'IBNwts Platform',
        length: 32
      });
      
      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes(10);
      
      // Encrypt secret and backup codes
      const encryptedSecret = this.encrypt(secret.base32);
      const encryptedBackupCodes = this.encrypt(JSON.stringify(backupCodes));
      
      // Save to database
      await db('users').where({ id: userId }).update({
        mfa_secret: encryptedSecret,
        mfa_backup_codes: encryptedBackupCodes,
        mfa_enabled: false, // Not enabled until verified
        updated_at: new Date()
      });
      
      logger.info('MFA enrollment initiated', { userId, username: user.username });
      
      return {
        secret: secret.base32,
        qrCode,
        backupCodes
      };
    } catch (error) {
      logger.error('Failed to enable MFA', { userId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Verify MFA token and activate MFA
   */
  async verifyAndActivateMFA(userId: string, token: string): Promise<boolean> {
    try {
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.mfa_secret) {
        throw new Error('MFA not initiated');
      }
      
      // Decrypt secret
      const secret = this.decrypt(user.mfa_secret);
      
      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1 // Allow 30s time drift
      });
      
      if (verified) {
        // Activate MFA
        await db('users').where({ id: userId }).update({
          mfa_enabled: true,
          updated_at: new Date()
        });
        
        logger.info('MFA activated', { userId });
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to verify MFA token', { userId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Verify MFA token during login
   */
  async verifyMFA(userId: string, token: string): Promise<boolean> {
    try {
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.mfa_enabled || !user.mfa_secret) {
        return true; // MFA not enabled
      }
      
      // Decrypt secret
      const secret = this.decrypt(user.mfa_secret);
      
      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
      });
      
      if (verified) {
        return true;
      }
      
      // Check backup codes
      const backupCodesValid = await this.verifyBackupCode(userId, token);
      
      return backupCodesValid;
    } catch (error) {
      logger.error('Failed to verify MFA', { userId, error: error.message });
      return false;
    }
  }
  
  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.mfa_backup_codes) {
        return false;
      }
      
      // Decrypt backup codes
      const backupCodesJson = this.decrypt(user.mfa_backup_codes);
      const backupCodes: string[] = JSON.parse(backupCodesJson);
      
      // Check if code exists
      const index = backupCodes.indexOf(code);
      
      if (index !== -1) {
        // Remove used backup code
        backupCodes.splice(index, 1);
        
        // Update database
        const encryptedCodes = this.encrypt(JSON.stringify(backupCodes));
        await db('users').where({ id: userId }).update({
          mfa_backup_codes: encryptedCodes
        });
        
        logger.info('Backup code used', { userId, remainingCodes: backupCodes.length });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to verify backup code', { userId, error: error.message });
      return false;
    }
  }
  
  /**
   * Disable MFA
   */
  async disableMFA(userId: string): Promise<void> {
    await db('users').where({ id: userId }).update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
      updated_at: new Date()
    });
    
    logger.info('MFA disabled', { userId });
  }
  
  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }
  
  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    });
  }
  
  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string): string {
    const { encrypted, iv, tag } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

export const mfaService = new MFAService();
```

### **4. Update Login Flow**

**File:** `backend-ts/src/routes/auth.ts`

```typescript
router.post('/auth/login', authLimiter, async (req, res) => {
  const { username, password, mfaToken } = req.body;
  
  try {
    // Step 1: Verify password
    const user = await db('users').where({ username }).first();
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await bruteForceProtection.recordFailedAttempt(username, req.ip);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Step 2: Check if MFA is enabled
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return res.status(200).json({
          success: true,
          mfaRequired: true,
          message: 'Please provide MFA token'
        });
      }
      
      // Verify MFA token
      const mfaValid = await mfaService.verifyMFA(user.id, mfaToken);
      
      if (!mfaValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid MFA token'
        });
      }
    }
    
    // Step 3: Generate JWT
    const token = await jwtService.generateToken(
      user.id,
      user.username,
      user.email,
      user.organization_id,
      user.wallet_id
    );
    
    await bruteForceProtection.clearAttempts(username, req.ip);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mfaEnabled: user.mfa_enabled
      }
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Enable MFA
router.post('/auth/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const result = await mfaService.enableMFA(req.user.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify and activate MFA
router.post('/auth/mfa/verify', authMiddleware, async (req, res) => {
  const { token } = req.body;
  
  try {
    const verified = await mfaService.verifyAndActivateMFA(req.user.id, token);
    
    if (verified) {
      res.json({
        success: true,
        message: 'MFA activated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 🔐 **SECRETS MANAGEMENT**

### **Option 1: AWS Secrets Manager**

```bash
npm install @aws-sdk/client-secrets-manager
```

**File:** `backend-ts/src/services/security/SecretsManager.ts`

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import logger from '@core/logger';

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }
  
  /**
   * Get secret from AWS Secrets Manager
   */
  async getSecret(secretName: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(secretName);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName
      });
      
      const response = await this.client.send(command);
      const secret = response.SecretString!;
      
      // Cache secret
      this.cache.set(secretName, {
        value: secret,
        expiry: Date.now() + this.cacheDuration
      });
      
      logger.debug('Secret retrieved', { secretName });
      
      return secret;
    } catch (error) {
      logger.error('Failed to get secret', {
        secretName,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get database password
   */
  async getDatabasePassword(): Promise<string> {
    return await this.getSecret('ibnwts/database/password');
  }
  
  /**
   * Get wallet encryption key
   */
  async getWalletEncryptionKey(): Promise<string> {
    return await this.getSecret('ibnwts/wallet/encryption-key');
  }
  
  /**
   * Get MFA encryption key
   */
  async getMFAEncryptionKey(): Promise<string> {
    return await this.getSecret('ibnwts/mfa/encryption-key');
  }
}

export const secretsManager = new SecretsManager();
```

### **Option 2: HashiCorp Vault**

```bash
npm install node-vault
```

```typescript
import vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function getSecret(path: string): Promise<any> {
  const result = await vaultClient.read(path);
  return result.data;
}
```

---

## ✅ **ACCEPTANCE CRITERIA**

### **MFA:**
- [ ] Users can enable MFA
- [ ] QR code generated for enrollment
- [ ] TOTP verification working
- [ ] Backup codes generated
- [ ] Backup codes can be used once
- [ ] MFA required during login
- [ ] MFA can be disabled

### **Secrets Management:**
- [ ] Secrets loaded from AWS/Vault
- [ ] Secrets cached for 5 minutes
- [ ] No secrets in environment files
- [ ] Secrets rotation supported

---

## 🧪 **TESTING**

```typescript
describe('MFA Service', () => {
  it('should enable MFA', async () => {
    const result = await mfaService.enableMFA('user-123');
    
    expect(result.secret).toBeTruthy();
    expect(result.qrCode).toContain('data:image/png');
    expect(result.backupCodes).toHaveLength(10);
  });
  
  it('should verify TOTP token', async () => {
    const { secret } = await mfaService.enableMFA('user-123');
    
    const token = speakeasy.totp({
      secret,
      encoding: 'base32'
    });
    
    const verified = await mfaService.verifyAndActivateMFA('user-123', token);
    expect(verified).toBe(true);
  });
  
  it('should verify backup code', async () => {
    const { backupCodes } = await mfaService.enableMFA('user-123');
    
    const verified = await mfaService.verifyMFA('user-123', backupCodes[0]);
    expect(verified).toBe(true);
    
    // Code should not work twice
    const verified2 = await mfaService.verifyMFA('user-123', backupCodes[0]);
    expect(verified2).toBe(false);
  });
});
```

---

## 📊 **SUMMARY: ALL SECURITY FEATURES**

| Feature | Phase | Priority | Status |
|---------|-------|----------|--------|
| Wallet-Based Identity | 1-3 | 🔴 CRITICAL | ✅ Complete |
| Private Key Encryption | 2 | 🔴 CRITICAL | ✅ Complete |
| JWT RS256 + Rotation | 4 | 🔴 CRITICAL | ✅ Complete |
| Certificate Revocation | 3 | 🔴 CRITICAL | ✅ Complete |
| Rate Limiting | 8 | 🟡 HIGH | ✅ Complete |
| Brute-Force Protection | 8 | 🟡 HIGH | ✅ Complete |
| Tamper-Proof Audit Log | 8 | 🟡 HIGH | ✅ Complete |
| MFA/2FA | 9 | 🟢 MEDIUM | ✅ Complete |
| Secrets Management | 9 | 🟢 MEDIUM | ✅ Complete |

---

**Status:** ✅ ALL SECURITY FEATURES DOCUMENTED  
**Total Phases:** 9  
**Implementation Time:** 4-6 weeks
