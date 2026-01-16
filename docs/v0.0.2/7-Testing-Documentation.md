# 🧪 Phase 9: Testing & Documentation

**Version:** v0.0.2 REVISED  
**Timeline:** 3 days  
**Difficulty:** ⭐⭐⭐ Advanced  
**Prerequisites:** Phases 1-8 completed

---

## 🎯 **WHAT YOU'LL BUILD**

In this final phase, you'll ensure v0.0.2 REVISED is production-ready:

- ✅ Unit tests for all services (>80% coverage)
- ✅ Integration tests for enrollment flow
- ✅ End-to-end tests for transaction flow
- ✅ Security testing
- ✅ Performance testing
- ✅ Complete documentation
- ✅ Deployment guide

**Starting Point:** All features implemented  
**Ending Point:** Production-ready system with tests

---

## 📋 **TESTING STRATEGY**

### **Test Pyramid:**

```
        /\
       /E2E\      ← 10% (Critical user flows)
      /------\
     /  INT   \   ← 30% (Service integration)
    /----------\
   /   UNIT     \ ← 60% (Individual functions)
  /--------------\
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Unit Tests**

#### **WalletService Tests**

**File:** `backend-ts/src/services/wallet/__tests__/WalletService.test.ts`

```typescript
import { WalletService } from '../WalletService';
import { db } from '../../../config/knex';

