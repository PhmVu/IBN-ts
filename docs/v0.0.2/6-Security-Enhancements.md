# 🛡️ Phase 7: Security Enhancements

**Version:** v0.0.2 REVISED  
**Timeline:** 4 days  
**Difficulty:** ⭐⭐⭐ Advanced  
**Prerequisites:** Phases 1-6 completed, Redis installed

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll add enterprise-grade security features:

- ✅ Rate limiting (Redis-based)
- ✅ Brute-force protection (login attempts)
- ✅ Enhanced audit logging (tamper-proof with hash chain)
- ✅ IP blocking
- ✅ Request/response logging

**Starting Point:** Basic security  
**Ending Point:** Enterprise-grade security

---

## 📋 **PREREQUISITES**

### **1. Install Redis**

```bash
# Using Docker
docker run -d --name ibnts-redis -p 6379:6379 redis:alpine

# Or add to docker-compose.yml
```

**File:** `docker-compose.yml` (ADD)

```yaml
services:
  redis:
    image: redis:alpine
    container_name: ibnts-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### **2. Install Dependencies**

```bash
cd backend-ts
npm install express-rate-limit rate-limit-redis ioredis
npm install --save-dev @types/ioredis
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Configure Redis**

**File:** `backend-ts/src/config/redis.ts` (NEW)

```typescript
import Redis from 'ioredis';
import logger from '../core/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

export default redis;
```

**Add to `.env`:**

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

### **Step 2: Create Rate Limiting Middleware**

**File:** `backend-ts/src/middleware/rateLimiter.ts` (NEW)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis';
import logger from '../core/logger';

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per minute per IP
 */
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    success: false,
    error: 'Too many login attempts'
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      username: req.body.username
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again in 1 minute'
    });
  }
});

/**
 * Chaincode invocation rate limiter
 * 20 requests per minute per user
 */
export const chaincodeInvokeLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:chaincode:'
  }),
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP
    return req.user?.id || req.ip;
  },
  message: {
    success: false,
    error: 'Too many chaincode invocations'
  }
});
```

---

### **Step 3: Create Brute-Force Protection Service**

**File:** `backend-ts/src/services/security/BruteForceProtection.ts` (NEW)

```typescript
import redis from '../../config/redis';
import logger from '../../core/logger';

export class BruteForceProtection {
  private maxAttempts = 5;
  private lockDuration = 3600; // 1 hour in seconds
  private attemptWindow = 900; // 15 minutes in seconds
  
  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(username: string, ip: string): Promise<void> {
    const key = `failed:${username}:${ip}`;
    
    try {
      // Increment failed attempts
      const attempts = await redis.incr(key);
      
      // Set expiry on first attempt
      if (attempts === 1) {
        await redis.expire(key, this.attemptWindow);
      }
      
      logger.warn('Failed login attempt recorded', {
        username,
        ip,
        attempts,
        maxAttempts: this.maxAttempts
      });
      
      // Lock account if max attempts exceeded
      if (attempts >= this.maxAttempts) {
        await this.lockAccount(username, ip);
      }
    } catch (error: any) {
      logger.error('Failed to record login attempt', {
        username,
        ip,
        error: error.message
      });
    }
  }
  
  /**
   * Lock account temporarily
   */
  private async lockAccount(username: string, ip: string): Promise<void> {
    const lockKey = `locked:${username}:${ip}`;
    
    await redis.setex(lockKey, this.lockDuration, '1');
    
    logger.warn('Account temporarily locked', {
      username,
      ip,
      duration: this.lockDuration
    });
  }
  
  /**
   * Check if account is locked
   */
  async isLocked(username: string, ip: string): Promise<boolean> {
    const lockKey = `locked:${username}:${ip}`;
    const locked = await redis.get(lockKey);
    
    return locked === '1';
  }
  
  /**
   * Get remaining lock time
   */
  async getRemainingLockTime(username: string, ip: string): Promise<number> {
    const lockKey = `locked:${username}:${ip}`;
    const ttl = await redis.ttl(lockKey);
    
    return ttl > 0 ? ttl : 0;
  }
  
  /**
   * Clear failed attempts on successful login
   */
  async clearAttempts(username: string, ip: string): Promise<void> {
    const key = `failed:${username}:${ip}`;
    const lockKey = `locked:${username}:${ip}`;
    
    await redis.del(key);
    await redis.del(lockKey);
    
    logger.info('Login attempts cleared', { username, ip });
  }
  
  /**
   * Get failed attempt count
   */
  async getAttemptCount(username: string, ip: string): Promise<number> {
    const key = `failed:${username}:${ip}`;
    const count = await redis.get(key);
    
    return count ? parseInt(count) : 0;
  }
}

export const bruteForceProtection = new BruteForceProtection();
```

---

### **Step 4: Update Login Route with Brute-Force Protection**

**File:** `backend-ts/src/routes/auth.ts` (UPDATE)

```typescript
import { bruteForceProtection } from '../services/security/BruteForceProtection';
import { authLimiter } from '../middleware/rateLimiter';

