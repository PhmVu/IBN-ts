# 🔑 Phase 4: JWT RS256 & Key Rotation

**Version:** v0.0.2 REVISED  
**Timeline:** 2 days  
**Difficulty:** ⭐⭐⭐ Advanced  
**Prerequisites:** Phase 1 completed (jwt_keys table exists)

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll upgrade JWT authentication from HS256 to RS256 with automatic key rotation:

- ✅ Generate RSA key pairs (2048-bit)
- ✅ Sign JWT with private key (RS256)
- ✅ Verify JWT with public key
- ✅ Automatic monthly key rotation
- ✅ Keep old keys for 30 days (verify old tokens)
- ✅ Public keys endpoint for external services

**Starting Point:** Existing JWT HS256 service  
**Ending Point:** JWT RS256 with auto-rotation

---

## 📋 **PREREQUISITES**

### **1. Phase 1 Must Be Complete**

```bash
# Verify jwt_keys table exists
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "\d jwt_keys"

# Should show jwt_keys table structure
```

### **2. Check Existing JWT Service**

```bash
# Check if JWT service exists
ls -la backend-ts/src/services/auth/JwtService.ts

# This file will be REWRITTEN in this phase
```

---

## 🔍 **CURRENT STATE CHECK**

```bash
# Check current JWT implementation
grep -r "jwt.sign" backend-ts/src/services/auth/

# You'll see HS256 (symmetric) - we'll change to RS256 (asymmetric)
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Rewrite JwtService with RS256**

**File:** `backend-ts/src/services/auth/JwtService.ts` (COMPLETE REWRITE)

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../config/knex';
import logger from '../../core/logger';

export interface JwtPayload {
  id: string;
  sub: string;
  username: string;
  email: string;
  organization_id?: string;
  wallet_id?: string;
  roles?: Array<{ id: string; name: string }>;
  iat: number;
  exp: number;
  kid: string;  // Key ID for rotation
}

/**
 * JWT Service with RS256 and Key Rotation
 * 
 * Features:
 * - Asymmetric encryption (RS256)
 * - Automatic monthly key rotation
 * - Old keys kept for 30 days
 * - Public keys endpoint for microservices
 */
export class JwtService {
  private currentKeyId: string | null = null;
  private privateKey: string | null = null;
  private publicKey: string | null = null;
  private initialized: boolean = false;
  
  /**
   * Initialize JWT service
   * Load active key from database or generate new one
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing JWT service...');
      
      // Load active key
      const activeKey = await db('jwt_keys')
        .where({ is_active: true })
        .first();
      
      if (!activeKey) {
        logger.warn('No active JWT key found, generating new key');
        await this.generateNewKey();
      } else {
        this.currentKeyId = activeKey.key_id;
        this.privateKey = activeKey.private_key;
        this.publicKey = activeKey.public_key;
        
        logger.info('JWT service initialized', {
          keyId: this.currentKeyId,
          algorithm: activeKey.algorithm,
          createdAt: activeKey.created_at
        });
      }
      
      this.initialized = true;
      
      // Schedule key rotation check (daily at midnight)
      this.scheduleKeyRotationCheck();
      
    } catch (error: any) {
      logger.error('Failed to initialize JWT service', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Generate JWT access token
   * 
   * @param userId - User ID
   * @param username - Username
   * @param email - Email
   * @param organizationId - Organization ID (optional)
   * @param walletId - Wallet ID (optional)
   * @param roles - User roles (optional)
   * @returns JWT token
   * 
   * @example
   * const token = await jwtService.generateToken(
   *   'user-123',
   *   'john',
   *   'john@example.com',
   *   'org-123',
   *   'john@org1',
   *   [{ id: 'role-1', name: 'User' }]
   * );
   */
  async generateToken(
    userId: string,
    username: string,
    email: string,
    organizationId?: string,
    walletId?: string,
    roles?: Array<{ id: string; name: string }>
  ): Promise<string> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!this.privateKey || !this.currentKeyId) {
        throw new Error('JWT service not properly initialized');
      }
      
      const now = Math.floor(Date.now() / 1000);
      
      const payload: Omit<JwtPayload, 'iat' | 'exp' | 'kid'> = {
        id: userId,
        sub: userId,
        username,
        email,
        organization_id: organizationId,
        wallet_id: walletId,
        roles
      };
      
      const token = jwt.sign(
        payload,
        this.privateKey,
        {
          algorithm: 'RS256',
          expiresIn: '24h',
          keyid: this.currentKeyId
        }
      );
      
      logger.debug('JWT token generated', {
        userId,
        keyId: this.currentKeyId,
        expiresIn: '24h'
      });
      
      return token;
    } catch (error: any) {
      logger.error('Failed to generate JWT token', {
        userId,
        error: error.message
      });
      throw new Error('Token generation failed');
    }
  }
  
  /**
   * Verify JWT token
   * 
   * @param token - JWT token to verify
   * @returns Decoded payload
   * 
   * @throws Error if token is invalid or expired
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Decode token header to get key ID
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }
      
      const keyId = decoded.header.kid as string;
      
      if (!keyId) {
        throw new Error('Token missing key ID');
      }
      
      // Get public key for this key ID
      const keyRecord = await db('jwt_keys')
        .where({ key_id: keyId })
        .first();
      
      if (!keyRecord) {
        throw new Error(`Unknown key ID: ${keyId}`);
      }
      
      // Verify token with public key
      const payload = jwt.verify(token, keyRecord.public_key, {
        algorithms: ['RS256']
      }) as JwtPayload;
      
      logger.debug('JWT token verified', {
        userId: payload.id,
        keyId: keyId
      });
      
      return payload;
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired', { error: error.message });
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token', { error: error.message });
        throw new Error('Invalid token');
      }
      
      logger.error('Failed to verify JWT token', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Generate new RSA key pair
   * Deactivates old keys and creates new active key
   * 
   * @private
   */
  private async generateNewKey(): Promise<void> {
    try {
      logger.info('Generating new RSA key pair');
      
      // Generate RSA key pair (2048-bit)
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Generate key ID (format: key-YYYY-MM)
      const now = new Date();
      const keyId = `key-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Deactivate old keys
      await db('jwt_keys')
        .where({ is_active: true })
        .update({ is_active: false });
      
      logger.info('Old keys deactivated');
      
      // Insert new key
      await db('jwt_keys').insert({
        key_id: keyId,
        private_key: privateKey,
        public_key: publicKey,
        algorithm: 'RS256',
        is_active: true,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      
      // Update current key
      this.currentKeyId = keyId;
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      
      logger.info('New RSA key pair generated', {
        keyId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      
      // Clean up expired keys
      await this.cleanupExpiredKeys();
      
    } catch (error: any) {
      logger.error('Failed to generate new key', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Check if key rotation is needed
   * Called daily by scheduler
   * 
   * @private
   */
  private async checkKeyRotation(): Promise<void> {
    try {
      const activeKey = await db('jwt_keys')
        .where({ is_active: true })
        .first();
      
      if (!activeKey) {
        logger.warn('No active key found, generating new key');
        await this.generateNewKey();
        return;
      }
      
      const createdAt = new Date(activeKey.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Rotate key if older than 30 days
      if (daysSinceCreation >= 30) {
        logger.info('Key rotation needed', {
          keyId: activeKey.key_id,
          daysSinceCreation
        });
        await this.generateNewKey();
      } else {
        logger.debug('Key rotation not needed', {
          keyId: activeKey.key_id,
          daysSinceCreation,
          daysUntilRotation: 30 - daysSinceCreation
        });
      }
    } catch (error: any) {
      logger.error('Failed to check key rotation', { error: error.message });
    }
  }
  
  /**
   * Schedule daily key rotation check
   * 
   * @private
   */
  private scheduleKeyRotationCheck(): void {
    // Check every 24 hours
    setInterval(() => {
      this.checkKeyRotation();
    }, 24 * 60 * 60 * 1000);
    
    logger.info('Key rotation check scheduled (every 24 hours)');
  }
  
  /**
   * Clean up expired keys
   * 
   * @private
   */
  private async cleanupExpiredKeys(): Promise<void> {
    try {
      const result = await db('jwt_keys')
        .where('expires_at', '<', new Date())
        .delete();
      
      if (result > 0) {
        logger.info('Expired keys cleaned up', { count: result });
      }
    } catch (error: any) {
      logger.error('Failed to cleanup expired keys', { error: error.message });
    }
  }
  
  /**
   * Get all public keys (for external services)
   * 
   * @returns Array of public keys with metadata
   */
  async getPublicKeys(): Promise<Array<{
    keyId: string;
    publicKey: string;
    algorithm: string;
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
  }>> {
    try {
      const keys = await db('jwt_keys')
        .select('key_id', 'public_key', 'algorithm', 'is_active', 'created_at', 'expires_at')
        .orderBy('created_at', 'desc');
      
      return keys.map(k => ({
        keyId: k.key_id,
        publicKey: k.public_key,
        algorithm: k.algorithm,
        isActive: k.is_active,
        createdAt: new Date(k.created_at),
        expiresAt: k.expires_at ? new Date(k.expires_at) : null
      }));
    } catch (error: any) {
      logger.error('Failed to get public keys', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Force key rotation (manual)
   * Used by admin to rotate keys immediately
   */
  async rotateKey(): Promise<void> {
    logger.info('Manual key rotation triggered');
    await this.generateNewKey();
  }
  
  /**
   * Get key statistics
   * 
   * @returns Key statistics
   */
  async getKeyStatistics(): Promise<{
    totalKeys: number;
    activeKey: string | null;
    oldestKey: Date | null;
    newestKey: Date | null;
  }> {
    try {
      const stats = await db('jwt_keys')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('MIN(created_at) as oldest'),
          db.raw('MAX(created_at) as newest')
        )
        .first();
      
      const activeKey = await db('jwt_keys')
        .where({ is_active: true })
        .select('key_id')
        .first();
      
      return {
        totalKeys: parseInt(stats.total),
        activeKey: activeKey?.key_id || null,
        oldestKey: stats.oldest ? new Date(stats.oldest) : null,
        newestKey: stats.newest ? new Date(stats.newest) : null
      };
    } catch (error: any) {
      logger.error('Failed to get key statistics', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
export const jwtService = new JwtService();
```

---

### **Step 2: Update Auth Middleware**

**File:** `backend-ts/src/middleware/auth.ts` (UPDATE)

```typescript
import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/auth/JwtService';
import logger from '../core/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    sub: string;
    username: string;
    email: string;
    organization_id?: string;
    wallet_id?: string;
    roles?: Array<{ id: string; name: string }>;
  };
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }
    
    const token = authHeader.substring(7);
    
    // Verify token with RS256
    const decoded = await jwtService.verifyToken(token);
    
    (req as AuthRequest).user = {
      id: decoded.id,
      sub: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      organization_id: decoded.organization_id,
      wallet_id: decoded.wallet_id,
      roles: decoded.roles
    };
    
    next();
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    
    _res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await jwtService.verifyToken(token);
      
      (req as AuthRequest).user = {
        id: decoded.id,
        sub: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        organization_id: decoded.organization_id,
        wallet_id: decoded.wallet_id,
        roles: decoded.roles
      };
    }
    
    next();
  } catch (error: any) {
    // Don't fail, just continue without user
    next();
  }
};
```

---

### **Step 3: Update Login Route**

**File:** `backend-ts/src/routes/auth.ts` (UPDATE)

```typescript
import { Router } from 'express';
import { db } from '../config/knex';
import { jwtService } from '../services/auth/JwtService';
import bcrypt from 'bcryptjs';
import logger from '../core/logger';

const router = Router();

/**
 * Login endpoint
 * POST /api/v1/auth/login
 */
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Get user
    const user = await db('users')
      .where({ username })
      .first();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Get user roles
    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where({ user_id: user.id })
      .select('roles.id', 'roles.name');
    
    // Generate JWT token with RS256
    const token = await jwtService.generateToken(
      user.id,
      user.username,
      user.email,
      user.organization_id,
      user.wallet_id,
      roles
    );
    
    logger.info('User logged in', {
      userId: user.id,
      username: user.username
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        organization_id: user.organization_id,
        wallet_id: user.wallet_id,
        enrolled: user.enrolled,
        roles
      }
    });
  } catch (error: any) {
    logger.error('Login failed', { username, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * Get public keys endpoint
 * GET /api/v1/auth/public-keys
 * No authentication required
 */
router.get('/auth/public-keys', async (req, res) => {
  try {
    const keys = await jwtService.getPublicKeys();
    
    res.json({
      success: true,
      data: {
        keys: keys.map(k => ({
          kid: k.keyId,
          kty: 'RSA',
          alg: k.algorithm,
          use: 'sig',
          key: k.publicKey,
          active: k.isActive,
          created_at: k.createdAt,
          expires_at: k.expiresAt
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Manual key rotation endpoint (SuperAdmin only)
 * POST /api/v1/auth/rotate-key
 */
router.post('/auth/rotate-key', authMiddleware, async (req, res) => {
  try {
    // Check if user is SuperAdmin
    const isSuperAdmin = req.user?.roles?.some(r => r.name === 'SuperAdmin');
    
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: SuperAdmin role required'
      });
    }
    
    await jwtService.rotateKey();
    
    res.json({
      success: true,
      message: 'Key rotated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

### **Step 4: Initialize JWT Service on Startup**

**File:** `backend-ts/src/app.ts` (UPDATE)

```typescript
import express from 'express';
import { jwtService } from './services/auth/JwtService';
import logger from './core/logger';

const app = express();

// ... other middleware

/**
 * Initialize services on startup
 */
async function initializeApp() {
  try {
    // Initialize JWT service (load/generate keys)
    await jwtService.initialize();
    
    logger.info('Application initialized successfully');
  } catch (error: any) {
    logger.error('Failed to initialize application', { error: error.message });
    process.exit(1);
  }
}

// Initialize before starting server
initializeApp();

// ... rest of app setup

export default app;
```

---

## ✅ **VERIFICATION CHECKLIST**

### **1. Check JWT Keys in Database**

```sql
-- Check jwt_keys table
SELECT key_id, algorithm, is_active, created_at, expires_at 
FROM jwt_keys 
ORDER BY created_at DESC;

-- Should show at least one active key
```

### **2. Test Token Generation**

```bash
# Login to get token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Should return token
```

### **3. Verify Token Structure**

```bash
# Decode token (use jwt.io)
# Header should show:
# {
#   "alg": "RS256",
#   "typ": "JWT",
#   "kid": "key-2025-12"
# }
```

### **4. Test Public Keys Endpoint**

```bash
curl http://localhost:3000/api/v1/auth/public-keys

# Should return public keys
```

---

## 🧪 **TESTING**

### **Test 1: Token Generation and Verification**

```typescript
// test-jwt.ts
import { jwtService } from './src/services/auth/JwtService';

async function test() {
  await jwtService.initialize();
  
  // Generate token
  const token = await jwtService.generateToken(
    'user-123',
    'john',
    'john@example.com',
    'org-123',
    'john@org1'
  );
  
  console.log('Token generated:', token);
  
  // Verify token
  const payload = await jwtService.verifyToken(token);
  console.log('Token verified:', payload);
}

test();
```

---

## 🔧 **TROUBLESHOOTING**

### **Issue 1: "JWT service not properly initialized"**

**Solution:**
```typescript
// Make sure to call initialize() in app.ts
await jwtService.initialize();
```

### **Issue 2: "Unknown key ID"**

**Cause:** Token signed with old key that was deleted

**Solution:**
```bash
# Check key rotation settings
# Old keys should be kept for 30 days
```

### **Issue 3: "Invalid token"**

**Solution:**
```bash
# Check if token is RS256
# Old HS256 tokens are no longer valid
# Users need to login again
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

✅ **JWT RS256** - Asymmetric encryption  
✅ **Key rotation** - Automatic monthly rotation  
✅ **Public keys endpoint** - For microservices  
✅ **Old key support** - 30-day grace period  
✅ **Manual rotation** - Admin can force rotation  

---

## 🚀 **NEXT STEPS**

**Phase 5:** Gateway SDK Integration with Wallet

**Estimated time:** 3 days

---

**Phase 4 Complete!** ✅

**Next:** [Phase 5 - Gateway SDK](./5-Gateway-SDK.md)
