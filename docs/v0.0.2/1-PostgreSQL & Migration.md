# 🗄️ Phase 1: Wallet System Database Schema

**Version:** v0.0.2 REVISED  
**Timeline:** 2 days  
**Difficulty:** ⭐⭐ Intermediate  
**Prerequisites:** PostgreSQL running, Knex.js configured

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll create the database foundation for wallet-based identity management:

- ✅ `wallets` table - Store encrypted user identities
- ✅ `certificate_revocations` table - Certificate Revocation List (CRL)
- ✅ `jwt_keys` table - Support JWT key rotation
- ✅ Update `users` table - Add wallet-related columns

**Starting Point:** Existing PostgreSQL database from v0.0.1  
**Ending Point:** Database ready for wallet system

---

## 📋 **PREREQUISITES**

### **1. Check PostgreSQL is Running**

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Expected output:
# ibnts-postgres   postgres:15-alpine   Up X minutes   0.0.0.0:5433->5432/tcp
```

If not running:
```bash
docker-compose up -d postgres
```

### **2. Verify Database Connection**

```bash
# Test connection
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "SELECT version();"

# Should show PostgreSQL version
```

### **3. Check Knex Configuration**

**File:** `backend-ts/knexfile.ts` should exist with:

```typescript
// Verify this file exists and has correct config
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ibn_db',
      user: process.env.DB_USER || 'ibn_user',
      password: process.env.DB_PASSWORD || 'ibn_password',
    },
    migrations: {
      directory: './src/database/knex-migrations',
      extension: 'ts',
    }
  }
};
```

### **4. Check Environment Variables**

**File:** `backend-ts/.env`

```bash
# Required variables
DB_HOST=localhost
DB_PORT=5433
DB_NAME=ibn_db
DB_USER=ibn_user
DB_PASSWORD=ibn_password

# New variables for Phase 1
WALLET_ENCRYPTION_KEY=  # Will generate in Step 2
```

---

## 🔍 **CURRENT STATE CHECK**

Before starting, verify your current database state:

```bash
cd backend-ts

# List existing tables
npx knex migrate:status

# Expected: You should see existing migrations from v0.0.1
# - users table
# - organizations table
# - roles table
# - permissions table
# etc.
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Generate Wallet Encryption Key**

**Why:** Private keys in wallets must be encrypted at rest.

```bash
# Generate 32-byte (256-bit) encryption key
openssl rand -hex 32

# Example output:
# 0a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789
```

**Add to `.env`:**

```bash
# backend-ts/.env
WALLET_ENCRYPTION_KEY=<paste_generated_key_here>
```

⚠️ **CRITICAL:** Never commit this key to git! Add to `.gitignore`.

---

### **Step 2: Create Migration File**

```bash
cd backend-ts

# Create new migration
npx knex migrate:make wallet_system --knexfile knexfile.ts

# Output:
# Created Migration: src/database/knex-migrations/20251216XXXXXX_wallet_system.ts
```

---

### **Step 3: Write Migration Code**

