# 📘 IBNwts v0.0.2 REVISED - Complete Implementation Guide

**Version:** v0.0.2 REVISED  
**Last Updated:** December 16, 2025  
**Type:** Complete Build-from-Scratch Guide  
**Audience:** Developers building IBNwts with wallet-based identity

---

## 🎯 **WHAT THIS GUIDE COVERS**

This is a **COMPLETE guide** to build IBNwts v0.0.2 REVISED from scratch with:

✅ Wallet-based identity management (Hyperledger Fabric standard)  
✅ Each user has unique X.509 certificate  
✅ Automatic enrollment with Fabric CA  
✅ Encrypted private key storage (AES-256-GCM)  
✅ JWT RS256 with key rotation  
✅ Certificate revocation (CRL)  
✅ Rate limiting & brute-force protection  
✅ Tamper-proof audit logging  
✅ MFA/2FA (optional)  
✅ Secrets management (optional)  

---

## 📋 **PREREQUISITES**

### **Required Software:**

```bash
# Node.js 18+
node --version  # Should be >= 18.0.0

# Docker & Docker Compose
docker --version
docker-compose --version

# PostgreSQL Client (optional, for debugging)
psql --version

# Git
git --version
```

### **Required Knowledge:**

- TypeScript/Node.js
- PostgreSQL
- Hyperledger Fabric basics
- Docker basics
- REST API concepts

---

## 🏗️ **PROJECT STRUCTURE**

```
IBN with TypeScript/
├── backend-ts/                 # Backend API (Express + TypeScript)
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── database/          # Migrations & seeds
│   │   │   ├── knex-migrations/
│   │   │   └── knex-seeds/
│   │   ├── services/          # Business logic
│   │   │   ├── wallet/        # ⭐ NEW: Wallet service
│   │   │   ├── fabric/        # ⭐ NEW: CA enrollment
│   │   │   ├── auth/          # ⭐ UPDATED: JWT RS256
│   │   │   └── security/      # ⭐ NEW: Rate limiting, audit
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API routes
│   │   └── models/            # Data models
│   ├── knexfile.ts           # Knex configuration
│   └── package.json
│
├── gateway-ts/                # Fabric Gateway (gRPC)
│   └── src/
│       └── services/         # ⭐ UPDATED: Wallet integration
│
├── frontend/                  # React frontend
│   └── src/
│       ├── components/       # ⭐ UPDATED: Enrollment status
│       └── store/            # ⭐ UPDATED: Wallet info
│
├── network/                   # Hyperledger Fabric network
│   ├── crypto-config/        # Certificates & keys
│   └── docker-compose.yml
│
└── doc/v0.0.2/               # This documentation
    ├── 1-PostgreSQL & Migration.md
    ├── 2-RBAC.md (Wallet Service)
    ├── 3-Certificate.md (CA Enrollment)
    ├── 4-JWT.md (RS256 + Rotation)
    ├── 5-Gateway-SDK.md
    ├── 6-Frontend-Permission-UI.md
    ├── 7-Testing-Documentation.md
    ├── 8-Security-Enhancements.md
    └── 9-MFA-Secrets.md
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Database Schema (2 days)**
**File:** `1-PostgreSQL & Migration.md`

**What you'll build:**
- `wallets` table (encrypted identity storage)
- `certificate_revocations` table (CRL)
- `jwt_keys` table (key rotation)
- Update `users` table (wallet columns)

**Starting point:** Existing PostgreSQL database from v0.0.1  
**Ending point:** New tables ready for wallet system

**Key files created:**
```
backend-ts/src/database/knex-migrations/
└── 20251216_wallet_system.ts
```

---

### **Phase 2: Wallet Service (3 days)**
**File:** `2-RBAC.md`

**What you'll build:**
- WalletService class
- AES-256-GCM encryption/decryption
- CRUD operations for identities
- Export/import for backup

**Starting point:** Empty `services/wallet/` folder  
**Ending point:** Working wallet service with encrypted storage

**Key files created:**
```
backend-ts/src/services/wallet/
├── WalletService.ts
└── __tests__/
    └── WalletService.test.ts
```

---

### **Phase 3: Fabric CA Enrollment (4 days)**
**File:** `3-Certificate.md`

**What you'll build:**
- FabricCAService class
- User registration with CA
- User enrollment (get certificate)
- Certificate revocation
- Re-enrollment support

**Starting point:** Empty `services/fabric/` folder  
**Ending point:** Automatic enrollment on user registration

**Key files created:**
```
backend-ts/src/services/fabric/
├── FabricCAService.ts
└── __tests__/
    └── FabricCAService.test.ts
```

---

### **Phase 4: JWT RS256 + Key Rotation (2 days)**
**File:** `4-JWT.md`

**What you'll build:**
- JwtService with RS256
- RSA key pair generation
- Automatic monthly rotation
- Public keys endpoint

**Starting point:** Existing JWT HS256 service  
**Ending point:** JWT RS256 with auto-rotation

**Key files updated:**
```
backend-ts/src/services/auth/
├── JwtService.ts (REWRITE)
└── __tests__/
    └── JwtService.test.ts