router.post('/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  
  try {
    // Check if account is locked
    const isLocked = await bruteForceProtection.isLocked(username, ip);
    
    if (isLocked) {
      const remainingTime = await bruteForceProtection.getRemainingLockTime(username, ip);
      
      return res.status(423).json({
        success: false,
        error: `Account temporarily locked. Try again in ${Math.ceil(remainingTime / 60)} minutes.`,
        locked: true,
        remainingSeconds: remainingTime
      });
    }
    
    // Verify credentials
    const user = await db('users').where({ username }).first();
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Record failed attempt
      await bruteForceProtection.recordFailedAttempt(username, ip);
      
      const attempts = await bruteForceProtection.getAttemptCount(username, ip);
      const remaining = 5 - attempts;
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        attemptsRemaining: remaining > 0 ? remaining : 0
      });
    }
    
    // Clear failed attempts on successful login
    await bruteForceProtection.clearAttempts(username, ip);
    
    // Generate JWT token
    const token = await jwtService.generateToken(
      user.id,
      user.username,
      user.email,
      user.organization_id,
      user.wallet_id
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        enrolled: user.enrolled
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
```

---

### **Step 5: Apply Rate Limiters in App**

**File:** `backend-ts/src/app.ts` (UPDATE)

```typescript
import { apiLimiter, authLimiter, chaincodeInvokeLimiter } from './middleware/rateLimiter';

const app = express();

// Apply general rate limiter to all API routes
app.use('/api', apiLimiter);

// Apply strict rate limiter to auth routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Apply chaincode rate limiter
app.use('/api/v1/chaincode/invoke', chaincodeInvokeLimiter);

// ... rest of app
```

---

### **Step 6: Create Enhanced Audit Logging (Optional but Recommended)**

**Update audit_logs table migration:**

```sql
ALTER TABLE audit_logs ADD COLUMN hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN previous_hash VARCHAR(64);
CREATE INDEX idx_audit_logs_hash ON audit_logs(hash);
```

**File:** `backend-ts/src/services/security/AuditService.ts` (NEW)

```typescript
import crypto from 'crypto';
import { db } from '../../config/knex';
import logger from '../../core/logger';

export interface AuditLogData {
  userId?: string;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
  errorMessage?: string;
}

export class AuditService {
  private previousHash: string = '0';
  private initialized: boolean = false;
  
  async initialize(): Promise<void> {
    try {
      const lastLog = await db('audit_logs')
        .orderBy('timestamp', 'desc')
        .first();
      
      if (lastLog) {
        this.previousHash = lastLog.hash;
      }
      
      this.initialized = true;
      logger.info('Audit service initialized');
    } catch (error: any) {
      logger.error('Failed to initialize audit service', { error: error.message });
    }
  }
  
  async log(data: AuditLogData): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const timestamp = new Date();
      
      // Create hash of current log entry
      const currentHash = this.createHash({
        ...data,
        timestamp,
        previousHash: this.previousHash
      });
      
      // Insert into database
      await db('audit_logs').insert({
        user_id: data.userId,
        username: data.username,
        action: data.action,
        resource: data.resource,
        resource_id: data.resourceId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        request_method: data.requestMethod,
        request_path: data.requestPath,
        response_status: data.responseStatus,
        error_message: data.errorMessage,
        timestamp,
        hash: currentHash,
        previous_hash: this.previousHash
      });
      
      // Update previous hash for next entry
      this.previousHash = currentHash;
    } catch (error: any) {
      logger.error('Failed to create audit log', { error: error.message });
    }
  }
  
  private createHash(data: any): string {
    const hashInput = JSON.stringify({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      timestamp: data.timestamp,
      previousHash: data.previousHash
    });
    
    return crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');
  }
}

export const auditService = new AuditService();
```

---

## ✅ **VERIFICATION CHECKLIST**

### **1. Test Rate Limiting**

```bash
# Make 101 requests quickly
for i in {1..101}; do
  curl http://localhost:3000/api/v1/users
done

# 101st request should return 429 (Too Many Requests)
```

### **2. Test Brute-Force Protection**

```bash
# Try 6 failed logins
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "test", "password": "wrong"}'
done

# 6th attempt should return 423 (Locked)
```

### **3. Check Redis**

```bash
# Connect to Redis
docker exec -it ibnts-redis redis-cli

# Check keys
KEYS rl:*
KEYS failed:*
KEYS locked:*

# Should show rate limit and brute-force keys
```

---

## 🧪 **TESTING**

```typescript
describe('Security', () => {
  it('should block after 100 requests', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/v1/users');
    }
    
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(429);
  });
  
  it('should lock after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'wrong' });
    }
    
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test', password: 'correct' });
    
    expect(res.status).toBe(423);
    expect(res.body.locked).toBe(true);
  });
});
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

✅ **Rate limiting** - 100 req/min general, 5 req/min auth  
✅ **Brute-force protection** - Locks after 5 failed attempts  
✅ **Account locking** - 1 hour lockout  
✅ **Audit logging** - Tamper-proof with hash chain (optional)  
✅ **IP tracking** - All requests logged with IP  

---

## 🚀 **NEXT STEPS**

**Phase 8:** MFA & Secrets Management (Optional)

**Estimated time:** 3 days

---

**Phase 7 Complete!** ✅

**Next:** [Phase 8 - MFA & Secrets](./8-MFA-Secrets.md)