describe('WalletService', () => {
  let walletService: WalletService;
  
  beforeAll(async () => {
    process.env.WALLET_ENCRYPTION_KEY = '0'.repeat(64);
    walletService = new WalletService();
    await db.migrate.latest();
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  beforeEach(async () => {
    await db('wallets').del();
  });
  
  describe('Encryption', () => {
    it('should encrypt private key', async () => {
      const identity = {
        certificate: 'cert',
        privateKey: 'secret_key',
        mspId: 'Org1MSP',
        type: 'X.509' as const
      };
      
      await walletService.put('test@org1', identity);
      
      const row = await db('wallets').where({ label: 'test@org1' }).first();
      
      expect(row.private_key).not.toBe('secret_key');
      expect(row.encryption_iv).toBeTruthy();
      expect(row.encryption_tag).toBeTruthy();
    });
    
    it('should decrypt correctly', async () => {
      const identity = {
        certificate: 'cert',
        privateKey: 'secret_key',
        mspId: 'Org1MSP',
        type: 'X.509' as const
      };
      
      await walletService.put('test@org1', identity);
      const retrieved = await walletService.get('test@org1');
      
      expect(retrieved?.privateKey).toBe('secret_key');
    });
    
    it('should fail on tampered data', async () => {
      const identity = {
        certificate: 'cert',
        privateKey: 'secret',
        mspId: 'Org1MSP',
        type: 'X.509' as const
      };
      
      await walletService.put('test@org1', identity);
      
      // Tamper with encrypted data
      await db('wallets')
        .where({ label: 'test@org1' })
        .update({ private_key: 'tampered_data' });
      
      await expect(walletService.get('test@org1')).rejects.toThrow();
    });
  });
});
```

#### **JwtService Tests**

**File:** `backend-ts/src/services/auth/__tests__/JwtService.test.ts`

```typescript
import { JwtService } from '../JwtService';
import { db } from '../../../config/knex';
import jwt from 'jsonwebtoken';

describe('JwtService', () => {
  let jwtService: JwtService;
  
  beforeAll(async () => {
    await db.migrate.latest();
    jwtService = new JwtService();
    await jwtService.initialize();
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  describe('Token Generation', () => {
    it('should generate valid token', async () => {
      const token = await jwtService.generateToken(
        'user-123',
        'john',
        'john@example.com'
      );
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
    
    it('should include key ID in token', async () => {
      const token = await jwtService.generateToken(
        'user-123',
        'john',
        'john@example.com'
      );
      
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded?.header.kid).toBeTruthy();
      expect(decoded?.header.alg).toBe('RS256');
    });
  });
  
  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const token = await jwtService.generateToken(
        'user-123',
        'john',
        'john@example.com'
      );
      
      const payload = await jwtService.verifyToken(token);
      
      expect(payload.id).toBe('user-123');
      expect(payload.username).toBe('john');
    });
    
    it('should reject invalid token', async () => {
      await expect(
        jwtService.verifyToken('invalid_token')
      ).rejects.toThrow('Invalid token');
    });
  });
});
```

---

### **Step 2: Integration Tests**

#### **Enrollment Flow Test**

**File:** `backend-ts/src/__tests__/integration/enrollment.test.ts`

```typescript
import request from 'supertest';
import app from '../../app';
import { db } from '../../config/knex';

describe('User Enrollment Flow', () => {
  let adminToken: string;
  let orgId: string;
  
  beforeAll(async () => {
    await db.migrate.latest();
    
    // Login as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    adminToken = loginRes.body.token;
    
    // Get organization
    const orgRes = await request(app)
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${adminToken}`);
    
    orgId = orgRes.body.data[0].id;
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  it('should enroll user on registration', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!',
        organization_id: orgId
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enrolled).toBe(true);
    expect(res.body.data.wallet_id).toBeTruthy();
    expect(res.body.data.certificate_serial).toBeTruthy();
  });
  
  it('should create wallet for user', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'Test123!',
        organization_id: orgId
      });
    
    const walletId = res.body.data.wallet_id;
    
    // Check wallet exists
    const wallet = await db('wallets')
      .where({ label: walletId })
      .first();
    
    expect(wallet).toBeTruthy();
    expect(wallet.certificate).toBeTruthy();
    expect(wallet.private_key).toBeTruthy();
  });
});
```

---

### **Step 3: End-to-End Tests**

**Install Playwright:**

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**File:** `e2e/transaction-flow.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Transaction Flow', () => {
  test('should complete full transaction flow', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // 2. Check enrollment status
    await page.goto('/profile');
    await expect(page.locator('text=✓ Enrolled')).toBeVisible();
    
    // 3. Navigate to chaincode
    await page.goto('/chaincode/invoke');
    
    // 4. Fill transaction form
    await page.selectOption('[name="channel"]', 'supply-chain');
    await page.selectOption('[name="chaincode"]', 'TeaTrace');
    await page.fill('[name="function"]', 'CreateBatch');
    await page.fill('[name="args"]', '["BATCH-001", "Green Tea", "1000"]');
    
    // 5. Submit transaction
    await page.click('button:has-text("Submit")');
    
    // 6. Verify success
    await expect(page.locator('text=Transaction successful')).toBeVisible();
    await expect(page.locator('[data-testid="tx-id"]')).toBeVisible();
  });
  
  it('should block non-enrolled users', async ({ page }) => {
    // Create non-enrolled user
    // Try to access /chaincode
    // Should see enrollment warning
    await page.goto('http://localhost:3000/chaincode');
    await expect(page.locator('text=Enrollment Required')).toBeVisible();
  });
});
```

---

### **Step 4: Security Tests**

**File:** `backend-ts/src/__tests__/security/security.test.ts`

```typescript
describe('Security Tests', () => {
  it('should not store private keys in plain text', async () => {
    await walletService.put('test@org1', {
      certificate: 'cert',
      privateKey: 'SUPER_SECRET_KEY',
      mspId: 'Org1MSP',
      type: 'X.509'
    });
    
    const row = await db('wallets')
      .where({ label: 'test@org1' })
      .first();
    
    expect(row.private_key).not.toContain('SUPER_SECRET_KEY');
  });
  
  it('should enforce rate limiting', async () => {
    // Make 101 requests
    const promises = [];
    for (let i = 0; i < 101; i++) {
      promises.push(request(app).get('/api/v1/users'));
    }
    
    const results = await Promise.all(promises);
    const rateLimited = results.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  it('should lock account after failed attempts', async () => {
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

### **Step 5: Performance Tests**

**File:** `performance/load-test.ts`

```typescript
import autocannon from 'autocannon';

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:3000/api/v1/users',
    connections: 10,
    duration: 10,
    headers: {
      'Authorization': 'Bearer <token>'
    }
  });
  
  console.log('Requests/sec:', result.requests.average);
  console.log('Latency (ms):', result.latency.mean);
  
  // Assert performance requirements
  expect(result.requests.average).toBeGreaterThan(100);
  expect(result.latency.mean).toBeLessThan(100);
}
```

---

### **Step 6: Test Coverage Report**

**Add to package.json:**

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test"
  },
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

**Run tests:**

```bash
npm run test:coverage

# Expected output:
# ----------------------|---------|----------|---------|---------|
# File                  | % Stmts | % Branch | % Funcs | % Lines |
# ----------------------|---------|----------|---------|---------|
# All files             |   85.23 |    82.14 |   87.45 |   85.67 |
#  WalletService.ts     |   92.31 |    88.89 |   95.00 |   92.50 |
#  JwtService.ts        |   89.47 |    85.71 |   90.00 |   89.74 |
#  FabricCAService.ts   |   81.25 |    77.78 |   83.33 |   81.48 |
# ----------------------|---------|----------|---------|---------|
```

---

## 📚 **DOCUMENTATION UPDATES**

### **1. Update README.md**

```markdown
# IBNwts v0.0.2 REVISED - Wallet-Based Identity

## What's New in v0.0.2

### 🔐 Wallet-Based Identity Management
- Each user has unique X.509 certificate from Fabric CA
- Automatic enrollment on user registration
- Encrypted private key storage (AES-256-GCM)
- Non-repudiation for all transactions

### 🔑 JWT RS256 with Key Rotation
- Asymmetric JWT signing (RS256)
- Automatic monthly key rotation
- Old keys kept for 30 days

### 🎫 Certificate Management
- Certificate Revocation List (CRL)
- Certificate expiry tracking
- Re-enrollment support

### 🛡️ Security Enhancements
- Rate limiting (100 req/min)
- Brute-force protection (5 attempts)
- Tamper-proof audit logging
- MFA/2FA support (optional)

## Security Improvements

- ✅ Private keys encrypted at rest
- ✅ Each user signs their own transactions
- ✅ Certificate-based authentication
- ✅ Automatic key rotation
- ✅ Revocation support
```

### **2. Create Migration Guide**

**File:** `MIGRATION-v0.0.1-to-v0.0.2.md`

```markdown
# Migration Guide: v0.0.1 → v0.0.2 REVISED

## Prerequisites

- Backup database
- Stop all services
- Update environment variables

## Step 1: Database Migration

```bash
cd backend-ts
npm run db:migrate
```

## Step 2: Enroll Admin

```bash
npm run enroll-admin
```

## Step 3: Enroll Existing Users

```bash
npm run enroll-existing-users
```

## Step 4: Update Environment

```bash
# Add to .env
WALLET_ENCRYPTION_KEY=<generate>
MFA_ENCRYPTION_KEY=<generate>
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Step 5: Restart Services

```bash
docker-compose down
docker-compose up -d
```

## Rollback Plan

If issues occur:

```bash
npm run db:rollback
```
```

---

## ✅ **FINAL VERIFICATION CHECKLIST**

### **Database:**
- [ ] `wallets` table exists with encrypted data
- [ ] `certificate_revocations` table exists
- [ ] `jwt_keys` table has active key
- [ ] `users` table has wallet columns

### **Backend:**
- [ ] WalletService can encrypt/decrypt
- [ ] FabricCAService can enroll users
- [ ] JwtService generates RS256 tokens
- [ ] Rate limiting working
- [ ] Audit logging working

### **Gateway:**
- [ ] Loads user identity from wallet
- [ ] Signs transactions with user's key
- [ ] Checks certificate revocation

### **Frontend:**
- [ ] Shows enrollment status
- [ ] Displays wallet info
- [ ] EnrollmentGuard blocks non-enrolled users

### **Security:**
- [ ] No plain-text private keys in database
- [ ] All transactions signed by actual users
- [ ] Rate limiting blocks excessive requests
- [ ] Brute-force protection locks accounts
- [ ] Audit logs have hash chain (if enabled)

### **Tests:**
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security tests passing
- [ ] Performance tests passing

---

## 🚀 **DEPLOYMENT CHECKLIST**

- [ ] Run all tests
- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Enroll admin
- [ ] Enroll existing users
- [ ] Generate initial JWT keys
- [ ] Backup database
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Monitor logs
- [ ] Verify user enrollments

---

## 📊 **SUCCESS METRICS**

- ✅ 100% of users enrolled
- ✅ 0 plain-text private keys in database
- ✅ All transactions signed by actual users
- ✅ Certificate revocation working
- ✅ Key rotation automated
- ✅ No security vulnerabilities
- ✅ Test coverage >80%

---

## 🎉 **CONGRATULATIONS!**

You have successfully completed **IBNwts v0.0.2 REVISED** with:

✅ **9 Phases Implemented:**
1. Database Schema
2. Wallet Service
3. Fabric CA Enrollment
4. JWT RS256 & Key Rotation
5. Gateway SDK Integration
6. Frontend UI
7. Security Enhancements
8. MFA & Secrets (Optional)
9. Testing & Documentation

✅ **Enterprise-Grade Security:**
- Wallet-based identity management
- Encrypted private keys
- Certificate revocation
- Rate limiting & brute-force protection
- Tamper-proof audit logging
- MFA/2FA support

✅ **Production-Ready:**
- Comprehensive test suite
- Complete documentation
- Migration guide
- Deployment checklist

---

**Total Implementation Time:** 4-6 weeks  
**Test Coverage:** >80%  
**Security Level:** Enterprise-Grade  

**🎊 v0.0.2 REVISED COMPLETE!**
