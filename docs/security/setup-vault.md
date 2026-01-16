# Vault Production Setup - Daily Operations Guide

**Status:** Production Mode (File Backend)  
**Version:** 1.0  
**Last Updated:** 2026-01-14

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Daily Operations](#daily-operations)
3. [Scripts Guide](#scripts-guide)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)
6. [Security Reminders](#security-reminders)

---

## 🚀 Quick Reference

### Essential Commands

```bash
# Check Vault status
docker-compose exec vault vault status

# Unseal Vault (after restart)
bash scripts/unseal-vault.sh

# Backup Vault data
bash scripts/backup-vault.sh

# Check backend logs
docker logs ibnts-backend-api 2>&1 | grep -E "Vault|Encryption"
```

### File Locations

```
vault-config/
├── vault-prod.hcl              # Vault production config

scripts/
├── init-vault-prod.sh          # One-time initialization (DONE)
├── unseal-vault.sh             # Run after EVERY Vault restart
├── migrate-to-prod-vault.sh    # One-time migration (DONE)
└── backup-vault.sh             # Run daily/weekly

vault-keys.json                 # CRITICAL: Unseal key + root token
kek-backup.json                 # KEK backup from migration

backups/vault/                  # Automated backups directory
```

---

## 📅 Daily Operations

### Morning Routine (Development)

```bash
# 1. Start all services
cd /mnt/d/Blockchain/IBN\ with\ TypeScript
docker-compose up -d

# 2. Wait 5 seconds for Vault to start
sleep 5

# 3. Check Vault status
docker-compose exec vault vault status

# If "Sealed: true" → Continue to step 4
# If "Sealed: false" → Skip to step 5

# 4. Unseal Vault
bash scripts/unseal-vault.sh

# 5. Verify backend connection
docker logs ibnts-backend-api 2>&1 | grep "VaultService" | tail -3

# Expected: "✅ VaultService initialized and healthy"
```

### Weekly Maintenance

```bash
# Every Sunday or as needed
bash scripts/backup-vault.sh

# Verify backup created
ls -lh backups/vault/ | tail -5

# Check backup count (should auto-delete older than 30 days)
find backups/vault -name "vault-data-*.tar.gz" | wc -l
```

---

## 📜 Scripts Guide

### 1. `init-vault-prod.sh` - Vault Initialization

**Purpose:** Initialize production Vault for the first time

**When to Run:** ONE TIME ONLY (already completed on 2026-01-14)

**What it Does:**
- Initializes Vault
- Generates `vault-keys.json` with unseal key and root token
- Creates seal configuration

**Command:**
```bash
bash scripts/init-vault-prod.sh
```

**Output:**
- Creates `vault-keys.json` (CRITICAL - save securely!)

**Status:** ✅ Already completed, do NOT run again

---

### 2. `unseal-vault.sh` - Unseal Vault

**Purpose:** Unlock Vault after container restart

**When to Run:** 
- ✅ **After EVERY Vault container restart**
- ✅ After server/computer reboot
- ✅ After `docker-compose restart vault`
- ✅ After `docker-compose up -d` (if Vault was down)
- ✅ When Vault status shows `Sealed: true`

**Why Needed:**
Vault automatically seals (locks) on restart for security. Must be manually unsealed to use.

**Command:**
```bash
bash scripts/unseal-vault.sh
```

**Expected Output:**
```
🔓 Unsealing Vault...
Key             Value
---             -----
Sealed          false
✅ Vault unsealed successfully
```

**Frequency:**
- **Development:** Every time you start Docker/reboot
- **Production:** After server maintenance/restart
- **Automated:** Can setup auto-unseal with cloud KMS (future)

---

### 3. `migrate-to-prod-vault.sh` - KEK Migration

**Purpose:** Migrate KEK from dev Vault to production Vault

**When to Run:** ONE TIME ONLY (already completed on 2026-01-14)

**What it Does:**
- Enables KV v2 secrets engine
- Migrates KEK from backup to production Vault
- Verifies migration

**Command:**
```bash
bash scripts/migrate-to-prod-vault.sh
```

**Status:** ✅ Already completed, do NOT run again unless re-initializing

---

### 4. `backup-vault.sh` - Backup Vault Data

**Purpose:** Create compressed backup of Vault data

**When to Run:**
- ✅ **Daily** (recommended, via cron)
- ✅ **Weekly** (minimum)
- ✅ **Before major changes** (migration, upgrade, config changes)
- ✅ **Before key rotation**

**What it Does:**
- Creates tar.gz of Vault data volume
- Saves to `backups/vault/vault-data-YYYYMMDD-HHMMSS.tar.gz`
- Auto-deletes backups older than 30 days

**Command:**
```bash
bash scripts/backup-vault.sh
```

**Expected Output:**
```
📦 Backing up Vault data...
✅ Vault backup created: backups/vault/vault-data-20260114-140000.tar.gz
✅ Old backups cleaned (kept last 30 days)
```

**Setup Automated Daily Backup:**
```bash
# Edit crontab
crontab -e

# Add this line (runs at 2 AM daily):
0 2 * * * cd /mnt/d/Blockchain/IBN\ with\ TypeScript && bash scripts/backup-vault.sh >> logs/vault-backup.log 2>&1

# Verify cron job
crontab -l
```

**Restore from Backup (if needed):**
```bash
# Stop Vault
docker-compose stop vault

# Extract backup to volume
docker run --rm \
  -v ibnts_vault-data:/vault/file \
  -v $(pwd)/backups/vault:/backup \
  alpine sh -c "rm -rf /vault/file/* && tar xzf /backup/vault-data-YYYYMMDD-HHMMSS.tar.gz -C /vault"

# Start Vault
docker-compose up -d vault

# Unseal
bash scripts/unseal-vault.sh
```

---

## 🔄 Common Workflows

### Scenario 1: Morning Startup (Development)

```bash
# Start Docker services
docker-compose up -d

# Wait 5 seconds
sleep 5

# Unseal Vault
bash scripts/unseal-vault.sh

# ✅ Ready to work!
```

---

### Scenario 2: Server Reboot (Production)

```bash
# 1. After server comes back online
docker-compose up -d

# 2. Wait for containers to be healthy
sleep 10

# 3. Unseal Vault
bash scripts/unseal-vault.sh

# 4. Verify all services
docker-compose ps
docker logs ibnts-backend-api | tail -20

# 5. Test health endpoint
curl http://localhost:37080/api/v1/health
```

---

### Scenario 3: Pre-Deployment Backup

```bash
# 1. Create backup
bash scripts/backup-vault.sh

# 2. Verify backup created
ls -lh backups/vault/ | tail -1

# 3. Deploy changes
git pull
docker-compose up -d --build

# 4. Unseal if needed
bash scripts/unseal-vault.sh

# 5. Test
curl -X POST http://localhost:37080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!@#"}'
```

---

### Scenario 4: Key Rotation

```bash
# 1. Backup first
bash scripts/backup-vault.sh

# 2. Run validation
docker-compose exec backend-api npx ts-node -r tsconfig-paths/register \
  src/scripts/test-key-rotation.ts validate

# 3. If valid, rotate
docker-compose exec backend-api npx ts-node -r tsconfig-paths/register \
  src/scripts/test-key-rotation.ts rotate

# 4. Verify
docker-compose exec backend-api npx ts-node -r tsconfig-paths/register \
  src/scripts/test-key-rotation.ts history

# 5. Test enrollment
curl -X POST http://localhost:37080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"post-rotation","email":"test@test.com","password":"Test123!@#"}'
```

---

## 🔧 Troubleshooting

### Vault is Sealed

**Symptom:**
```bash
$ docker-compose exec vault vault status
Sealed: true
```

**Solution:**
```bash
bash scripts/unseal-vault.sh
```

---

### Backend Cannot Connect to Vault

**Symptom:**
```
Error: VaultService not initialized
```

**Checks:**
```bash
# 1. Is Vault running?
docker ps | grep vault

# 2. Is Vault unsealed?
docker-compose exec vault vault status

# 3. Is backend using correct token?
grep VAULT_ROOT_TOKEN backend-ts/.env

# 4. Check backend logs
docker logs ibnts-backend-api | grep Vault
```

**Solution:**
1. Unseal Vault: `bash scripts/unseal-vault.sh`
2. Restart backend: `docker-compose restart backend-api`

---

### KEK Not Found in Vault

**Symptom:**
```
Secret not found at secret/ibn/encryption-key
```

**Check:**
```bash
# Verify KEK exists
docker-compose exec -e VAULT_TOKEN=$(cat vault-keys.json | jq -r '.root_token') vault \
  vault kv get secret/ibn/encryption-key
```

**Solution (if missing):**
```bash
# Restore from backup
bash scripts/migrate-to-prod-vault.sh
```

---

### Decryption Failed Error

**Symptom:**
```
Decryption failed - key may be corrupted
```

**Common Causes:**
1. Wallets encrypted with old KEK
2. KEK mismatch between Vault and wallets
3. Vault restarted and unsealed with wrong key

**Solution:**
```bash
# Option 1: Clear wallets and start fresh (development)
docker-compose exec postgres psql -U ibn_user ibn_db -c "DELETE FROM wallets;"

# Option 2: Restore correct KEK from backup (if available)
# Check rotation history
docker-compose exec backend-api npx ts-node -r tsconfig-paths/register \
  src/scripts/test-key-rotation.ts history
```

---

### Lost vault-keys.json

**Symptom:**
Cannot unseal Vault, file missing

**Prevention:**
- ✅ Backup `vault-keys.json` to password manager
- ✅ Store encrypted copy on secure server
- ✅ Never commit to git

**Recovery:**
⚠️ **If truly lost:** Vault data is UNRECOVERABLE
- Must re-initialize Vault (creates new keys)
- All existing encrypted data will be lost
- Restore from database backup or start fresh

---

## 🔒 Security Reminders

### Critical Files - NEVER COMMIT!

```
vault-keys.json           # Unseal key + root token
kek-backup.json          # Original KEK backup
backend-ts/.env          # Contains VAULT_ROOT_TOKEN
```

**Protection:**
- ✅ Listed in `.gitignore`
- ✅ Store in password manager
- ✅ Encrypt if storing on disk
- ✅ Limit access (chmod 600)

---

### Daily Security Checks

```bash
# 1. Verify .env not in git
git status | grep .env
# Expected: nothing (file ignored)

# 2. Check Vault status
docker-compose exec vault vault status
# Expected: Sealed = false

# 3. Verify recent backup
ls -lh backups/vault/ | tail -1
# Check date is recent

# 4. Test backend connection
curl http://localhost:37080/api/v1/health
# Expected: {"status":"ok"}
```

---

### Access Control

**Root Token Usage:**
- Only for:
  - Vault initialization
  - KEK migration
  - Emergency access
- Not for:
  - Daily backend operations (should use scoped tokens - future)

**Future Improvements:**
1. Create separate read-only token for backend
2. Rotate root token periodically
3. Implement Vault policies for least privilege

---

## 📊 Monitoring

### Health Checks

```bash
# Vault status
docker-compose exec vault vault status

# Backend Vault connection
docker logs ibnts-backend-api 2>&1 | grep "VaultService" | tail -5

# Recent KEK loads
docker logs ibnts-backend-api 2>&1 | grep "Encryption key" | tail -5

# Backup status
ls -lh backups/vault/ | tail -10
```

### Metrics to Monitor

- Vault uptime
- Unseal events (should be rare in production)
- KEK access frequency
- Backup success rate
- Disk usage (vault-data volume)

---

## 🎯 Quick Checklist

### Daily (Development)
- [ ] Start services: `docker-compose up -d`
- [ ] Unseal Vault: `bash scripts/unseal-vault.sh`
- [ ] Verify backend: Check logs for "VaultService initialized"

### Weekly
- [ ] Run backup: `bash scripts/backup-vault.sh`
- [ ] Check backup files exist
- [ ] Review logs for errors

### Monthly
- [ ] Verify vault-keys.json still secure
- [ ] Test restore from backup (in test environment)
- [ ] Review access logs
- [ ] Consider key rotation (every 90 days recommended)

### Before Production Deployment
- [ ] Create backup
- [ ] Test in staging
- [ ] Document changes
- [ ] Have rollback plan ready

---

## 📞 Emergency Contacts

**If Vault becomes corrupted or inaccessible:**

1. **Check backups:**
   ```bash
   ls -lh backups/vault/
   ```

2. **Check vault-keys.json backup location**
   - Password manager
   - Secure backup server
   - Encrypted storage

3. **Worst case:** Re-initialize and restore from database backup

---

## 📚 References

- [Vault Production Hardening](./VAULT-PRODUCTION-HARDENING.md) - Full setup guide
- [Phase 2B Complete](./PHASE-2B-COMPLETE.md) - Migration walkthrough
- [HashiCorp Vault Docs](https://www.vaultproject.io/docs)

---

**Last Updated:** 2026-01-14  
**Vault Version:** 1.15.6  
**Mode:** Production (File Backend)  
**Status:** ✅ Operational