**File:** `backend-ts/src/database/knex-migrations/20251216XXXXXX_wallet_system.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create wallets table
  await knex.schema.createTable('wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('label', 255).unique().notNullable()
      .comment('Format: username@organization');
    table.text('certificate').notNullable()
      .comment('X.509 certificate in PEM format');
    table.text('private_key').notNullable()
      .comment('ENCRYPTED private key (AES-256-GCM)');
    table.string('encryption_iv', 32).notNullable()
      .comment('Initialization vector for encryption');
    table.string('encryption_tag', 32).notNullable()
      .comment('Authentication tag for GCM mode');
    table.string('msp_id', 100).notNullable()
      .comment('Organization MSP ID');
    table.string('type', 20).defaultTo('X.509');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at')
      .comment('Track wallet usage for cleanup');
    
    // Foreign key to organizations
    table.foreign('msp_id')
      .references('msp_id')
      .inTable('organizations')
      .onDelete('CASCADE');
    
    // Indexes for performance
    table.index('label', 'idx_wallets_label');
    table.index('msp_id', 'idx_wallets_msp_id');
    table.index('last_used_at', 'idx_wallets_last_used');
  });
  
  console.log('✅ Created wallets table');
  
  // 2. Update users table
  await knex.schema.alterTable('users', (table) => {
    table.string('wallet_id', 255).unique()
      .comment('Link to wallet (e.g., john@org1)');
    table.string('certificate_serial', 255)
      .comment('Certificate serial number for revocation');
    table.boolean('enrolled').defaultTo(false)
      .comment('Whether user has been enrolled with Fabric CA');
    table.string('enrollment_secret', 255)
      .comment('Temporary secret from CA registration');
    table.timestamp('enrolled_at')
      .comment('Timestamp of enrollment');
    
    // Indexes
    table.index('wallet_id', 'idx_users_wallet_id');
    table.index('certificate_serial', 'idx_users_certificate_serial');
    table.index('enrolled', 'idx_users_enrolled');
  });
  
  console.log('✅ Updated users table');
  
  // 3. Create certificate_revocations table
  await knex.schema.createTable('certificate_revocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('certificate_serial', 255).unique().notNullable();
    table.string('wallet_id', 255);
    table.uuid('revoked_by').references('id').inTable('users');
    table.string('revocation_reason', 255);
    table.timestamp('revoked_at').defaultTo(knex.fn.now());
    
    // Foreign key to wallets
    table.foreign('wallet_id')
      .references('label')
      .inTable('wallets')
      .onDelete('SET NULL');
    
    // Indexes
    table.index('certificate_serial', 'idx_cert_revocations_serial');
    table.index('wallet_id', 'idx_cert_revocations_wallet');
    table.index('revoked_at', 'idx_cert_revocations_date');
  });
  
  console.log('✅ Created certificate_revocations table');
  
  // 4. Create jwt_keys table
  await knex.schema.createTable('jwt_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key_id', 50).unique().notNullable()
      .comment('e.g., key-2025-12');
    table.text('private_key').notNullable()
      .comment('RSA private key in PEM format');
    table.text('public_key').notNullable()
      .comment('RSA public key in PEM format');
    table.string('algorithm', 20).defaultTo('RS256');
    table.boolean('is_active').defaultTo(true)
      .comment('Only one active key at a time');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at')
      .comment('Key expiry for cleanup');
    
    // Indexes
    table.index('key_id', 'idx_jwt_keys_key_id');
    table.index('is_active', 'idx_jwt_keys_active');
    table.index('expires_at', 'idx_jwt_keys_expires');
  });
  
  console.log('✅ Created jwt_keys table');
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order
  await knex.schema.dropTableIfExists('jwt_keys');
  console.log('✅ Dropped jwt_keys table');
  
  await knex.schema.dropTableIfExists('certificate_revocations');
  console.log('✅ Dropped certificate_revocations table');
  
  // Remove columns from users table
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('wallet_id');
    table.dropColumn('certificate_serial');
    table.dropColumn('enrolled');
    table.dropColumn('enrollment_secret');
    table.dropColumn('enrolled_at');
  });
  console.log('✅ Removed wallet columns from users table');
  
  await knex.schema.dropTableIfExists('wallets');
  console.log('✅ Dropped wallets table');
}
```

---

### **Step 4: Run Migration**

```bash
cd backend-ts

# Run migration
npm run db:migrate

# Expected output:
# Batch 1 run: 1 migrations
# ✅ Created wallets table
# ✅ Updated users table
# ✅ Created certificate_revocations table
# ✅ Created jwt_keys table
```

---

### **Step 5: Verify Migration**

```bash
# Check migration status
npm run db:migrate:status

# Connect to database and verify tables
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db

# In psql:
\dt

# Should show:
# wallets
# certificate_revocations
# jwt_keys
# users (with new columns)

# Describe wallets table
\d wallets

# Should show all columns with correct types

# Exit psql
\q
```

---

## ✅ **VERIFICATION CHECKLIST**

Run these checks to ensure Phase 1 is complete:

### **1. Tables Created**

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('wallets', 'certificate_revocations', 'jwt_keys');

-- Should return 3 rows
```

### **2. Wallets Table Structure**

```sql
-- Verify wallets table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'wallets'
ORDER BY ordinal_position;

-- Should show:
-- id, uuid, NO
-- label, character varying, NO
-- certificate, text, NO
-- private_key, text, NO
-- encryption_iv, character varying, NO
-- encryption_tag, character varying, NO
-- msp_id, character varying, NO
-- type, character varying, YES
-- created_at, timestamp, YES
-- updated_at, timestamp, YES
-- last_used_at, timestamp, YES
```

### **3. Users Table Updated**

```sql
-- Check new columns in users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('wallet_id', 'certificate_serial', 'enrolled', 'enrollment_secret', 'enrolled_at');

-- Should return 5 rows
```

### **4. Indexes Created**

```sql
-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('wallets', 'certificate_revocations', 'jwt_keys', 'users')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Should show multiple indexes
```

### **5. Foreign Keys**

```sql
-- Check foreign key constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('wallets', 'certificate_revocations');