```

---

### **Phase 5: Gateway SDK Integration (3 days)**
**File:** `5-Gateway-SDK.md`

**What you'll build:**
- Load user identity from wallet
- Sign transactions with user's private key
- Certificate revocation check
- Multi-organization routing

**Starting point:** Gateway with shared Admin cert  
**Ending point:** Gateway with wallet-based signing

**Key files updated:**
```
gateway-ts/src/services/
└── FabricGatewayService.ts (REWRITE)
```

---

### **Phase 6: Frontend UI (2 days)**
**File:** `6-Frontend-Permission-UI.md`

**What you'll build:**
- User profile with enrollment status
- Wallet ID display
- Certificate info display
- Enrollment guard component

**Starting point:** Basic user profile  
**Ending point:** Complete enrollment status UI

**Key files created:**
```
frontend/src/components/
├── UserProfile.tsx (UPDATE)
└── EnrollmentGuard.tsx (NEW)
```

---

### **Phase 7: Testing & Documentation (3 days)**
**File:** `7-Testing-Documentation.md`

**What you'll build:**
- Unit tests (>80% coverage)
- Integration tests
- E2E tests
- Updated documentation

**Starting point:** Basic tests  
**Ending point:** Comprehensive test suite

**Key files created:**
```
backend-ts/src/**/__tests__/
e2e/
└── transaction-flow.test.ts
```

---

### **Phase 8: Security Enhancements (4 days)**
**File:** `8-Security-Enhancements.md`

**What you'll build:**
- Rate limiting (Redis)
- Brute-force protection
- Tamper-proof audit logging
- IP blocking

**Starting point:** No rate limiting  
**Ending point:** Enterprise-grade security

**Key files created:**
```
backend-ts/src/
├── middleware/rateLimiter.ts
└── services/security/
    ├── BruteForceProtection.ts
    └── AuditService.ts
```

---

### **Phase 9: MFA & Secrets (3 days) - OPTIONAL**
**File:** `9-MFA-Secrets.md`

**What you'll build:**
- TOTP-based 2FA
- QR code enrollment
- Backup codes
- AWS Secrets Manager integration

**Starting point:** Password-only auth  
**Ending point:** MFA + secure secrets

**Key files created:**
```
backend-ts/src/services/security/
├── MFAService.ts
└── SecretsManager.ts
```

---

## 📊 **IMPLEMENTATION TIMELINE**

```
Week 1: Phases 1-2 (Database + Wallet)
├── Day 1-2: Database schema
├── Day 3-5: Wallet service
└── Day 6-7: Testing

Week 2: Phase 3 (Fabric CA)
├── Day 8-10: CA enrollment
├── Day 11: Certificate revocation
└── Day 12-14: Testing & integration

Week 3: Phases 4-5 (JWT + Gateway)
├── Day 15-16: JWT RS256
├── Day 17-19: Gateway integration
└── Day 20-21: Testing

Week 4: Phases 6-7 (Frontend + Testing)
├── Day 22-23: Frontend UI
├── Day 24-26: Comprehensive testing
└── Day 27-28: Documentation

Week 5-6: Phases 8-9 (Security - Optional)
├── Day 29-32: Security enhancements
└── Day 33-35: MFA & secrets (optional)
```

**Total:** 5-6 weeks for complete implementation

---

## 🔄 **MIGRATION FROM v0.0.1**

### **If you have existing v0.0.1 system:**

1. **Backup database:**
   ```bash
   pg_dump ibn_db > backup_v001.sql
   ```

2. **Run new migrations:**
   ```bash
   cd backend-ts
   npm run db:migrate
   ```

3. **Enroll existing users:**
   ```bash
   npm run enroll-existing-users
   ```

4. **Update environment variables:**
   ```bash
   # Add to .env
   WALLET_ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
   MFA_ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

5. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

## ✅ **VERIFICATION CHECKLIST**

After completing all phases, verify:

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
- [ ] Audit logs have hash chain

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**

**1. "WALLET_ENCRYPTION_KEY not configured"**
```bash
# Generate key
openssl rand -hex 32

# Add to .env
WALLET_ENCRYPTION_KEY=<generated_key>
```

**2. "Admin identity not found"**
```bash
# Enroll admin first
npm run enroll-admin
```

**3. "Certificate revoked"**
```bash
# Check revocation list
npm run check-revocations
```

**4. "Rate limit exceeded"**
```bash
# Clear Redis cache
redis-cli FLUSHDB
```

---

## 📚 **NEXT STEPS**

1. **Read Phase 1:** Start with database schema
2. **Follow sequentially:** Complete phases in order
3. **Test after each phase:** Don't skip testing
4. **Ask questions:** Refer to this guide

---

## 🔗 **QUICK LINKS**

- [Phase 1: Database Schema](./1-PostgreSQL%20&%20Migration.md)
- [Phase 2: Wallet Service](./2-RBAC.md)
- [Phase 3: CA Enrollment](./3-Certificate.md)
- [Phase 4: JWT RS256](./4-JWT.md)
- [Phase 5: Gateway SDK](./5-Gateway-SDK.md)
- [Phase 6: Frontend UI](./6-Frontend-Permission-UI.md)
- [Phase 7: Testing](./7-Testing-Documentation.md)
- [Phase 8: Security](./8-Security-Enhancements.md)
- [Phase 9: MFA & Secrets](./9-MFA-Secrets.md)

---

**Ready to start?** → [Go to Phase 1](./1-PostgreSQL%20&%20Migration.md)