-- Should show:
-- wallets -> organizations (msp_id)
-- certificate_revocations -> wallets (wallet_id)
-- certificate_revocations -> users (revoked_by)
```

---

## 🧪 **TESTING**

### **Test 1: Insert Test Wallet**

```sql
-- Insert test wallet
INSERT INTO wallets (label, certificate, private_key, encryption_iv, encryption_tag, msp_id)
VALUES (
  'test@org1',
  '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----',
  'encrypted_test_key',
  'test_iv_base64',
  'test_tag_base64',
  'Org1MSP'
);

-- Verify insert
SELECT * FROM wallets WHERE label = 'test@org1';

-- Clean up
DELETE FROM wallets WHERE label = 'test@org1';
```

### **Test 2: Update User with Wallet**

```sql
-- Get a test user
SELECT id, username FROM users LIMIT 1;

-- Update with wallet info
UPDATE users 
SET wallet_id = 'testuser@org1',
    certificate_serial = '1A:2B:3C:4D',
    enrolled = true,
    enrolled_at = NOW()
WHERE id = '<user_id_from_above>';

-- Verify update
SELECT username, wallet_id, enrolled FROM users WHERE id = '<user_id>';

-- Clean up
UPDATE users 
SET wallet_id = NULL,
    certificate_serial = NULL,
    enrolled = false,
    enrolled_at = NULL
WHERE id = '<user_id>';
```

### **Test 3: Certificate Revocation**

```sql
-- Insert revocation
INSERT INTO certificate_revocations (certificate_serial, wallet_id, revocation_reason)
VALUES ('1A:2B:3C:4D', 'test@org1', 'test_revocation');

-- Verify
SELECT * FROM certificate_revocations WHERE certificate_serial = '1A:2B:3C:4D';

-- Clean up
DELETE FROM certificate_revocations WHERE certificate_serial = '1A:2B:3C:4D';
```

---

## 🔧 **TROUBLESHOOTING**

### **Issue 1: Migration Fails - "relation organizations does not exist"**

**Cause:** Base tables from v0.0.1 not created yet.

**Solution:**
```bash
# Run all previous migrations first
npm run db:migrate

# If still fails, check if organizations table exists
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "\dt"
```

### **Issue 2: "WALLET_ENCRYPTION_KEY not configured"**

**Cause:** Environment variable not set.

**Solution:**
```bash
# Generate key
openssl rand -hex 32

# Add to .env
echo "WALLET_ENCRYPTION_KEY=<generated_key>" >> .env

# Restart backend
npm run dev
```

### **Issue 3: Migration Already Run**

**Cause:** Trying to run migration twice.

**Solution:**
```bash
# Check migration status
npm run db:migrate:status

# If already run, rollback first
npm run db:rollback

# Then run again
npm run db:migrate
```

### **Issue 4: Foreign Key Constraint Fails**

**Cause:** Referenced table doesn't exist or column mismatch.

**Solution:**
```bash
# Verify organizations table has msp_id column
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "\d organizations"

# If missing, create it first
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

After completing Phase 1, you have:

✅ **4 new database objects:**
- `wallets` table (11 columns, 3 indexes, 1 FK)
- `certificate_revocations` table (6 columns, 3 indexes, 2 FKs)
- `jwt_keys` table (8 columns, 3 indexes)
- `users` table updated (+5 columns, +3 indexes)

✅ **Security foundation:**
- Private key encryption support (IV + tag columns)
- Certificate revocation list (CRL)
- JWT key rotation support

✅ **Ready for Phase 2:**
- Database schema ready for WalletService
- Encryption columns in place
- Audit trail structure ready

---

## 🚀 **NEXT STEPS**

**Phase 2:** Implement WalletService with AES-256-GCM encryption

**File:** `2-RBAC.md`

**What you'll build:**
- WalletService class
- Encrypt/decrypt private keys
- CRUD operations for identities
- Export/import for backup

**Estimated time:** 3 days

---

## 📝 **ROLLBACK INSTRUCTIONS**

If you need to undo Phase 1:

```bash
# Rollback migration
npm run db:rollback

# Verify rollback
npm run db:migrate:status

# Should show migration as "down"
```

**Warning:** This will delete all data in `wallets`, `certificate_revocations`, and `jwt_keys` tables!

---

**Phase 1 Complete!** ✅

**Next:** [Phase 2 - Wallet Service](./2-RBAC.md)
